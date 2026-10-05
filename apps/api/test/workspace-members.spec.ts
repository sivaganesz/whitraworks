import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { SESSION_COOKIE_NAME } from '../src/modules/auth/session.service';

describe('Workspace Memberships, RBAC & Capabilities (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testTenantSlug = `member-test-${Date.now()}`;
  const ownerEmail = `owner-${Date.now()}@example.com`;
  const ownerPassword = 'OwnerPassword123!';
  let ownerCookie: string;
  let staffCookie: string;
  let ownerMemberId: string;
  let staffMemberId: string;
  let inviteToken: string;
  const staffEmail = `staff-${Date.now()}@example.com`;
  const staffPassword = 'StaffPassword123!';

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

    // Register a fresh test workspace
    const regRes = await request(app.getHttpServer())
      .post('/public/register')
      .set('Host', 'localhost:4000')
      .send({
        email: ownerEmail,
        password: ownerPassword,
        firstName: 'Owner',
        lastName: 'Tester',
        businessName: 'Member Testing Co',
        slug: testTenantSlug,
      });

    expect(regRes.status).toBe(201);

    // Log in as owner on test tenant domain
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Host', `${testTenantSlug}.localhost:4000`)
      .send({
        email: ownerEmail,
        password: ownerPassword,
      });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    ownerCookie = Array.isArray(cookies) ? cookies.find((c: string) => c.includes(SESSION_COOKIE_NAME))! : cookies;
  });

  afterAll(async () => {
    try {
      const tenant = await prisma.base.tenant.findUnique({
        where: { slug: testTenantSlug },
      });
      if (tenant) {
        await prisma.base.tenant.delete({ where: { id: tenant.id } });
      }
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  describe('1. Member Listing', () => {
    it('rejects unauthenticated member listing with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${testTenantSlug}.localhost:4000`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns workspace member list containing the initial owner', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].email).toBe(ownerEmail);
      expect(res.body.data.items[0].role.code).toBe('OWNER');
      ownerMemberId = res.body.data.items[0].id;
    });
  });

  describe('2. Member Invitation Lifecycle', () => {
    it('disallows inviting an additional OWNER role', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie])
        .send({
          email: 'anotherowner@example.com',
          roleCode: 'OWNER',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_INVITE_AS_OWNER');
    });

    it('successfully invites a new STAFF member and issues invite token', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie])
        .send({
          email: staffEmail,
          roleCode: 'STAFF',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(staffEmail);
      expect(res.body.data.role.code).toBe('STAFF');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.inviteUrl).toContain(res.body.data.token);
      inviteToken = res.body.data.token;
    });

    it('allows public inspection of valid invitation details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspace/invitations/${inviteToken}`)
        .set('Host', 'localhost:4000');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(staffEmail);
      expect(res.body.data.workspaceSlug).toBe(testTenantSlug);
      expect(res.body.data.role.code).toBe('STAFF');
    });

    it('rejects public inspection of non-existent token with 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/invitations/invalid-nonexistent-token')
        .set('Host', 'localhost:4000');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INVALID_INVITATION_TOKEN');
    });
  });

  describe('3. Invitation Acceptance & Scenario A Invariant', () => {
    it('successfully accepts invitation and joins workspace as STAFF', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/invitations/accept')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .send({
          token: inviteToken,
          password: staffPassword,
          firstName: 'Staff',
          lastName: 'Member',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(staffEmail);
      expect(res.body.data.activeWorkspace.role).toBe('STAFF');

      // Verify host-only cookie was issued
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain(SESSION_COOKIE_NAME);
      expect(cookieStr.toLowerCase()).not.toContain('domain=');
      staffCookie = Array.isArray(cookies) ? cookies.find((c: string) => c.includes(SESSION_COOKIE_NAME))! : cookies;
    });

    it('rejects re-accepting an already accepted invitation', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/invitations/accept')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .send({
          token: inviteToken,
          password: staffPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVITATION_ALREADY_ACCEPTED');
    });

    it('rejects inviting a user who is already an active member', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie])
        .send({
          email: staffEmail,
          roleCode: 'STAFF',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MEMBER_ALREADY_EXISTS');
    });

    it('shows both OWNER and STAFF in member list now', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      const staffMember = res.body.data.items.find((m: any) => m.email === staffEmail);
      expect(staffMember).toBeDefined();
      expect(staffMember.role.code).toBe('STAFF');
      staffMemberId = staffMember.id;
    });
  });

  describe('4. RBAC Permission Enforcement (TenantRbacGuard)', () => {
    it('allows STAFF to read members (granted members:read)', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [staffCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('blocks STAFF from inviting members (lacks members:invite) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/workspace/members/invite')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [staffCookie])
        .send({
          email: 'unauthorized-invitee@example.com',
          roleCode: 'STAFF',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
    });
  });

  describe('5. Capability Engine Enforcement (CapabilityGuard)', () => {
    it('blocks access to disabled capability (kitchen) with 403 CAPABILITY_NOT_ENABLED', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CAPABILITY_NOT_ENABLED');
    });

    it('grants access when capability is enabled in database', async () => {
      const tenant = await prisma.base.tenant.findUnique({
        where: { slug: testTenantSlug },
      });

      // Enable kitchen capability
      await prisma.base.tenantCapabilityConfig.upsert({
        where: {
          tenantId_capabilityCode: {
            tenantId: tenant!.id,
            capabilityCode: 'kitchen',
          },
        },
        update: { isEnabled: true },
        create: {
          tenantId: tenant!.id,
          capabilityCode: 'kitchen',
          isEnabled: true,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/workspace/test-kitchen')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('kitchen_active');
    });
  });

  describe('6. Workspace Switcher Verification', () => {
    it('allows switching to permitted workspace', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [staffCookie])
        .send({ targetTenantSlug: testTenantSlug });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.redirectUrl).toContain(testTenantSlug);
    });

    it('rejects switching to workspace where user has no membership', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [staffCookie])
        .send({ targetTenantSlug: 'unauthorized-workspace-xyz' });

      expect(res.status).toBe(404);
    });
  });

  describe('7. Member Deactivation & Owner Protection Invariant', () => {
    it('prevents removing or deactivating the workspace OWNER', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/members/${ownerMemberId}`)
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANNOT_REMOVE_TENANT_OWNER');
    });

    it('successfully deactivates/suspends a STAFF member', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/workspace/members/${staffMemberId}`)
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Workspace member deactivated successfully.');

      // Verify member status is now SUSPENDED
      const listRes = await request(app.getHttpServer())
        .get('/workspace/members')
        .set('Host', `${testTenantSlug}.localhost:4000`)
        .set('Cookie', [ownerCookie]);

      const updatedStaff = listRes.body.data.items.find((m: any) => m.id === staffMemberId);
      expect(updatedStaff.status).toBe('SUSPENDED');
    });
  });
});

