import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { TenantStatus } from '@whitraworks/database';

export interface CachedTenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isConnected = false;

  onModuleInit() {
    const redisUrl = process.env['REDIS_URL'];
    const host = process.env['REDIS_HOST'] || 'localhost';
    const port = Number(process.env['REDIS_PORT'] || 6379);
    const password = process.env['REDIS_PASSWORD'] || undefined;

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        lazyConnect: false,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 2,
      });
    } else {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: false,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 2,
      });
    }

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`Connected to Redis instance successfully.`);
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.warn(`Redis connection error (fallback mode active): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  getClient(): Redis {
    return this.client;
  }

  get isReady(): boolean {
    return this.isConnected;
  }

  // Generic key-value helpers
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(`Redis GET failed for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (!this.isConnected) return null;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        return await this.client.set(key, value, 'EX', ttlSeconds);
      }
      return await this.client.set(key, value);
    } catch (err) {
      this.logger.warn(`Redis SET failed for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (!this.isConnected) return 0;
    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis DEL failed for key(s): ${(err as Error).message}`);
      return 0;
    }
  }

  // Tenant Resolution Cache (Subdomain lookups)
  private getTenantKey(slug: string): string {
    return `tenant:slug:${slug.toLowerCase()}`;
  }

  async getCachedTenant(slug: string): Promise<CachedTenant | null> {
    const raw = await this.get(this.getTenantKey(slug));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedTenant;
    } catch {
      return null;
    }
  }

  async setCachedTenant(slug: string, tenant: CachedTenant, ttlSeconds = 300): Promise<void> {
    await this.set(this.getTenantKey(slug), JSON.stringify(tenant), ttlSeconds);
  }

  async invalidateTenant(slug: string): Promise<void> {
    await this.del(this.getTenantKey(slug));
  }
}
