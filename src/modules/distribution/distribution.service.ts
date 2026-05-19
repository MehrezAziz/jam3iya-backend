import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CancelDistributionDto,
  CreateDistributionDto,
  DeliverDistributionDto,
  DistributionLineInput,
  ListDistributionsQuery,
  UpdateDistributionDto,
} from './dto';

@Injectable()
export class DistributionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListDistributionsQuery) {
    const where: Prisma.DistributionWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.beneficiaryId ? { beneficiaryId: query.beneficiaryId } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.distribution.count({ where }),
      this.prisma.distribution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          beneficiaryId: true,
          kind: true,
          status: true,
          plannedAt: true,
          deliveredAt: true,
          campaignId: true,
          occasionId: true,
          createdAt: true,
          beneficiary: { select: { code: true, publicAlias: true } },
          lines: {
            select: {
              id: true,
              lineKind: true,
              itemId: true,
              quantity: true,
              unit: true,
              amountMinor: true,
              currency: true,
              item: { select: { name: true, unit: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      items: items.map((d) => ({
        ...d,
        lines: d.lines.map((l) => ({
          ...l,
          quantity: l.quantity != null ? Number(l.quantity) : null,
          amountMinor: l.amountMinor != null ? Number(l.amountMinor) : null,
        })),
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async get(organizationId: string, id: string) {
    const d = await this.prisma.distribution.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        beneficiary: { select: { code: true, publicAlias: true } },
        lines: {
          include: { item: { select: { name: true, unit: true } }, lot: { select: { id: true, expiresOn: true } } },
        },
      },
    });
    if (!d) throw new NotFoundException('Distribution not found');
    return {
      ...d,
      lines: d.lines.map((l) => ({
        ...l,
        quantity: l.quantity != null ? Number(l.quantity) : null,
        amountMinor: l.amountMinor != null ? Number(l.amountMinor) : null,
        valuationMinor: l.valuationMinor != null ? Number(l.valuationMinor) : null,
      })),
    };
  }

  async create(organizationId: string, createdById: string, dto: CreateDistributionDto) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id: dto.beneficiaryId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!ben) throw new NotFoundException('Beneficiary not found in this organization');

    // Validate that the requested kind matches the lines
    this.validateKindMatchesLines(dto.kind, dto.lines);

    // For item lines, ensure the items exist and there's enough total available stock
    for (const line of dto.lines.filter((l): l is Extract<DistributionLineInput, { lineKind: 'item' }> => l.lineKind === 'item')) {
      const item = await this.prisma.inventoryItem.findFirst({
        where: { id: line.itemId, organizationId, deletedAt: null },
      });
      if (!item) throw new NotFoundException(`Inventory item ${line.itemId} not found`);

      const totalAvailable = await this.prisma.stockLot.aggregate({
        where: { itemId: line.itemId, deletedAt: null, quantityRemaining: { gt: 0 } },
        _sum: { quantityRemaining: true },
      });
      if (Number(totalAvailable._sum.quantityRemaining ?? 0) < line.quantity) {
        throw new BadRequestException(`Not enough stock for ${item.name} (needed ${line.quantity})`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const distribution = await tx.distribution.create({
        data: {
          organizationId,
          beneficiaryId: dto.beneficiaryId,
          kind: dto.kind,
          status: 'planned',
          plannedAt: dto.plannedAt ? new Date(dto.plannedAt) : null,
          campaignId: dto.campaignId ?? null,
          occasionId: dto.occasionId ?? null,
        },
        select: { id: true },
      });

      for (const line of dto.lines) {
        if (line.lineKind === 'cash') {
          await tx.distributionLine.create({
            data: {
              distributionId: distribution.id,
              lineKind: 'cash',
              amountMinor: BigInt(line.amountMinor),
              currency: (line.currency ?? 'TND').toUpperCase(),
              notes: line.notes,
            },
          });
        } else {
          // We reserve quantity at delivery time via FIFO; here we only record the request.
          await tx.distributionLine.create({
            data: {
              distributionId: distribution.id,
              lineKind: 'item',
              itemId: line.itemId,
              quantity: line.quantity,
              notes: line.notes,
            },
          });
        }
      }

      if (dto.deliverNow) {
        await this.deliverInTx(tx, organizationId, createdById, distribution.id);
      }

      return { id: distribution.id };
    });
  }

  /**
   * Delivery logic factored out so the same transaction used by create() can
   * deliver in one step when the caller passes deliverNow=true.
   */
  private async deliverInTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    performedById: string,
    distributionId: string,
    signatureFileId?: string,
  ): Promise<void> {
    const lines = await tx.distributionLine.findMany({ where: { distributionId } });

    for (const line of lines.filter((l) => l.lineKind === 'item')) {
      if (!line.itemId || line.quantity == null) continue;
      let remaining = Number(line.quantity);

      const lots = await tx.stockLot.findMany({
        where: {
          itemId: line.itemId,
          deletedAt: null,
          quantityRemaining: { gt: 0 },
          item: { organizationId, deletedAt: null },
        },
        orderBy: [{ expiresOn: 'asc' }, { receivedAt: 'asc' }],
      });

      let valuation = BigInt(0);
      let firstLotId: string | null = null;

      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Number(lot.quantityRemaining));
        await tx.stockLot.update({
          where: { id: lot.id },
          data: { quantityRemaining: Number(lot.quantityRemaining) - take },
        });
        await tx.stockMovement.create({
          data: {
            lotId: lot.id,
            type: 'out',
            quantity: take,
            reason: 'distribution',
            performedById,
            distributionLineId: firstLotId === null ? line.id : undefined,
          },
        });
        if (firstLotId === null) firstLotId = lot.id;
        if (lot.unitCostMinor != null) {
          valuation += (BigInt(lot.unitCostMinor) * BigInt(Math.round(take * 1000))) / BigInt(1000);
        }
        remaining -= take;
      }
      if (remaining > 0) {
        throw new BadRequestException('Not enough stock at delivery time');
      }

      await tx.distributionLine.update({
        where: { id: line.id },
        data: {
          lotId: firstLotId ?? undefined,
          valuationMinor: valuation > 0n ? valuation : undefined,
        },
      });
    }

    await tx.distribution.update({
      where: { id: distributionId },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
        deliveredById: performedById,
        signatureFileId: signatureFileId ?? null,
      },
    });
  }

  async deliver(organizationId: string, performedById: string, id: string, dto: DeliverDistributionDto) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { lines: true },
    });
    if (!dist) throw new NotFoundException('Distribution not found');
    if (dist.status === 'delivered') throw new BadRequestException('Already delivered');
    if (dist.status === 'cancelled') throw new BadRequestException('Distribution is cancelled');

    return this.prisma.$transaction(async (tx) => {
      // Deduct stock FIFO for every item line
      for (const line of dist.lines.filter((l) => l.lineKind === 'item')) {
        if (!line.itemId || line.quantity == null) continue;
        let remaining = Number(line.quantity);

        const lots = await tx.stockLot.findMany({
          where: {
            itemId: line.itemId,
            deletedAt: null,
            quantityRemaining: { gt: 0 },
            item: { organizationId, deletedAt: null },
          },
          orderBy: [{ expiresOn: 'asc' }, { receivedAt: 'asc' }],
        });

        let valuation = BigInt(0);
        let firstLotId: string | null = null;

        for (const lot of lots) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, Number(lot.quantityRemaining));
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { quantityRemaining: Number(lot.quantityRemaining) - take },
          });
          await tx.stockMovement.create({
            data: {
              lotId: lot.id,
              type: 'out',
              quantity: take,
              reason: 'distribution',
              performedById,
              distributionLineId: firstLotId === null ? line.id : undefined,
            },
          });
          if (firstLotId === null) firstLotId = lot.id;
          if (lot.unitCostMinor != null) {
            valuation += BigInt(lot.unitCostMinor) * BigInt(Math.round(take * 1000)) / BigInt(1000);
          }
          remaining -= take;
        }
        if (remaining > 0) {
          throw new BadRequestException('Not enough stock at delivery time');
        }

        await tx.distributionLine.update({
          where: { id: line.id },
          data: {
            lotId: firstLotId ?? undefined,
            valuationMinor: valuation > 0n ? valuation : undefined,
            unit: line.unit ?? undefined,
          },
        });
      }

      const updated = await tx.distribution.update({
        where: { id },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          deliveredById: performedById,
          signatureFileId: dto.signatureFileId ?? null,
        },
        select: { id: true, status: true, deliveredAt: true },
      });
      return updated;
    });
  }

  async update(organizationId: string, id: string, dto: UpdateDistributionDto) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { lines: true },
    });
    if (!dist) throw new NotFoundException('Distribution not found');
    if (dist.status === 'cancelled') {
      throw new BadRequestException('Cannot update a cancelled distribution');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.lines?.length) {
        for (const patch of dto.lines) {
          const line = dist.lines.find((l) => l.id === patch.id);
          if (!line) throw new NotFoundException(`Line ${patch.id} not found`);
          if (line.lineKind === 'cash' && patch.amountMinor != null) {
            await tx.distributionLine.update({
              where: { id: line.id },
              data: { amountMinor: BigInt(patch.amountMinor) },
            });
          }
          if (line.lineKind === 'item' && patch.quantity != null) {
            if (dist.status === 'delivered') {
              throw new BadRequestException('Cannot change item quantity after delivery');
            }
            await tx.distributionLine.update({
              where: { id: line.id },
              data: { quantity: patch.quantity },
            });
          }
        }
      }

      const data: Prisma.DistributionUpdateInput = {};
      if (dto.plannedAt !== undefined) {
        data.plannedAt = dto.plannedAt ? new Date(dto.plannedAt) : null;
      }
      if (dto.deliveredAt !== undefined) {
        data.deliveredAt = dto.deliveredAt ? new Date(dto.deliveredAt) : null;
      }
      if (dto.status) {
        data.status = dto.status;
        if (dto.status === 'delivered' && !dto.deliveredAt && !dist.deliveredAt) {
          data.deliveredAt = new Date();
        }
        if (dto.status === 'planned') {
          data.deliveredAt = null;
          data.deliveredById = null;
        }
      }
      return tx.distribution.update({
        where: { id },
        data,
        select: { id: true, status: true, plannedAt: true, deliveredAt: true },
      });
    });
  }

  async cancel(organizationId: string, id: string, dto: CancelDistributionDto) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!dist) throw new NotFoundException('Distribution not found');
    if (dist.status === 'delivered') {
      throw new BadRequestException('Cannot cancel: already delivered. Issue an adjustment instead.');
    }
    if (dist.status === 'cancelled') {
      throw new BadRequestException('Already cancelled');
    }
    return this.prisma.distribution.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledReason: dto.reason },
      select: { id: true, status: true },
    });
  }

  private validateKindMatchesLines(
    kind: 'cash' | 'goods' | 'mixed',
    lines: DistributionLineInput[],
  ): void {
    const hasCash = lines.some((l) => l.lineKind === 'cash');
    const hasItem = lines.some((l) => l.lineKind === 'item');
    if (kind === 'cash' && hasItem) {
      throw new BadRequestException('kind=cash must only contain cash lines');
    }
    if (kind === 'goods' && hasCash) {
      throw new BadRequestException('kind=goods must only contain item lines');
    }
    if (kind === 'mixed' && (!hasCash || !hasItem)) {
      throw new BadRequestException('kind=mixed must contain at least one cash and one item line');
    }
  }
}
