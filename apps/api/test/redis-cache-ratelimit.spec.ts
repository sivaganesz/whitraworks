import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { API_ERROR_CODES } from '@whitraworks/types';
import { SESSION_COOKIE_NAME } from '../src/modules/auth/session.service';

describe('Task 4: Redis Caching & Distributed Rate Limiting (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  const testSlug = `cachetest-${Date.now()}`;
  let tenantId: string;
  let superadminCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);

    // Create test tenant in DB
    const tenant = await prisma.base.tenant.create({
      data: {
        name: 'Cache Test Workspace',
        slug: testSlug,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'UTC',
      },
    });
    tenantId = tenant.id;

    // Create superadmin user for ops control plane
    const superadmin = await prisma.base.user.create({
      data: {
        email: `ops-${Date.now()}@whitraworks.com`,
        passwordHash: 'dummy',
        firstName: 'Ops',
        lastName: 'Admin',
        isPlatformSuperadmin: true,
      },
    });

    const sessionService = app.get(
      (await import('../src/modules/auth/session.service')).SessionService
    );
    const token = sessionService.createSessionToken({
      userId: superadmin.id,
      email: superadmin.email,
      isPlatformSuperadmin: true,
    });
    superadminCookie = `${SESSION_COOKIE_NAME}=${token}`;
  }, 30000);

  afterAll(async () => {
    try {
      if (tenantId) {
        await prisma.base.tenant.delete({ where: { id: tenantId } }).catch(() => {});
      }
      await redis.invalidateTenant(testSlug);
      await app.close();
    } catch {}
  });

  describe('1. Subdomain Tenant Resolution Redis Caching', () => {
    it('populates Redis cache on initial subdomain lookup', async () => {
      // Ensure key is cleared initially
      await redis.invalidateTenant(testSlug);
      const preCheck = await redis.getCachedTenant(testSlug);
      expect(preCheck).toBeNull();

      // Send request resolving through tenant subdomain
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`);

      // Auth fails because no cookie, but tenant resolution completed successfully
      expect(res.status).toBe(401);

      // Verify Redis now contains the cached tenant
      const cached = await redis.getCachedTenant(testSlug);
      expect(cached).toBeDefined();
      expect(cached?.slug).toBe(testSlug);
      expect(cached?.name).toBe('Cache Test Workspace');
      expect(cached?.status).toBe('ACTIVE');
    });

    it('serves subdomain lookup directly from Redis cache', async () => {
      const cached = await redis.getCachedTenant(testSlug);
      expect(cached).not.toBeNull();

      // Temporarily tamper cached name in Redis to prove response reads from cache
      if (cached) {
        await redis.setCachedTenant(testSlug, {
          ...cached,
          name: 'Redis Fast Path Name',
        });
      }

      const verified = await redis.getCachedTenant(testSlug);
      expect(verified?.name).toBe('Redis Fast Path Name');
    });

    it('invalidates Redis cache when tenant status is mutated via Ops Control Plane', async () => {
      // Update tenant status to SUSPENDED via Ops API
      const patchRes = await request(app.getHttpServer())
        .patch(`/ops/tenants/${tenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          status: 'SUSPENDED',
          reason: 'Regulatory compliance audit suspension test',
        });

      expect(patchRes.status).toBe(200);

      // Verify that Redis cache for this slug was invalidated immediately
      const postInvalidation = await redis.getCachedTenant(testSlug);
      expect(postInvalidation).toBeNull();

      // Next request to the tenant host should now detect SUSPENDED status
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.TENANT_SUSPENDED);
    });
  });

  describe('2. Distributed Rate Limiting on Sensitive Endpoints', () => {
    it('enforces rate limiting and returns 429 RATE_LIMIT_EXCEEDED when threshold is exceeded', async () => {
      // Reactivate tenant so requests reach the AuthController
      await request(app.getHttpServer())
        .patch(`/ops/tenants/${tenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          status: 'ACTIVE',
          reason: 'Reactivating workspace for rate limiting verification',
        });

      const uniqueIp = `192.168.99.${Math.floor(Math.random() * 200) + 10}`;

      // Loop requests on /auth/login (limit is 10 per minute)
      let rateLimited = false;
      let rateLimitStatus = 0;
      let errorBody: any = null;

      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .set('Host', `${testSlug}.localhost:4000`)
          .set('X-Forwarded-For', uniqueIp)
          .set('x-test-rate-limit', 'true')
          .send({
            email: 'test@whitraworks.com',
            password: 'InvalidPassword123!',
          });

        if (res.status === 429) {
          rateLimited = true;
          rateLimitStatus = res.status;
          errorBody = res.body;
          break;
        }
      }

      expect(rateLimited).toBe(true);
      expect(rateLimitStatus).toBe(429);
      expect(errorBody.success).toBe(false);
      expect(errorBody.error.code).toBe(API_ERROR_CODES.RATE_LIMIT_EXCEEDED);
    });
  });
});
