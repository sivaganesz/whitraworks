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

describe('Module 6 - Task 6.2: Multi-Tenant Negative Security & Boundary Verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;

  const timestamp = Date.now();

  // Tenant Alpha definitions
  const alphaSlug = `sec-alpha-${timestamp}`;
  const alphaOwnerEmail = `owner-alpha-${timestamp}@alpha.com`;
  const alphaStaffEmail = `staff-alpha-${timestamp}@alpha.com`;
  const alphaPassword = 'SecurityAlphaPassword123!';
  let alphaTenantId: string;
  let alphaOwnerUserId: string;
  let alphaOwnerMemberId: string;
  let alphaOwnerCookie: string;
  let alphaStaffUserId: string;
  let alphaStaffMemberId: string;
  let alphaStaffCookie: string;
  let alphaInvitationId: string;

  // Tenant Beta definitions
  const betaSlug = `sec-beta-${timestamp}`;
  const betaOwnerEmail = `owner-beta-${timestamp}@beta.com`;
  const betaPassword = 'SecurityBetaPassword123!';
  let betaTenantId: string;
  let betaOwnerUserId: string;
  let betaOwnerMemberId: string;
  let betaOwnerCookie: string;
  let betaInvitationId: string;

  // Platform Superadmin definitions
  let superadminUserId: string;
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

    // ─────────────────────────────────────────────────────────────
    // 1. SETUP TENANT ALPHA
    // ─────────────────────────────────────────────────────────────
    const regAlphaRes = await request(app.getHttpServer())
      .post('/public/register')
      .set('Host', 'localhost:4000')
      .send({
        email: alphaOwnerEmail,
        password: alphaPassword,
        firstName: 'Alpha',
        lastName: 'Owner',
        businessName: 'Alpha Enterprises',
        slug: alphaSlug,
      });

    expect(regAlphaRes.status).toBe(201);
    alphaTenantId = regAlphaRes.body.data.tenant.id;
    alphaOwnerUserId = regAlphaRes.body.data.user.id;

    // Login Alpha Owner to get session cookie
    const loginAlphaRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Host', `${alphaSlug}.localhost:4000`)
      .send({ email: alphaOwnerEmail, password: alphaPassword });

    expect(loginAlphaRes.status).toBe(200);
    const alphaCookieHeader = loginAlphaRes.headers['set-cookie'];
    alphaOwnerCookie = Array.isArray(alphaCookieHeader) ? alphaCookieHeader[0] : alphaCookieHeader;

    // Lookup Alpha Owner Member ID
    const alphaOwnerMember = await prisma.base.workspaceMember.findFirst({
      where: { tenantId: alphaTenantId, userId: alphaOwnerUserId },
    });
    alphaOwnerMemberId = alphaOwnerMember!.id;

    // Invite and onboard a STAFF member in Tenant Alpha
    const inviteAlphaStaffRes = await request(app.getHttpServer())
      .post('/workspace/members/invite')
      .set('Host', `${alphaSlug}.localhost:4000`)
      .set('Cookie', [alphaOwnerCookie])
      .send({
        email: alphaStaffEmail,
        roleCode: 'STAFF',
      });

    expect(inviteAlphaStaffRes.status).toBe(201);
    const staffInviteToken = inviteAlphaStaffRes.body.data.token;

    // Accept invitation as STAFF
    const acceptStaffRes = await request(app.getHttpServer())
      .post('/workspace/invitations/accept')
      .set('Host', `${alphaSlug}.localhost:4000`)
      .send({
        token: staffInviteToken,
        password: alphaPassword,
        firstName: 'Alpha',
        lastName: 'Staff',
      });

    expect(acceptStaffRes.status).toBe(200);
    alphaStaffUserId = acceptStaffRes.body.data.user.id;
    const staffCookieHeader = acceptStaffRes.headers['set-cookie'];
    alphaStaffCookie = Array.isArray(staffCookieHeader) ? staffCookieHeader[0] : staffCookieHeader;

    const alphaStaffMember = await prisma.base.workspaceMember.findFirst({
      where: { tenantId: alphaTenantId, userId: alphaStaffUserId },
    });
    alphaStaffMemberId = alphaStaffMember!.id;

    // Create a pending invitation in Alpha
    const pendingAlphaInvite = await request(app.getHttpServer())
      .post('/workspace/members/invite')
      .set('Host', `${alphaSlug}.localhost:4000`)
      .set('Cookie', [alphaOwnerCookie])
      .send({
        email: `pending-alpha-${timestamp}@alpha.com`,
        roleCode: 'STAFF',
      });
    alphaInvitationId = pendingAlphaInvite.body.data.id;

    // ─────────────────────────────────────────────────────────────
    // 2. SETUP TENANT BETA
    // ─────────────────────────────────────────────────────────────
    const regBetaRes = await request(app.getHttpServer())
      .post('/public/register')
      .set('Host', 'localhost:4000')
      .send({
        email: betaOwnerEmail,
        password: betaPassword,
        firstName: 'Beta',
        lastName: 'Owner',
        businessName: 'Beta Dynamics',
        slug: betaSlug,
      });

    expect(regBetaRes.status).toBe(201);
    betaTenantId = regBetaRes.body.data.tenant.id;
    betaOwnerUserId = regBetaRes.body.data.user.id;

    const loginBetaRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Host', `${betaSlug}.localhost:4000`)
      .send({ email: betaOwnerEmail, password: betaPassword });

    expect(loginBetaRes.status).toBe(200);
    const betaCookieHeader = loginBetaRes.headers['set-cookie'];
    betaOwnerCookie = Array.isArray(betaCookieHeader) ? betaCookieHeader[0] : betaCookieHeader;

    const betaOwnerMember = await prisma.base.workspaceMember.findFirst({
      where: { tenantId: betaTenantId, userId: betaOwnerUserId },
    });
    betaOwnerMemberId = betaOwnerMember!.id;

    // Create a pending invitation in Beta
    const pendingBetaInvite = await request(app.getHttpServer())
      .post('/workspace/members/invite')
      .set('Host', `${betaSlug}.localhost:4000`)
      .set('Cookie', [betaOwnerCookie])
      .send({
        email: `pending-beta-${timestamp}@beta.com`,
        roleCode: 'STAFF',
      });
    betaInvitationId = pendingBetaInvite.body.data.id;

    // ─────────────────────────────────────────────────────────────
    // 3. SETUP PLATFORM SUPERADMIN
    // ─────────────────────────────────────────────────────────────
    const superadmin = await prisma.base.user.create({
      data: {
        email: `superadmin-sec-${timestamp}@ops.whitraworks.com`,
        passwordHash: 'dummy-hash',
        firstName: 'Security',
        lastName: 'Superadmin',
        isPlatformSuperadmin: true,
      },
    });
    superadminUserId = superadmin.id;

    const token = sessionService.createSessionToken({
      userId: superadmin.id,
      email: superadmin.email,
      isPlatformSuperadmin: true,
    });
    superadminCookie = `${SESSION_COOKIE_NAME}=${token}`;
  }, 30000);

  afterAll(async () => {
    try {
      if (alphaTenantId) {
        await prisma.base.tenant.delete({ where: { id: alphaTenantId } });
      }
      if (betaTenantId) {
        await prisma.base.tenant.delete({ where: { id: betaTenantId } });
      }
      if (superadminUserId) {
        await prisma.base.user.delete({ where: { id: superadminUserId } });
      }
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: CROSS-TENANT SESSION PRESENTATION & ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('1. Cross-Tenant Session Presentation & Isolation (Golden Rule 2)', () => {
    it('rejects Tenant Alpha Owner session on Tenant Beta host (GET /workspace/profile)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/profile')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
      expect(res.body.data).toBeUndefined();
    });

    it('rejects Tenant Alpha Owner session on Tenant Beta host (GET /workspace/members)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
      expect(res.body.data).toBeUndefined();
    });

    it('rejects Tenant Alpha Owner session on Tenant Beta host (POST /workspace/members/invite)', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie])
        .send({
          email: 'infiltrator@attacker.com',
          roleCode: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
      expect(res.body.data).toBeUndefined();
    });

    it('rejects Tenant Alpha Owner session on Tenant Beta host (PATCH /workspace/profile)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/profile')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie])
        .send({
          name: 'Hacked Beta Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);

      // Verify Beta profile remains unchanged in database
      const betaTenant = await prisma.base.tenant.findUnique({ where: { id: betaTenantId } });
      expect(betaTenant?.name).toBe('Beta Dynamics');
    });

    it('rejects Tenant Alpha Owner session on Tenant Beta host (GET /workspace/capabilities)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/capabilities')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('rejects Tenant Alpha Owner session on Tenant Beta host (GET /workspace/invitations)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/invitations')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: CROSS-TENANT RESOURCE ID TAMPERING
  // ─────────────────────────────────────────────────────────────
  describe('2. Cross-Tenant Resource ID Tampering Prevention', () => {
    it('prevents Alpha Owner from deleting Beta member via ID tampering on Alpha host (returns 404)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/members/${betaOwnerMemberId}`)
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(API_ERROR_CODES.MEMBERSHIP_NOT_FOUND);

      // Verify that Beta member was NOT affected
      const betaMember = await prisma.base.workspaceMember.findUnique({
        where: { id: betaOwnerMemberId },
      });
      expect(betaMember).not.toBeNull();
      expect(betaMember?.status).toBe('ACTIVE');
    });

    it('prevents Alpha Owner from revoking Beta invitation via ID tampering on Alpha host (returns 404)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/invitations/${betaInvitationId}`)
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(API_ERROR_CODES.RESOURCE_NOT_FOUND);

      // Verify that Beta invitation was NOT affected
      const betaInvite = await prisma.base.invitation.findUnique({
        where: { id: betaInvitationId },
      });
      expect(betaInvite).not.toBeNull();
      expect(betaInvite?.acceptedAt).toBeNull();
    });

    it('prevents Alpha Owner from deleting non-existent random UUID member (returns 404)', async () => {
      const fakeUuid = '018f3a2b-0000-7000-8000-000000000000';
      const res = await request(app.getHttpServer())
        .delete(`/workspace/members/${fakeUuid}`)
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(API_ERROR_CODES.MEMBERSHIP_NOT_FOUND);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: TWO-TIER PRIVILEGE ORTHOGONALITY (GOLDEN RULE 6)
  // ─────────────────────────────────────────────────────────────
  describe('3. Two-Tier Privilege Orthogonality (Golden Rule 6)', () => {
    it('denies Tenant Owner access to ops control plane (GET /ops/overview)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ops/overview')
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('denies Tenant Owner access to ops control plane (GET /ops/tenants)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ops/tenants')
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('denies Tenant Owner access to ops control plane (GET /ops/audit-logs)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ops/audit-logs')
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('denies Tenant Owner from mutating tenant status via control plane (PATCH /ops/tenants/:id/status)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ops/tenants/${betaTenantId}/status`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [alphaOwnerCookie])
        .send({ status: 'SUSPENDED', reason: 'Malicious attempt' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);

      // Verify Beta status was NOT modified
      const betaTenant = await prisma.base.tenant.findUnique({ where: { id: betaTenantId } });
      expect(betaTenant?.status).toBe('ACTIVE');
    });

    it('denies Tenant Owner from mutating tenant capabilities via control plane (PUT /ops/tenants/:id/capabilities)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/ops/tenants/${alphaTenantId}/capabilities`)
        .set('Host', 'ops.localhost:4000')
        .set('Cookie', [alphaOwnerCookie])
        .send({ capabilities: [{ capabilityCode: 'kitchen', isEnabled: true }] });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('denies Platform Superadmin access to tenant data plane without membership (GET /workspace/members)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [superadminCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: TENANT RBAC & PRIVILEGE ESCALATION PREVENTION
  // ─────────────────────────────────────────────────────────────
  describe('4. Tenant RBAC & Privilege Escalation Prevention', () => {
    it('denies STAFF member from updating workspace profile (PATCH /workspace/profile)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/profile')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaStaffCookie])
        .send({ name: 'Staff Tampered Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);

      const tenant = await prisma.base.tenant.findUnique({ where: { id: alphaTenantId } });
      expect(tenant?.name).toBe('Alpha Enterprises');
    });

    it('denies STAFF member from inviting new members (POST /workspace/members/invite)', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaStaffCookie])
        .send({ email: 'newstaff@alpha.com', roleCode: 'STAFF' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('denies STAFF member from removing a workspace member (DELETE /workspace/members/:id)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/members/${alphaOwnerMemberId}`)
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaStaffCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('denies STAFF member from revoking an invitation (DELETE /workspace/invitations/:id)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/invitations/${alphaInvitationId}`)
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaStaffCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_FORBIDDEN);
    });

    it('prevents inviting a member with OWNER role (returns 400 CANNOT_INVITE_AS_OWNER)', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie])
        .send({ email: 'co-owner@alpha.com', roleCode: 'OWNER' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(API_ERROR_CODES.CANNOT_INVITE_AS_OWNER);
    });

    it('prevents deactivating or removing an OWNER member (returns 403 CANNOT_REMOVE_TENANT_OWNER)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/members/${alphaOwnerMemberId}`)
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.CANNOT_REMOVE_TENANT_OWNER);

      const ownerMember = await prisma.base.workspaceMember.findUnique({
        where: { id: alphaOwnerMemberId },
      });
      expect(ownerMember?.status).toBe('ACTIVE');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: CAPABILITY ENGINE GATING & HEADER SPOOFING
  // ─────────────────────────────────────────────────────────────
  describe('5. Capability Engine Gating & Header Tampering (Golden Rule 3)', () => {
    it('rejects access to /workspace/test-kitchen when capability is disabled (403 CAPABILITY_NOT_ENABLED)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.CAPABILITY_NOT_ENABLED);
    });

    it('rejects header spoofing attempt to enable kitchen capability via HTTP headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie])
        .set('x-capability', 'kitchen')
        .set('x-tenant-capability', 'kitchen')
        .set('x-capabilities', 'kitchen,orders,catalog')
        .set('x-forwarded-capability', 'kitchen');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(API_ERROR_CODES.CAPABILITY_NOT_ENABLED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 6: SUBDOMAIN CONFUSION, TOKEN FORGERY & DATA LEAKAGE
  // ─────────────────────────────────────────────────────────────
  describe('6. Subdomain Resolution, Token Forgery & Zero Data Leakage', () => {
    it('returns 404 TENANT_NOT_FOUND when accessing non-existent workspace subdomain', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/profile')
        .set('Host', `non-existent-subdomain-${timestamp}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(API_ERROR_CODES.TENANT_NOT_FOUND);
    });

    it('returns 401 AUTH_UNAUTHORIZED when session token is corrupted or malformed', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${alphaSlug}.localhost:4000`)
        .set('Cookie', [`${SESSION_COOKIE_NAME}=malformed.garbage.token`]);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_UNAUTHORIZED);
    });

    it('returns 401 AUTH_UNAUTHORIZED when session token has tampered signature', async () => {
      const validToken = alphaOwnerCookie.split(';')[0].replace(`${SESSION_COOKIE_NAME}=`, '');
      const parts = validToken.split('.');
      if (parts.length === 3) {
        // Tamper signature
        parts[2] = 'tampered_signature_xyz';
        const forgedToken = parts.join('.');

        const res = await request(app.getHttpServer())
          .get('/workspace/members')
          .set('Host', `${alphaSlug}.localhost:4000`)
          .set('Cookie', [`${SESSION_COOKIE_NAME}=${forgedToken}`]);

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe(API_ERROR_CODES.AUTH_UNAUTHORIZED);
      }
    });

    it('ensures zero sensitive data leakage in error responses (Golden Rule 1 & 2)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/profile')
        .set('Host', `${betaSlug}.localhost:4000`)
        .set('Cookie', [alphaOwnerCookie]);

      expect(res.status).toBe(403);
      const resText = JSON.stringify(res.body);

      // Verify no Beta details (slug, name, emails) leaked to Alpha user
      expect(resText).not.toContain(betaSlug);
      expect(resText).not.toContain('Beta Dynamics');
      expect(resText).not.toContain(betaOwnerEmail);
      expect(resText).not.toContain(betaTenantId);
      // Verify no internal stack traces or database info leaked
      expect(resText).not.toContain('prisma');
      expect(resText).not.toContain('SELECT');
      expect(resText).not.toContain('Postgres');
    });
  });
});
