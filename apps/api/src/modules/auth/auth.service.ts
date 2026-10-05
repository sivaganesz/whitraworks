import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { LoginDto } from './dto/login.dto';
import { API_ERROR_CODES, TenantContext } from '@whitraworks/types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  async login(
    dto: LoginDto,
    tenantContext?: TenantContext,
    isControlPlane?: boolean
  ) {
    const email = dto.email.toLowerCase().trim();

    // 1. Find user by unique email
    const user = await this.prisma.base.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email address or password.',
      });
    }

    // 2. Verify password with Argon2id
    const isValid = await this.passwordService.verifyPassword(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email address or password.',
      });
    }

    // 3. User status gate
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.AUTH_FORBIDDEN,
        message: 'Your account is suspended. Please contact support.',
      });
    }

    // 4. Control Plane Gate (Root Ops Admin)
    if (isControlPlane) {
      if (!user.isPlatformSuperadmin) {
        throw new ForbiddenException({
          code: API_ERROR_CODES.AUTH_FORBIDDEN,
          message: 'Access denied: Platform operator privileges required.',
        });
      }

      await this.prisma.base.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = this.sessionService.createSessionToken({
        userId: user.id,
        email: user.email,
        isPlatformSuperadmin: true,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isPlatformSuperadmin: true,
        },
        token,
      };
    }

    // 5. Tenant Data Plane Gate (<slug>.*)
    if (!tenantContext) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: 'No tenant context identified for this login request.',
      });
    }

    // Query user membership for this specific tenant
    const member = await this.prisma.base.workspaceMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenantContext.tenantId,
          userId: user.id,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        tenant: true,
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.MEMBERSHIP_NOT_FOUND,
        message: `You are not an active member of workspace "${tenantContext.name}".`,
      });
    }

    await this.prisma.base.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.sessionService.createSessionToken({
      userId: user.id,
      email: user.email,
      isPlatformSuperadmin: user.isPlatformSuperadmin,
      tenantId: tenantContext.tenantId,
    });

    const permissions = member.role.permissions.map((p) => p.permission.code);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformSuperadmin: user.isPlatformSuperadmin,
      },
      activeWorkspace: {
        id: member.tenant.id,
        slug: member.tenant.slug,
        name: member.tenant.name,
        role: member.role.code,
        permissions,
      },
      token,
    };
  }

  async getSessionProfile(userId: string, activeTenantId?: string) {
    const user = await this.prisma.base.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: true,
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
        message: 'User profile not found.',
      });
    }

    const availableWorkspaces = user.memberships.map((m) => ({
      id: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
      role: m.role.code,
    }));

    let activeWorkspace = null;
    if (activeTenantId) {
      const activeMembership = user.memberships.find((m) => m.tenantId === activeTenantId);
      if (activeMembership) {
        activeWorkspace = {
          id: activeMembership.tenant.id,
          slug: activeMembership.tenant.slug,
          name: activeMembership.tenant.name,
          role: activeMembership.role.code,
          permissions: activeMembership.role.permissions.map((p) => p.permission.code),
        };
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformSuperadmin: user.isPlatformSuperadmin,
        status: user.status,
      },
      activeWorkspace,
      availableWorkspaces,
    };
  }

  async switchWorkspace(userId: string, targetTenantSlug: string) {
    const tenant = await this.prisma.base.tenant.findUnique({
      where: { slug: targetTenantSlug },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: `Target workspace "${targetTenantSlug}" does not exist or is suspended.`,
      });
    }

    const member = await this.prisma.base.workspaceMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId,
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.MEMBERSHIP_NOT_FOUND,
        message: `You do not have active access to workspace "${targetTenantSlug}". Access is invite-only.`,
      });
    }

    const isProd = process.env['NODE_ENV'] === 'production';
    const redirectUrl = isProd
      ? `https://${tenant.slug}.whitraworks.com`
      : `http://${tenant.slug}.localhost:3000`;

    return { redirectUrl };
  }
}
