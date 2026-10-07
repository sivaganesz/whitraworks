import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';

@Global()
@Module({
  providers: [RedisService, ThrottlerStorageRedisService],
  exports: [RedisService, ThrottlerStorageRedisService],
})
export class RedisModule {}
