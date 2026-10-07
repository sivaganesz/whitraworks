import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';
import { ThrottlerStorageRedisService } from './modules/redis/throttler-storage-redis.service';
import { TenantResolutionMiddleware } from './common/middleware/tenant-resolution.middleware';

import { AuthModule } from './modules/auth/auth.module';
import { PublicModule } from './modules/public/public.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { OpsModule } from './modules/ops/ops.module';

import { AppThrottlerGuard } from './modules/redis/app-throttler.guard';

import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    RedisModule,
    MailModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [ThrottlerStorageRedisService],
      useFactory: (storage: ThrottlerStorageRedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: 120,
          },
        ],
        storage,
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PublicModule,
    WorkspaceModule,
    OpsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
