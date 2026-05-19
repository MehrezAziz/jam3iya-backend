import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  listGovernorates() {
    return this.prisma.governorate.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  listDelegations(governorateId: number) {
    return this.prisma.delegation.findMany({
      where: { governorateId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, governorateId: true },
    });
  }
}
