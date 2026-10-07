import {
  Injectable,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { RegisterDto } from './dto/register.dto';
import { API_ERROR_CODES, RESERVED_SLUGS, CAPABILITY_REGISTRY } from '@whitraworks/types';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RegistrationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  async checkSlug(rawSlug: string) {
    const slug = rawSlug.toLowerCase().trim();

    // 1. Check platform reserved words
    if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
      return {
        slug,
        available: false,
        reason: 'RESERVED',
      };
    }

    // 2. Check collision in PostgreSQL
    const existingTenant = await this.prisma.base.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingTenant) {
      return {
        slug,
        available: false,
        reason: 'TAKEN',
      };
    }

    return {
      slug,
      available: true,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const slug = dto.slug.toLowerCase().trim();
    const isProd = process.env['NODE_ENV'] === 'production';

    // ─────────────────────────────────────────────────────────────
    // 1. SCENARIO A COLLISION GUARDRAIL: ONE USER = ONE WORKSPACE
    // ─────────────────────────────────────────────────────────────
    const existingUser = await this.prisma.base.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (existingUser) {
      const existingMembership = existingUser.memberships[0];
      const existingSlug = existingMembership?.tenant.slug || 'app';
      const signInUrl = isProd
        ? `https://${existingSlug}.whitraworks.com/login`
        : `http://${existingSlug}.localhost:3000/login`;

      throw new ConflictException({
        code: API_ERROR_CODES.EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE,
        message: `This email address is already associated with a workspace: ${existingSlug}.whitraworks.com. Please sign in to your account to continue.`,
        details: {
          existingWorkspaceSlug: existingSlug,
          signInUrl,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SUBDOMAIN SLUG RESERVED & COLLISION CHECKS
    // ─────────────────────────────────────────────────────────────
    if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
      throw new BadRequestException({
        code: API_ERROR_CODES.SLUG_RESERVED,
        message: `The subdomain "${slug}" is reserved for platform infrastructure.`,
        details: { slug },
      });
    }

    const existingTenant = await this.prisma.base.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingTenant) {
      throw new ConflictException({
        code: API_ERROR_CODES.SLUG_ALREADY_TAKEN,
        message: `The workspace address "${slug}" is already taken. Please choose another.`,
        details: { slug },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ATOMIC TRANSACTION: USER + TENANT + OWNER MEMBERSHIP
    // ─────────────────────────────────────────────────────────────
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    const result = await this.prisma.base.$transaction(async (tx) => {
      // 3.1 Create User
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          isPlatformSuperadmin: false,
          status: 'ACTIVE',
        },
      });

      // 3.2 Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: dto.businessName.trim(),
          status: 'ACTIVE',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        },
      });

      // 3.3 Create OWNER System Role for this tenant
      const allPermissions = await tx.permission.findMany({ select: { id: true } });

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          code: 'OWNER',
          name: 'Owner',
          description: 'Full workspace ownership and billing privileges',
          isSystemRole: true,
          permissions: {
            create: allPermissions.map((p) => ({
              permissionId: p.id,
            })),
          },
        },
      });

      // 3.4 Create Workspace Membership with OWNER Role
      await tx.workspaceMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: 'ACTIVE',
        },
      });

      // 3.5 Provision Default Capabilities (catalog, orders enabled by default)
      const defaultCapabilityCodes = Object.entries(CAPABILITY_REGISTRY)
        .filter(([_, cap]) => cap.defaultEnabled)
        .map(([code]) => code);

      for (const capCode of defaultCapabilityCodes) {
        await tx.tenantCapabilityConfig.create({
          data: {
            tenantId: tenant.id,
            capabilityCode: capCode,
            isEnabled: true,
            configJson: {},
          },
        });
      }

      return { user, tenant };
    });

    const workspaceUrl = isProd
      ? `https://${result.tenant.slug}.whitraworks.com`
      : `http://${result.tenant.slug}.localhost:3000`;

    // 3.6 Mint Host-Scoped Session Token for the newly created tenant
    const token = this.sessionService.createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      isPlatformSuperadmin: false,
      tenantId: result.tenant.id,
    });

    // 3.7 Prime Redis cache with the newly registered tenant
    await this.redis.setCachedTenant(result.tenant.slug, {
      id: result.tenant.id,
      slug: result.tenant.slug,
      name: result.tenant.name,
      status: 'ACTIVE',
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        workspaceUrl,
      },
      token,
    };
  }
}
