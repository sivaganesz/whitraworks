import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';
import { SessionService, SESSION_COOKIE_NAME } from '../src/modules/auth/session.service';
import { MailService } from '../src/modules/mail/mail.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { API_ERROR_CODES } from '@whitraworks/types';

describe('Tasks 5 & 6: Transactional Emails & Distributed Session Invalidation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let sessionService: SessionService;
  let mailService: MailService;

  const timestamp = Date.now();
  const testSlug = `invaltest-${timestamp}`;
  const ownerEmail = `owner-${timestamp}@test.com`;
  const ownerPassword = 'Password123!';
  const staffEmail = `staff-${timestamp}@test.com`;
  const staffPassword = 'Password123!';

  let tenantId: string;
  let ownerToken: string;
  let ownerCookie: string;
  let staffUserId: string;
  let staffMemberId: string;
  let staffToken: string;
  let staffCookie: string;

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
    sessionService = app.get(SessionService);
    mailService = app.get(MailService);

    // 1. Atomic registration of test tenant
    const regRes = await request(app.getHttpServer())
      .post('/public/register')
      .set('Host', 'localhost:4000')
      .send({
        email: ownerEmail,
        password: ownerPassword,
        firstName: 'Owner',
        lastName: 'Test',
        businessName: 'Invalidation Test Corp',
        slug: testSlug,
      });

    expect(regRes.status).toBe(201);
    tenantId = regRes.body.data.tenant.id;

    // Login owner
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Host', `${testSlug}.localhost:4000`)
      .send({ email: ownerEmail, password: ownerPassword });

    expect(ownerLogin.status).toBe(200);
    const ownerCookies = ownerLogin.headers['set-cookie'] as string[];
    ownerCookie = ownerCookies.find((c) => c.includes(SESSION_COOKIE_NAME))!;
    ownerToken = ownerCookie.split(';')[0]!.split('=')[1]!;

    // 2. Invite a staff member
    const inviteRes = await request(app.getHttpServer())
      .post('/workspace/members/invite')
      .set('Host', `${testSlug}.localhost:4000`)
      .set('Cookie', [ownerCookie])
      .send({
        email: staffEmail,
        roleCode: 'STAFF',
      });

    expect(inviteRes.status).toBe(201);
    const inviteToken = inviteRes.body.data.token;

    // 3. Accept invitation as staff
    const acceptRes = await request(app.getHttpServer())
      .post('/workspace/invitations/accept')
      .set('Host', `${testSlug}.localhost:4000`)
      .send({
        token: inviteToken,
        password: staffPassword,
        firstName: 'Staff',
        lastName: 'Member',
      });

    expect(acceptRes.status).toBe(200);
    staffUserId = acceptRes.body.data.user.id;
    const staffCookies = acceptRes.headers['set-cookie'] as string[];
    staffCookie = staffCookies.find((c) => c.includes(SESSION_COOKIE_NAME))!;
    staffToken = staffCookie.split(';')[0]!.split('=')[1]!;

    // Query staff member ID
    const memberRecord = await prisma.base.workspaceMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: staffUserId,
        },
      },
    });
    staffMemberId = memberRecord!.id;
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

  describe('Task 5: Transactional Email Notification Service (Resend)', () => {
    it('dispatches invitation email with formatted template', async () => {
      const result = await mailService.sendInvitationEmail({
        to: 'newmember@example.com',
        inviterName: 'Test Inviter',
        workspaceName: 'Acme Test',
        workspaceSlug: 'acme-test',
        roleName: 'Staff Member',
        inviteUrl: 'https://acme-test.whitraworks.com/invite/accept?token=sample123',
        expiresAt: new Date(Date.now() + 7 * 86400000),
      });

      expect(result.success).toBe(true);
      expect(result.dryRun || result.messageId).toBeDefined();
    });

    it('dispatches welcome email for new workspace owner', async () => {
      const result = await mailService.sendWelcomeEmail({
        to: 'newowner@example.com',
        userName: 'Alex',
        businessName: 'Apex Logistics',
        workspaceSlug: 'apex-logistics',
        workspaceUrl: 'https://apex-logistics.whitraworks.com',
      });

      expect(result.success).toBe(true);
      expect(result.dryRun || result.messageId).toBeDefined();
    });

    it('dispatches password reset email with secure action link', async () => {
      const result = await mailService.sendPasswordResetEmail({
        to: 'user@example.com',
        userName: 'Alex',
        resetUrl: 'https://whitraworks.com/reset?token=xyz',
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(result.success).toBe(true);
      expect(result.dryRun || result.messageId).toBeDefined();
    });
  });

  describe('Task 6: Distributed Session Invalidation & Token Blocklist (Redis)', () => {
    it('allows access with active session cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(ownerEmail);
    });

    it('blocklists token upon logout and rejects subsequent presentation', async () => {
      // 1. Log out with owner cookie
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(logoutRes.status).toBe(200);

      // Verify token is flagged as blocked in Redis
      const isBlocked = await sessionService.isTokenBlocked(ownerToken);
      expect(isBlocked).toBe(true);

      // 2. Attempt to use logged-out token again
      const replayRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [`${SESSION_COOKIE_NAME}=${ownerToken}`]);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe(API_ERROR_CODES.SESSION_EXPIRED);
    });

    it('instantaneously invalidates active sessions when member is deactivated', async () => {
      // Re-login owner to get a fresh session for administrative mutation
      const reLoginOwner = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', `${testSlug}.localhost:4000`)
        .send({ email: ownerEmail, password: ownerPassword });

      const newOwnerCookie = (reLoginOwner.headers['set-cookie'] as string[]).find((c) =>
        c.includes(SESSION_COOKIE_NAME)
      )!;

      // Staff member can currently access their profile
      const staffInitial = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [staffCookie]);

      expect(staffInitial.status).toBe(200);

      // Owner deactivates the staff member
      const deactivateRes = await request(app.getHttpServer())
        .delete(`/workspace/members/${staffMemberId}`)
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [newOwnerCookie]);

      expect(deactivateRes.status).toBe(200);

      // Staff member presents previously issued token: must be rejected immediately!
      const staffPostDeactivation = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [staffCookie]);

      expect(staffPostDeactivation.status).toBe(401);
      expect(staffPostDeactivation.body.error.code).toBe(API_ERROR_CODES.SESSION_EXPIRED);
    });

    it('instantaneously invalidates all workspace sessions when tenant is suspended via Ops', async () => {
      // Create superadmin user for ops control plane
      const superadmin = await prisma.base.user.create({
        data: {
          email: `superadmin-${timestamp}@ops.whitraworks.com`,
          passwordHash: 'dummy',
          firstName: 'Super',
          lastName: 'Admin',
          isPlatformSuperadmin: true,
        },
      });

      const superadminToken = sessionService.createSessionToken({
        userId: superadmin.id,
        email: superadmin.email,
        isPlatformSuperadmin: true,
      });
      const superadminCookie = `${SESSION_COOKIE_NAME}=${superadminToken}`;

      // Login owner again
      const ownerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Host', `${testSlug}.localhost:4000`)
        .send({ email: ownerEmail, password: ownerPassword });

      const activeOwnerCookie = (ownerLogin.headers['set-cookie'] as string[]).find((c) =>
        c.includes(SESSION_COOKIE_NAME)
      )!;

      // Verify owner can access
      const preSuspend = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [activeOwnerCookie]);

      expect(preSuspend.status).toBe(200);

      // Ops suspends tenant
      const suspendRes = await request(app.getHttpServer())
        .patch(`/ops/tenants/${tenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [superadminCookie])
        .send({
          status: 'SUSPENDED',
          reason: 'Regulatory compliance investigation',
        });

      expect(suspendRes.status).toBe(200);

      // Attempting to present owner token must now fail with TENANT_SUSPENDED / SESSION_EXPIRED
      const postSuspend = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Host', `${testSlug}.localhost:4000`)
        .set('Cookie', [activeOwnerCookie]);

      expect([401, 403]).toContain(postSuspend.status);
    });
  });
});
