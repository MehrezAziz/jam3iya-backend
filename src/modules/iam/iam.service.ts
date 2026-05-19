import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class IamService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        kind: true,
        status: true,
        locale: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: {
        OR: [{ organizationId }, { isSystem: true, organizationId: null }],
        deletedAt: null,
      },
      include: { permissions: { include: { permission: true } } },
      orderBy: { privilegeLevel: 'desc' },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  async inviteStaff(
    organizationId: string,
    invitedByUserId: string,
    data: { email: string; fullName: string },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email: data.email } },
    });
    if (existing) throw new ConflictException('User already exists in this organization');

    const tokenPlain = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    const tokenHash = await argon2.hash(tokenPlain, { type: argon2.argon2id });
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

    const invite = await this.prisma.userInvite.create({
      data: {
        organizationId,
        email: data.email,
        fullName: data.fullName,
        invitedById: invitedByUserId,
        tokenHash,
        expiresAt,
      },
    });
    return { invite, token: tokenPlain };
  }

  async assignDepartmentRole(
    organizationId: string,
    data: { userId: string; departmentId: string; roleId: string },
  ) {
    const user = await this.prisma.user.findFirst({ where: { id: data.userId, organizationId } });
    if (!user) throw new NotFoundException('User not found in this organization');
    return this.prisma.userDepartmentRole.upsert({
      where: {
        userId_departmentId_roleId: {
          userId: data.userId,
          departmentId: data.departmentId,
          roleId: data.roleId,
        },
      },
      create: data,
      update: { deletedAt: null, validTo: null },
    });
  }
}
