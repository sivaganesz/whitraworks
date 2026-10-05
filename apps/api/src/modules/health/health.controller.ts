import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Platform health check and database connectivity verification' })
  @SwaggerResponse({ status: 200, description: 'Application and database are healthy' })
  async checkHealth() {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.base.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      database: dbStatus,
      version: '0.1.0',
      uptime: Math.floor(process.uptime()),
    };
  }
}
