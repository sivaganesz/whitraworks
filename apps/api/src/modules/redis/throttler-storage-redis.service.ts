import { Injectable, Inject, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from './redis.service';

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);

  // In-memory fallback if Redis is temporarily unreachable
  private inMemoryFallback = new Map<string, { hits: number; expiresAt: number; blockUntil?: number }>();

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisClient = this.redis.getClient();

    if (this.redis.isReady && redisClient) {
      try {
        const countKey = `rl:${throttlerName}:${key}`;
        const blockKey = `rl:block:${throttlerName}:${key}`;

        // 1. Check if blocked
        if (blockDuration > 0) {
          const blockTtlMs = await redisClient.pttl(blockKey);
          if (blockTtlMs > 0) {
            return {
              totalHits: limit + 1,
              timeToExpire: 0,
              isBlocked: true,
              timeToBlockExpire: Math.ceil(blockTtlMs / 1000),
            };
          }
        }

        // 2. Multi increment and expire
        const multi = redisClient.multi();
        multi.incr(countKey);
        multi.pttl(countKey);
        const results = await multi.exec();

        const hits = Number(results?.[0]?.[1] ?? 1);
        let pttl = Number(results?.[1]?.[1] ?? -1);

        // If the key is new or had no TTL, set expiration
        if (hits === 1 || pttl < 0) {
          await redisClient.pexpire(countKey, ttl);
          pttl = ttl;
        }

        const isExceeded = hits > limit;
        let isBlocked = false;
        let timeToBlockExpire = 0;

        if (isExceeded && blockDuration > 0) {
          await redisClient.set(blockKey, '1', 'PX', blockDuration);
          isBlocked = true;
          timeToBlockExpire = Math.ceil(blockDuration / 1000);
        } else if (isExceeded) {
          isBlocked = true;
        }

        return {
          totalHits: hits,
          timeToExpire: Math.max(0, Math.ceil(pttl / 1000)),
          isBlocked,
          timeToBlockExpire,
        };
      } catch (err) {
        this.logger.warn(`Redis throttler failed, using memory fallback: ${(err as Error).message}`);
      }
    }

    // Memory fallback logic
    return this.incrementFallback(key, ttl, limit, blockDuration, throttlerName);
  }

  private incrementFallback(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): ThrottlerStorageRecord {
    const fullKey = `${throttlerName}:${key}`;
    const now = Date.now();
    const existing = this.inMemoryFallback.get(fullKey);

    if (existing?.blockUntil && existing.blockUntil > now) {
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: Math.ceil((existing.blockUntil - now) / 1000),
      };
    }

    if (!existing || existing.expiresAt <= now) {
      const record = { hits: 1, expiresAt: now + ttl };
      this.inMemoryFallback.set(fullKey, record);
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    existing.hits += 1;
    const isExceeded = existing.hits > limit;
    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (isExceeded && blockDuration > 0) {
      existing.blockUntil = now + blockDuration;
      isBlocked = true;
      timeToBlockExpire = Math.ceil(blockDuration / 1000);
    } else if (isExceeded) {
      isBlocked = true;
    }

    return {
      totalHits: existing.hits,
      timeToExpire: Math.max(0, Math.ceil((existing.expiresAt - now) / 1000)),
      isBlocked,
      timeToBlockExpire,
    };
  }
}
