import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  AdjustLotDto,
  CreateItemDto,
  CreateLotDto,
  ListItemsQuery,
  UpdateItemDto,
  UpdateLotDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(organizationId: string, query: ListItemsQuery) {
    const where: Prisma.InventoryItemWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
          defaultQuantity: true,
          trackExpiry: true,
          minStock: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    // Aggregate stock per item
    const stocks = await this.prisma.stockLot.groupBy({
      by: ['itemId'],
      where: { item: { organizationId }, deletedAt: null, itemId: { in: items.map((i) => i.id) } },
      _sum: { quantityRemaining: true },
    });
    const stockMap = new Map(stocks.map((s) => [s.itemId, Number(s._sum.quantityRemaining ?? 0)]));

    return {
      total,
      items: items.map((it) => ({
        ...it,
        minStock: it.minStock != null ? Number(it.minStock) : null,
        defaultQuantity: it.defaultQuantity != null ? Number(it.defaultQuantity) : null,
        currentStock: stockMap.get(it.id) ?? 0,
        belowMin: it.minStock != null && (stockMap.get(it.id) ?? 0) < Number(it.minStock),
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getItem(organizationId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        lots: {
          where: { deletedAt: null },
          orderBy: [{ expiresOn: 'asc' }, { receivedAt: 'asc' }],
          select: {
            id: true,
            receivedAt: true,
            expiresOn: true,
            quantityInitial: true,
            quantityRemaining: true,
            supplierName: true,
            unitCostMinor: true,
            currency: true,
            storageLocation: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Item not found');

    return {
      ...item,
      minStock: item.minStock != null ? Number(item.minStock) : null,
      defaultQuantity: item.defaultQuantity != null ? Number(item.defaultQuantity) : null,
      currentStock: item.lots.reduce((s, l) => s + Number(l.quantityRemaining), 0),
      lots: item.lots.map((l) => ({
        ...l,
        quantityInitial: Number(l.quantityInitial),
        quantityRemaining: Number(l.quantityRemaining),
        unitCostMinor: l.unitCostMinor != null ? Number(l.unitCostMinor) : null,
      })),
    };
  }

  async createItem(organizationId: string, performedById: string, dto: CreateItemDto) {
    const exists = await this.prisma.inventoryItem.findFirst({
      where: { organizationId, name: dto.name, deletedAt: null },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Item name already exists in this organization');

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          organizationId,
          name: dto.name,
          category: dto.category,
          unit: dto.unit,
          defaultQuantity: dto.defaultQuantity,
          trackExpiry: dto.trackExpiry ?? false,
          minStock: dto.minStock,
          notes: dto.notes,
        },
        select: { id: true, name: true },
      });

      const initialStock = dto.initialStock ?? 0;
      if (initialStock > 0) {
        const lot = await tx.stockLot.create({
          data: {
            itemId: item.id,
            quantityInitial: initialStock,
            quantityRemaining: initialStock,
            currency: 'TND',
            notes: 'Opening stock',
          },
        });
        await tx.stockMovement.create({
          data: {
            lotId: lot.id,
            type: 'in',
            quantity: initialStock,
            reason: 'initial_stock',
            performedById,
          },
        });
      }

      return item;
    });
  }

  async updateItem(organizationId: string, id: string, dto: UpdateItemDto) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        unit: dto.unit,
        defaultQuantity: dto.defaultQuantity,
        trackExpiry: dto.trackExpiry,
        minStock: dto.minStock,
        notes: dto.notes,
      },
      select: { id: true },
    });
  }

  async updateLot(organizationId: string, lotId: string, dto: UpdateLotDto) {
    const lot = await this.prisma.stockLot.findFirst({
      where: { id: lotId, item: { organizationId, deletedAt: null }, deletedAt: null },
      select: { id: true },
    });
    if (!lot) throw new NotFoundException('Lot not found');

    return this.prisma.stockLot.update({
      where: { id: lotId },
      data: {
        expiresOn: dto.expiresOn === undefined ? undefined : dto.expiresOn ? new Date(dto.expiresOn) : null,
        supplierName: dto.supplierName === undefined ? undefined : dto.supplierName ?? null,
        supplierInvoiceRef:
          dto.supplierInvoiceRef === undefined ? undefined : dto.supplierInvoiceRef ?? null,
        unitCostMinor:
          dto.unitCostMinor === undefined
            ? undefined
            : dto.unitCostMinor != null
              ? BigInt(dto.unitCostMinor)
              : null,
        storageLocation:
          dto.storageLocation === undefined ? undefined : dto.storageLocation ?? null,
        notes: dto.notes === undefined ? undefined : dto.notes ?? null,
      },
      select: { id: true },
    });
  }

  async deleteItem(organizationId: string, id: string) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');

    const remaining = await this.prisma.stockLot.aggregate({
      where: { itemId: id, deletedAt: null },
      _sum: { quantityRemaining: true },
    });
    if (Number(remaining._sum.quantityRemaining ?? 0) > 0) {
      throw new BadRequestException('Cannot delete: item still has stock');
    }
    await this.prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async createLot(organizationId: string, performedById: string, dto: CreateLotDto) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, organizationId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.stockLot.create({
        data: {
          itemId: dto.itemId,
          quantityInitial: dto.quantity,
          quantityRemaining: dto.quantity,
          expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : null,
          supplierName: dto.supplierName,
          supplierInvoiceRef: dto.supplierInvoiceRef,
          unitCostMinor: dto.unitCostMinor != null ? BigInt(dto.unitCostMinor) : null,
          currency: dto.currency?.toUpperCase() ?? 'TND',
          storageLocation: dto.storageLocation,
          notes: dto.notes,
        },
      });
      await tx.stockMovement.create({
        data: {
          lotId: lot.id,
          type: 'in',
          quantity: dto.quantity,
          reason: 'purchase_or_donation',
          performedById,
        },
      });
      return { id: lot.id };
    });
  }

  async adjustLot(organizationId: string, performedById: string, lotId: string, dto: AdjustLotDto) {
    const lot = await this.prisma.stockLot.findFirst({
      where: { id: lotId, item: { organizationId, deletedAt: null } },
      include: { item: true },
    });
    if (!lot) throw new NotFoundException('Lot not found');

    const newRemaining = Number(lot.quantityRemaining) + dto.delta;
    if (newRemaining < 0) throw new BadRequestException('Adjustment would make stock negative');
    if (newRemaining > Number(lot.quantityInitial)) {
      throw new BadRequestException('Adjustment would exceed initial quantity');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.stockLot.update({
        where: { id: lot.id },
        data: { quantityRemaining: newRemaining },
      });
      await tx.stockMovement.create({
        data: {
          lotId: lot.id,
          type: dto.type ?? 'adjustment',
          quantity: dto.delta,
          reason: dto.reason,
          performedById,
        },
      });
      return { id: lot.id, quantityRemaining: newRemaining };
    });
  }

  async setItemStock(
    organizationId: string,
    performedById: string,
    itemId: string,
    targetQuantity: number,
    reason?: string,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (targetQuantity < 0) throw new BadRequestException('Stock cannot be negative');

    return this.prisma.$transaction(async (tx) => {
      const lots = await tx.stockLot.findMany({
        where: { itemId, deletedAt: null },
        orderBy: [{ expiresOn: 'asc' }, { receivedAt: 'asc' }],
        select: { id: true, quantityRemaining: true },
      });

      const current = lots.reduce((sum, lot) => sum + Number(lot.quantityRemaining), 0);
      const delta = targetQuantity - current;
      if (delta === 0) {
        return { currentStock: current };
      }

      const movementReason = reason?.trim() || 'manual_stock_set';

      if (delta > 0) {
        const lot = await tx.stockLot.create({
          data: {
            itemId,
            quantityInitial: delta,
            quantityRemaining: delta,
            currency: 'TND',
            notes: movementReason,
          },
        });
        await tx.stockMovement.create({
          data: {
            lotId: lot.id,
            type: 'in',
            quantity: delta,
            reason: movementReason,
            performedById,
          },
        });
      } else {
        let remaining = -delta;
        for (const lot of lots) {
          if (remaining <= 0) break;
          const available = Number(lot.quantityRemaining);
          if (available <= 0) continue;
          const take = Math.min(remaining, available);
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { quantityRemaining: available - take },
          });
          await tx.stockMovement.create({
            data: {
              lotId: lot.id,
              type: 'out',
              quantity: take,
              reason: movementReason,
              performedById,
            },
          });
          remaining -= take;
        }
        if (remaining > 0) {
          throw new BadRequestException('Could not reduce stock to the requested level');
        }
      }

      return { currentStock: targetQuantity };
    });
  }

  /**
   * FIFO available lots for an item (oldest expiry first, then oldest receipt).
   */
  async availableLotsForItem(organizationId: string, itemId: string) {
    return this.prisma.stockLot.findMany({
      where: {
        itemId,
        deletedAt: null,
        quantityRemaining: { gt: 0 },
        item: { organizationId, deletedAt: null },
      },
      orderBy: [{ expiresOn: 'asc' }, { receivedAt: 'asc' }],
      select: {
        id: true,
        expiresOn: true,
        quantityRemaining: true,
        storageLocation: true,
      },
    });
  }
}
