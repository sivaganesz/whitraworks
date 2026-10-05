import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { API_ERROR_CODES } from '@whitraworks/types';
import { SESSION_COOKIE_NAME } from '../src/modules/auth/session.service';

describe('Auth & Collision-Guarded Registration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = 'founder-test@example.com';
  const testPassword = 'Password123!';
  const testSlug = 'founder-bistro-test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('test-cookie-secret'));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up any existing test records
    await prisma.base.tenant.deleteMany({
      where: { slug: { in: [testSlug, 'other-workspace-test'] } },
    });
    await prisma.base.user.deleteMany({
      where: { email: { in: [testEmail, 'other-user@example.com'] } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.base.tenant.deleteMany({
        where: { slug: { in: [testSlug, 'other-workspace-test'] } },
      });
      await prisma.base.user.deleteMany({
        where: { email: { in: [testEmail, 'other-user@example.com'] } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Check Slug Endpoint', () => {
    it('returns reserved status for platform reserved slugs', async () => {
      const res = await request(app.getHttpServer()).get('/public/check-slug?slug=ops');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.reason).toBe('RESERVED');
    });

    it('returns available status for fresh slug', async () => {
      const res = await request(app.getHttpServer()).get(`/public/check-slug?slug=${testSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
    });
  });

  describe('2. Public Registration & Collision Guardrails', () => {
    it('successfully registers a user, workspace, and owner membership atomically', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .send({
          firstName: 'Vikram',
          lastName: 'Mehta',
          email: testEmail,
          password: testPassword,
          businessName: 'Founder Bistro',
          slug: testSlug,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.tenant.slug).toBe(testSlug);

      // Verify Host-Scoped Session Cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const hasSessionCookie = cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME));
      expect(hasSessionCookie).toBe(true);

      // Verify in DB that owner role and default capabilities were created
      const tenant = await prisma.base.tenant.findUnique({
        where: { slug: testSlug },
        include: {
          members: {
            include: { role: true },
          },
          capabilities: true,
        },
      });

      expect(tenant).toBeDefined();
      expect(tenant?.members.length).toBe(1);
      expect(tenant?.members[0]?.role.code).toBe('OWNER');
      expect(tenant?.capabilities.length).toBeGreaterThanOrEqual(2); // catalog and orders
    });

    it('Scenario A Invariant: rejects duplicate email with 409 and redirects to existing workspace', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .send({
          firstName: 'Another',
          lastName: 'Person',
          email: testEmail, // duplicate email!
          password: 'AnotherPassword123!',
          businessName: 'Different Business',
          slug: 'different-slug',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(API_ERROR_CODES.EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE);
      expect(res.body.error.details.existingWorkspaceSlug).toBe(testSlug);
      expect(res.body.error.details.signInUrl).toContain(testSlug);
    });

    it('rejects duplicate slug with 409 SLUG_ALREADY_TAKEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'new-unique-email@example.com',
          password: 'Password123!',
          businessName: 'Different Business',
          slug: testSlug, // duplicate slug!
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(API_ERROR_CODES.SLUG_ALREADY_TAKEN);
    });
  });

  describe('3. Tenant Authentication & Session Lifecycle', () => {
    let sessionCookie: string;

    it('logs in successfully against the tenant workspace host', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', `${testSlug}.localhost:4000`)
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.activeWorkspace.slug).toBe(testSlug);
      expect(res.body.data.activeWorkspace.role).toBe('OWNER');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      sessionCookie = cookies[0];
    });

    it('rejects login with incorrect password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', `${testSlug}.localhost:4000`)
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(API_ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('GET /auth/me returns current session profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.activeWorkspace.slug).toBe(testSlug);
      expect(res.body.data.availableWorkspaces.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /auth/logout clears session cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Host', `${testSlug}.localhost:4000`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const isCleared = cookies.some((c: string) => c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970'));
      expect(isCleared).toBe(true);
    });
  });

  describe('4. Two-Tier Privilege Orthogonality', () => {
    it('Golden Rule 6: Tenant owner CANNOT log in to ops control plane', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', 'ops.localhost:4000') // control plane
        .send({
          email: testEmail, // tenant owner, NOT superadmin
          password: testPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('Root Superadmin CAN log in to ops control plane', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', 'ops.localhost:4000')
        .send({
          email: process.env.INITIAL_SUPERADMIN_EMAIL || 'superadmin@whitraworks.com',
          password: process.env.INITIAL_SUPERADMIN_PASSWORD || 'ChangeMeImmediately123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.isPlatformSuperadmin).toBe(true);
    });
  });
});
