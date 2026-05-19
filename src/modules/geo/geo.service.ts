import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeGovernorateDisplayName } from './governorate-names';

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  private displayName(name: string): string {
    return normalizeGovernorateDisplayName(name);
  }

  async listGovernorates() {
    const rows = await this.prisma.governorate.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    const seen = new Map<string, { id: number; name: string }>();
    for (const row of rows) {
      const name = this.displayName(row.name);
      const existing = seen.get(name);
      if (!existing || row.id < existing.id) {
        seen.set(name, { id: row.id, name });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  listDelegations(governorateId: number) {
    return this.prisma.delegation.findMany({
      where: { governorateId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, governorateId: true },
    });
  }
}
