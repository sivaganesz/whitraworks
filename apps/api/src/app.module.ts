import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { TenantResolutionMiddleware } from './common/middleware/tenant-resolution.middleware';

import { AuthModule } from './modules/auth/auth.module';
import { PublicModule } from './modules/public/public.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, PublicModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
