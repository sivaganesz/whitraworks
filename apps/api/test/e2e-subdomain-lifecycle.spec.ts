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
import { API_ERROR_CODES } from '@whitraworks/types';

describe('Module 6 - Task 6.1: Local Subdomain End-to-End Verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;

  // Test parameters
  const timestamp = Date.now();
  const testSlug = `abchotel-${timestamp}`;
  const ownerEmail = `owner-${timestamp}@abchotel.com`;
  const ownerPassword = 'AbcHotelPassword123!';
  const businessName = 'ABC Hotel & Dining';

  let abchotelId: string;
  let ownerUserId: string;
  let ownerSessionCookie: string;

  let superadminId: string;
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
    sessionService = app.get(SessionService);

    // Create superadmin user for control plane operations
    const superadminUser = await prisma.base.user.create({
      data: {
        email: `superadmin-${timestamp}@ops.whitraworks.com`,
        passwordHash: 'dummy-hash',
        firstName: 'Platform',
        lastName: 'Superadmin',
        isPlatformSuperadmin: true,
      },
    });
    superadminId = superadminUser.id;

    const token = sessionService.createSessionToken({
      userId: superadminUser.id,
      email: superadminUser.email,
      isPlatformSuperadmin: true,
    });
    superadminCookie = `${SESSION_COOKIE_NAME}=${token}`;
  });

  afterAll(async () => {
    try {
      if (abchotelId) {
        await prisma.base.tenant.delete({ where: { id: abchotelId } });
      }
      if (superadminId) {
        await prisma.base.user.delete({ where: { id: superadminId } });
      }
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. PUBLIC SIGNUP & DATA PLANE ONBOARDING
  // ─────────────────────────────────────────────────────────────
  describe('Step 1: Public Registration & Data Plane Onboarding (abchotel)', () => {
    it('registers abchotel atomically via public signup', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .set('Host', 'localhost:4000')
        .send({
          email: ownerEmail,
          password: ownerPassword,
          firstName: 'John',
          lastName: 'Hotelier',
          businessName,
          slug: testSlug,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.slug).toBe(testSlug);
      expect(res.body.data.user.email).toBe(ownerEmail);

      abchotelId = res.body.data.tenant.id;
      ownerUserId = res.body.data.user.id;

      const tenantRecord = await prisma.base.tenant.findUnique({ where: { id: abchotelId } });
      expect(tenantRecord?.status).toBe('ACTIVE');
    });

    it('verifies default capabilities (catalog, orders) are provisioned for abchotel', async () => {
      const capabilities = await prisma.base.tenantCapabilityConfig.findMany({
        where: { tenantId: abchotelId },
      });

      const catalogCap = capabilities.find((c) => c.capabilityCode === 'catalog');
      const ordersCap = capabilities.find((c) => c.capabilityCode === 'orders');

      expect(catalogCap).toBeDefined();
      expect(catalogCap?.isEnabled).toBe(true);
      expect(ordersCap).toBeDefined();
      expect(ordersCap?.isEnabled).toBe(true);
    });

    it('allows owner to log in on abchotel.localhost and receives host-only session cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', `${testSlug}.localhost:4000`)
        .send({
          email: ownerEmail,
          password: ownerPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeWorkspace.slug).toBe(testSlug);
      expect(res.body.data.activeWorkspace.role).toBe('OWNER');

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();

      const cookieStr = Array.isArray(setCookie)
        ? setCookie.find((c: string) => c.includes(SESSION_COOKIE_NAME))!
        : setCookie;

      expect(cookieStr).toBeDefined();
      expect(cookieStr).not.toContain('Domain='); // Golden Rule 5: Host-Only cookies (no wildcard)
      ownerSessionCookie = cookieStr;
    });

    it('allows owner to view workspace profile on abchotel.localhost', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/profile')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(businessName);
      expect(res.body.data.slug).toBe(testSlug);
    });

    it('verifies kitchen capability is initially disabled on abchotel data plane', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/capabilities')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(200);
      const kitchenConfig = res.body.data.find(
        (c: { code: string; enabled: boolean }) => c.code === 'kitchen'
      );
      expect(kitchenConfig?.enabled ?? false).toBe(false);
    });

    it('rejects access to /workspace/test-kitchen with 403 when capability is not enabled', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.CAPABILITY_NOT_ENABLED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. COLLISION GUARDRAIL & SCENARIO A INVARIANT
  // ─────────────────────────────────────────────────────────────
  describe('Step 2: Collision Guardrail & Scenario A Invariant Enforcement', () => {
    it('rejects duplicate registration with existing email directing to abchotel', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .set('Host', 'localhost:4000')
        .send({
          email: ownerEmail,
          password: 'AnotherPassword123!',
          firstName: 'Duplicate',
          lastName: 'Attempt',
          businessName: 'Secondary Workspace Attempt',
          slug: `secondary-${Date.now()}`,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(API_ERROR_CODES.EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE);
      expect(res.body.error.details.existingWorkspaceSlug).toBe(testSlug);
      expect(res.body.error.message).toContain(testSlug);
    });

    it('rejects registration using reserved platform slug with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .set('Host', 'localhost:4000')
        .send({
          email: `newuser-${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'Reserved',
          lastName: 'Tester',
          businessName: 'Ops Infiltration Attempt',
          slug: 'ops',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(API_ERROR_CODES.SLUG_RESERVED);
    });

    it('rejects registration using already taken slug with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .set('Host', 'localhost:4000')
        .send({
          email: `differentuser-${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'Collision',
          lastName: 'Tester',
          businessName: 'Collision Attempt',
          slug: testSlug,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(API_ERROR_CODES.SLUG_ALREADY_TAKEN);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. OPS SUSPENSION LIFECYCLE & IMMEDIATE LOCKOUT
  // ─────────────────────────────────────────────────────────────
  describe('Step 3: Control Plane Suspension Flow & Immediate Data Plane Lockout', () => {
    it('suspends abchotel via Ops Admin control plane', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ops/tenants/${abchotelId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          status: 'SUSPENDED',
          reason: 'Regulatory compliance review and audit',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.status).toBe('SUSPENDED');
    });

    it('verifies immutable audit log recorded for suspension', async () => {
      const auditLog = await prisma.base.auditLog.findFirst({
        where: {
          tenantId: abchotelId,
          action: 'tenant.suspend',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe(superadminId);
    });

    it('immediately locks data plane access on abchotel.localhost with 403 TENANT_SUSPENDED', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/profile')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.TENANT_SUSPENDED);
      expect(res.body.error.message).toContain('currently suspended');
    });

    it('rejects new logins on abchotel.localhost with 403 TENANT_SUSPENDED', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', `${testSlug}.localhost:4000`)
        .send({
          email: ownerEmail,
          password: ownerPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.TENANT_SUSPENDED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. REACTIVATION & DYNAMIC CAPABILITY PROPAGATION
  // ─────────────────────────────────────────────────────────────
  describe('Step 4: Reactivation & Dynamic Capability Propagation', () => {
    it('reactivates abchotel via Ops Admin control plane', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ops/tenants/${abchotelId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          status: 'ACTIVE',
          reason: 'Compliance audit verified successfully',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.status).toBe('ACTIVE');
    });

    it('toggles kitchen capability ON in Ops Admin control plane', async () => {
      const res = await request(app.getHttpServer())
        .put(`/ops/tenants/${abchotelId}/capabilities`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          capabilities: {
            kitchen: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('verifies owner can access abchotel data plane again after reactivation', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/profile')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(businessName);
    });

    it('verifies kitchen capability is now ACTIVE in data plane capabilities endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/capabilities')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(200);
      const kitchenConfig = res.body.data.find(
        (c: { code: string; enabled: boolean }) => c.code === 'kitchen'
      );
      expect(kitchenConfig).toBeDefined();
      expect(kitchenConfig?.enabled).toBe(true);
    });

    it('authorizes /workspace/test-kitchen endpoint now that kitchen capability is active', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('kitchen_active');
    });

    it('toggles kitchen capability OFF in Ops Admin and verifies immediate retraction in data plane', async () => {
      // Toggle off in Ops Admin
      const putRes = await request(app.getHttpServer())
        .put(`/ops/tenants/${abchotelId}/capabilities`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          capabilities: {
            kitchen: false,
          },
        });

      expect(putRes.status).toBe(200);

      // Verify immediate 403 on data plane
      const testRes = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerSessionCookie]);

      expect(testRes.status).toBe(403);
      expect(testRes.body.error.code).toBe(API_ERROR_CODES.CAPABILITY_NOT_ENABLED);
    });
  });
});
