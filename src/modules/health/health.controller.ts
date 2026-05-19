import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    let db = 'unknown';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      db = 'ok';
    } catch (err) {
      db = `down: ${(err as Error).message.slice(0, 100)}`;
    }
    return {
      status: 'ok',
      service: 'jam3iya-backend',
      time: new Date().toISOString(),
      db,
    };
  }

  @Public()
  @Get('ready')
  ready() {
    return { ready: true };
  }
}
