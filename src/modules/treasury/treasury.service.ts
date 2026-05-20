import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface DepartmentBalance {
  departmentId: string;
  departmentName: string;
  donationsMinor: number;
  transfersInMinor: number;
  transfersOutMinor: number;
  distributionsCashMinor: number;
  availableBalanceMinor: number;
}

@Injectable()
export class TreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  async userIdsForDepartment(organizationId: string, departmentId: string): Promise<string[]> {
    const assignments = await this.prisma.userDepartmentRole.findMany({
      where: {
        departmentId,
        deletedAt: null,
        user: { organizationId, deletedAt: null },
      },
      select: { userId: true },
    });
    return [...new Set(assignments.map((a) => a.userId))];
  }

  async getMainDepartmentId(organizationId: string): Promise<string | null> {
    const main = await this.prisma.department.findFirst({
      where: { organizationId, isMain: true, deletedAt: null },
      select: { id: true },
    });
    return main?.id ?? null;
  }

  donationWhereForDepartment(
    organizationId: string,
    departmentId: string,
    receiverIds: string[],
    isMain = false,
  ): Prisma.DonationWhereInput {
    const or: Prisma.DonationWhereInput[] = [{ departmentId }];
    if (receiverIds.length > 0) {
      or.push({ departmentId: null, receivedById: { in: receiverIds } });
    }
    // Legacy donations without departmentId are attributed to the main department treasury.
    if (isMain) {
      or.push({ departmentId: null });
    }
    return {
      organizationId,
      deletedAt: null,
      cancelledAt: null,
      kind: { not: 'in_kind' },
      OR: or,
    };
  }

  async getDepartmentBalance(organizationId: string, departmentId: string): Promise<DepartmentBalance> {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId, deletedAt: null },
      select: { id: true, name: true, isMain: true },
    });
    if (!dept) throw new NotFoundException('Department not found');

    const receiverIds = await this.userIdsForDepartment(organizationId, departmentId);
    const donationWhere = this.donationWhereForDepartment(
      organizationId,
      departmentId,
      receiverIds,
      dept.isMain,
    );

    const [donationsAgg, transfersInAgg, transfersOutAgg, distCashAgg] = await Promise.all([
      this.prisma.donation.aggregate({ where: donationWhere, _sum: { amountMinor: true } }),
      this.prisma.departmentTransfer.aggregate({
        where: { organizationId, toDepartmentId: departmentId },
        _sum: { amountMinor: true },
      }),
      this.prisma.departmentTransfer.aggregate({
        where: { organizationId, fromDepartmentId: departmentId },
        _sum: { amountMinor: true },
      }),
      this.prisma.distributionLine.aggregate({
        where: {
          lineKind: 'cash',
          distribution: {
            organizationId,
            deletedAt: null,
            status: 'delivered',
            beneficiary: { primaryDepartmentId: departmentId },
          },
        },
        _sum: { amountMinor: true },
      }),
    ]);

    const donationsMinor = Number(donationsAgg._sum.amountMinor ?? 0n);
    const transfersInMinor = Number(transfersInAgg._sum.amountMinor ?? 0n);
    const transfersOutMinor = Number(transfersOutAgg._sum.amountMinor ?? 0n);
    const distributionsCashMinor = Number(distCashAgg._sum.amountMinor ?? 0n);
    const availableBalanceMinor =
      donationsMinor + transfersInMinor - transfersOutMinor - distributionsCashMinor;

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      donationsMinor,
      transfersInMinor,
      transfersOutMinor,
      distributionsCashMinor,
      availableBalanceMinor,
    };
  }

  async assertUserCanManageTransfers(organizationId: string, userId: string): Promise<void> {
    const onMain = await this.prisma.userDepartmentRole.findFirst({
      where: {
        userId,
        deletedAt: null,
        department: { organizationId, isMain: true, deletedAt: null },
      },
      select: { id: true },
    });
    if (onMain) return;

    const roles = await this.prisma.userDepartmentRole.findMany({
      where: { userId, deletedAt: null },
      select: { role: { select: { privilegeLevel: true } } },
    });
    const maxPriv = roles.reduce((m, r) => Math.max(m, r.role.privilegeLevel), 0);
    if (maxPriv >= 100) return;

    throw new ForbiddenException('Only the main department can record inter-department transfers');
  }

  async createTransfer(
    organizationId: string,
    userId: string,
    data: {
      fromDepartmentId: string;
      toDepartmentId: string;
      amountMinor: number;
      currency?: string;
      notes?: string;
    },
  ) {
    await this.assertUserCanManageTransfers(organizationId, userId);

    if (data.fromDepartmentId === data.toDepartmentId) {
      throw new BadRequestException('Source and destination departments must differ');
    }
    if (data.amountMinor <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const [fromDept, toDept] = await Promise.all([
      this.prisma.department.findFirst({
        where: { id: data.fromDepartmentId, organizationId, deletedAt: null },
      }),
      this.prisma.department.findFirst({
        where: { id: data.toDepartmentId, organizationId, deletedAt: null },
      }),
    ]);
    if (!fromDept || !toDept) throw new NotFoundException('Department not found');

    const balance = await this.getDepartmentBalance(organizationId, data.fromDepartmentId);
    if (balance.availableBalanceMinor < data.amountMinor) {
      throw new BadRequestException(
        `Insufficient balance in ${fromDept.name}. Available: ${balance.availableBalanceMinor / 1000} TND`,
      );
    }

    const transfer = await this.prisma.departmentTransfer.create({
      data: {
        organizationId,
        fromDepartmentId: data.fromDepartmentId,
        toDepartmentId: data.toDepartmentId,
        amountMinor: BigInt(data.amountMinor),
        currency: (data.currency ?? 'TND').toUpperCase(),
        notes: data.notes?.trim() || null,
        createdById: userId,
      },
      include: {
        fromDepartment: { select: { id: true, name: true } },
        toDepartment: { select: { id: true, name: true } },
      },
    });

    return {
      id: transfer.id,
      fromDepartmentId: transfer.fromDepartmentId,
      fromDepartmentName: transfer.fromDepartment.name,
      toDepartmentId: transfer.toDepartmentId,
      toDepartmentName: transfer.toDepartment.name,
      amountMinor: Number(transfer.amountMinor),
      currency: transfer.currency,
      notes: transfer.notes,
      createdAt: transfer.createdAt.toISOString(),
    };
  }

  async listTransfers(organizationId: string, departmentId?: string, limit = 50) {
    const where: Prisma.DepartmentTransferWhereInput = {
      organizationId,
      ...(departmentId
        ? { OR: [{ fromDepartmentId: departmentId }, { toDepartmentId: departmentId }] }
        : {}),
    };
    const rows = await this.prisma.departmentTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        fromDepartment: { select: { name: true } },
        toDepartment: { select: { name: true } },
      },
    });
    return rows.map((t) => ({
      id: t.id,
      fromDepartmentId: t.fromDepartmentId,
      fromDepartmentName: t.fromDepartment.name,
      toDepartmentId: t.toDepartmentId,
      toDepartmentName: t.toDepartment.name,
      amountMinor: Number(t.amountMinor),
      currency: t.currency,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async resolveDonationDepartmentId(
    organizationId: string,
    userDepartmentId: string | undefined,
    receivedById: string | null,
  ): Promise<string> {
    if (userDepartmentId) {
      const ok = await this.prisma.department.findFirst({
        where: { id: userDepartmentId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (ok) return userDepartmentId;
    }
    if (receivedById) {
      const assignment = await this.prisma.userDepartmentRole.findFirst({
        where: { userId: receivedById, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { departmentId: true },
      });
      if (assignment) return assignment.departmentId;
    }
    const main = await this.prisma.department.findFirst({
      where: { organizationId, isMain: true, deletedAt: null },
      select: { id: true },
    });
    if (!main) throw new BadRequestException('No main department configured');
    return main.id;
  }

  async listAllBalances(organizationId: string): Promise<DepartmentBalance[]> {
    const depts = await this.prisma.department.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
      orderBy: { name: 'asc' },
    });
    return Promise.all(depts.map((d) => this.getDepartmentBalance(organizationId, d.id)));
  }

  async userHasMainDepartmentAccess(organizationId: string, userId: string): Promise<boolean> {
    const onMain = await this.prisma.userDepartmentRole.findFirst({
      where: {
        userId,
        deletedAt: null,
        department: { organizationId, isMain: true, deletedAt: null },
      },
    });
    if (onMain) return true;
    const roles = await this.prisma.userDepartmentRole.findMany({
      where: { userId, deletedAt: null },
      select: { role: { select: { privilegeLevel: true } } },
    });
    return roles.some((r) => r.role.privilegeLevel >= 100);
  }
}
