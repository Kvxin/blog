import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@blog/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
    return healthResponseSchema.parse({
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    });
  }
}
