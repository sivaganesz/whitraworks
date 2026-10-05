import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { SessionService, SESSION_COOKIE_NAME } from '../src/modules/auth/session.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Ops Tenants Directory & Status Lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;

  const testTenantSlug = `ops-tenant-test-${Date.now()}`;
  let testTenantId: string;
  let superadminCookie: string;
  let regularUserCookie: string;
  const superadminId = `superadmin-${Date.now()}`;
  const regularUserId = `regular-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('test-cookie-secret'));
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
    sessionService = app.get(SessionService);

    // Create a regular user and a test tenant in DB
    const regularUser = await prisma.base.user.create({
      data: {
        id: regularUserId,
        email: `regular-${Date.now()}@example.com`,
        passwordHash: 'dummy-hash',
        firstName: 'Regular',
        lastName: 'User',
        isPlatformSuperadmin: false,
      },
    });

    const superadminUser = await prisma.base.user.create({
      data: {
        id: superadminId,
        email: `superadmin-${Date.now()}@ops.whitraworks.com`,
        passwordHash: 'dummy-hash',
        firstName: 'Root',
        lastName: 'Admin',
        isPlatformSuperadmin: true,
      },
    });

    const tenant = await prisma.base.tenant.create({
      data: {
        slug: testTenantSlug,
        name: 'Ops Test Organization',
        status: 'ACTIVE',
      },
    });
    testTenantId = tenant.id;

    // Create tokens
    const superadminToken = sessionService.createSessionToken({
      userId: superadminUser.id,
      email: superadminUser.email,
      isPlatformSuperadmin: true,
    });
    superadminCookie = `${SESSION_COOKIE_NAME}=${superadminToken}`;

    const regularToken = sessionService.createSessionToken({
      userId: regularUser.id,
      email: regularUser.email,
      isPlatformSuperadmin: false,
    });
    regularUserCookie = `${SESSION_COOKIE_NAME}=${regularToken}`;
  });

  afterAll(async () => {
    try {
      if (testTenantId) {
        await prisma.base.auditLog.deleteMany({ where: { tenantId: testTenantId } });
        await prisma.base.tenant.delete({ where: { id: testTenantId } });
      }
      await prisma.base.user.deleteMany({
        where: { id: { in: [superadminId, regularUserId] } },
      });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  describe('1. GET /ops/tenants', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/ops/tenants')
        .set('Host', 'ops.localhost:4000');

      expect(res.status).toBe(401);
    });

    it('rejects regular tenant users with 403 (Golden Rule 6: Two-Tier Privilege)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ops/tenants')
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', regularUserCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
    });

    it('returns paginated tenant directory for platform superadmins', async () => {
      const res = await request(app.getHttpServer())
        .get('/ops/tenants')
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', superadminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.tenants)).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.tenants.find((t: any) => t.id === testTenantId);
      expect(found).toBeDefined();
      expect(found.slug).toBe(testTenantSlug);
      expect(found.memberCount).toBeDefined();
      expect(found.activeCapabilitiesCount).toBeDefined();
    });

    it('filters tenants by search keyword', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ops/tenants?search=${testTenantSlug}`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', superadminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.tenants.length).toBe(1);
      expect(res.body.data.tenants[0].slug).toBe(testTenantSlug);
    });
  });

  describe('2. PATCH /ops/tenants/:id/status', () => {
    it('rejects missing or empty reason with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ops/tenants/${testTenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', superadminCookie)
        .send({
          status: 'SUSPENDED',
          reason: 'ab', // min length is 3
        });

      expect(res.status).toBe(400);
    });

    it('suspends an active tenant and creates an immutable audit log entry', async () => {
      const auditReason = 'Suspended due to terms of service violation';
      const res = await request(app.getHttpServer())
        .patch(`/ops/tenants/${testTenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', superadminCookie)
        .send({
          status: 'SUSPENDED',
          reason: auditReason,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.tenant.status).toBe('SUSPENDED');

      // Verify DB record
      const updatedInDb = await prisma.base.tenant.findUnique({
        where: { id: testTenantId },
      });
      expect(updatedInDb?.status).toBe('SUSPENDED');

      // Verify Audit Log record
      const auditLog = await prisma.base.auditLog.findFirst({
        where: {
          tenantId: testTenantId,
          action: 'tenant.suspend',
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe(superadminId);
      expect((auditLog?.diffJson as any)?.reason).toBe(auditReason);
      expect((auditLog?.diffJson as any)?.newStatus).toBe('SUSPENDED');
    });

    it('reactivates a suspended tenant with audit reason', async () => {
      const reactivateReason = 'Compliance verification resolved, account reactivated';
      const res = await request(app.getHttpServer())
        .patch(`/ops/tenants/${testTenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', superadminCookie)
        .send({
          status: 'ACTIVE',
          reason: reactivateReason,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.tenant.status).toBe('ACTIVE');

      const auditLog = await prisma.base.auditLog.findFirst({
        where: {
          tenantId: testTenantId,
          action: 'tenant.activate',
        },
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.diffJson as any)?.reason).toBe(reactivateReason);
    });

    it('returns 404 when updating non-existent tenant', async () => {
      const res = await request(app.getHttpServer())
        .patch('/ops/tenants/non-existent-uuid/status')
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', superadminCookie)
        .send({
          status: 'SUSPENDED',
          reason: 'Valid audit reason for non-existent tenant',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });
});
