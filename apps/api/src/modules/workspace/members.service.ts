import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService, SessionPayload } from '../auth/session.service';
import { ListMembersDto } from './dto/list-members.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateWorkspaceProfileDto } from './dto/update-workspace-profile.dto';
import { API_ERROR_CODES, MembershipStatus } from '@whitraworks/types';
import { Prisma } from '@whitraworks/database';


export interface MemberListItem {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: MembershipStatus;
  role: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
}

export interface ListMembersResult {
  items: MemberListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InvitationResult {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  inviteUrl: string;
}

export interface InvitationDetails {
  id: string;
  email: string;
  workspaceName: string;
  workspaceSlug: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  expiresAt: string;
}

export interface AcceptInvitationResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  activeWorkspace: {
    id: string;
    slug: string;
    name: string;
    role: string;
    permissions: string[];
  };
  token: string;
}

@Injectable()
export class MembersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  async listMembers(tenantId: string, query: ListMembersDto): Promise<ListMembersResult> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(query.status ? { status: query.status as MembershipStatus } : {}),
    };

    const [total, members] = await Promise.all([
      this.prisma.base.workspaceMember.count({ where }),
      this.prisma.base.workspaceMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          role: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const items: MemberListItem[] = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      status: m.status,
      role: {
        id: m.role.id,
        code: m.role.code,
        name: m.role.name,
      },
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async inviteMember(
    tenantId: string,
    invitedById: string,
    dto: InviteMemberDto
  ): Promise<InvitationResult> {
    const email = dto.email.toLowerCase().trim();

    // 1. Fetch Tenant
    const tenant = await this.prisma.base.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, status: true },
    });

    if (!tenant) {
      throw new NotFoundException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Workspace not found.',
      });
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.TENANT_SUSPENDED,
        message: 'Workspace is suspended.',
      });
    }

    // 2. Resolve Role
    let role = null;
    if (dto.roleId) {
      role = await this.prisma.base.role.findFirst({
        where: {
          id: dto.roleId,
          OR: [{ tenantId }, { tenantId: null }],
        },
      });
    } else if (dto.roleCode) {
      const code = dto.roleCode.toUpperCase().trim();
      role = await this.prisma.base.role.findFirst({
        where: {
          code,
          OR: [{ tenantId }, { tenantId: null }],
        },
      });
    } else {
      // Default to STAFF
      role = await this.prisma.base.role.findFirst({
        where: {
          code: 'STAFF',
          OR: [{ tenantId }, { tenantId: null }],
        },
      });
    }

    if (!role) {
      throw new BadRequestException({
        code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
        message: 'Specified role was not found for this workspace.',
      });
    }

    if (role.code === 'OWNER') {
      throw new BadRequestException({
        code: 'CANNOT_INVITE_AS_OWNER',
        message: 'Additional OWNER invitations are not permitted. Invite user as ADMIN or STAFF.',
      });
    }

    // 3. Collision / Duplicate Check in this workspace
    const existingUser = await this.prisma.base.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const activeMembership = await this.prisma.base.workspaceMember.findFirst({
        where: {
          tenantId,
          userId: existingUser.id,
          status: 'ACTIVE',
        },
      });

      if (activeMembership) {
        throw new ConflictException({
          code: 'MEMBER_ALREADY_EXISTS',
          message: `User with email "${email}" is already an active member of this workspace.`,
        });
      }
    }

    // 4. Token & Expiration (7 days)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 5. Upsert Invitation record
    const invitation = await this.prisma.base.invitation.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
      update: {
        roleId: role.id,
        token,
        invitedById,
        expiresAt,
        acceptedAt: null,
      },
      create: {
        tenantId,
        email,
        roleId: role.id,
        token,
        invitedById,
        expiresAt,
      },
      include: {
        role: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    const inviteUrl = `https://${tenant.slug}.whitraworks.com/invite/accept?token=${token}`;

    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expiresAt: invitation.expiresAt.toISOString(),
      role: {
        id: invitation.role.id,
        code: invitation.role.code,
        name: invitation.role.name,
      },
      inviteUrl,
    };
  }

  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    const invitation = await this.prisma.base.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: { id: true, slug: true, name: true, status: true },
        },
        role: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException({
        code: API_ERROR_CODES.INVALID_INVITATION_TOKEN,
        message: 'Invalid or unknown invitation token.',
      });
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException({
        code: API_ERROR_CODES.INVITATION_ALREADY_ACCEPTED,
        message: 'This invitation has already been accepted.',
      });
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException({
        code: API_ERROR_CODES.INVITATION_EXPIRED,
        message: 'This invitation has expired. Please request a new invite from an administrator.',
      });
    }

    return {
      id: invitation.id,
      email: invitation.email,
      workspaceName: invitation.tenant.name,
      workspaceSlug: invitation.tenant.slug,
      role: {
        id: invitation.role.id,
        code: invitation.role.code,
        name: invitation.role.name,
      },
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async acceptInvitation(
    dto: AcceptInvitationDto,
    sessionUser?: SessionPayload
  ): Promise<AcceptInvitationResult> {
    const invitation = await this.prisma.base.invitation.findUnique({
      where: { token: dto.token },
      include: {
        tenant: {
          select: { id: true, slug: true, name: true, status: true },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException({
        code: API_ERROR_CODES.INVALID_INVITATION_TOKEN,
        message: 'Invalid or unknown invitation token.',
      });
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException({
        code: API_ERROR_CODES.INVITATION_ALREADY_ACCEPTED,
        message: 'This invitation has already been accepted.',
      });
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException({
        code: API_ERROR_CODES.INVITATION_EXPIRED,
        message: 'This invitation has expired. Please request a new invite.',
      });
    }

    if (invitation.tenant.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.TENANT_SUSPENDED,
        message: 'This workspace is currently suspended.',
      });
    }

    // Determine target user
    let userId: string;
    let userEmail = invitation.email;
    let userFirstName = dto.firstName || '';
    let userLastName = dto.lastName || '';

    if (sessionUser) {
      // Logged in user: email must match invitation email
      if (sessionUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new ForbiddenException({
          code: API_ERROR_CODES.INVITATION_EMAIL_MISMATCH,
          message: `You are signed in as "${sessionUser.email}", but this invitation was sent to "${invitation.email}". Please sign in with the correct account.`,
        });
      }
      userId = sessionUser.userId;

      const user = await this.prisma.base.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        userFirstName = user.firstName;
        userLastName = user.lastName;
      }
    } else {
      // Unauthenticated caller
      const existingUser = await this.prisma.base.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        // Account already exists: verify password
        if (!dto.password) {
          throw new BadRequestException({
            code: 'PASSWORD_REQUIRED',
            message: 'An account already exists for this email. Please enter your password to join this workspace.',
          });
        }

        const validPassword = await this.passwordService.verifyPassword(
          existingUser.passwordHash,
          dto.password
        );

        if (!validPassword) {
          throw new UnauthorizedException({
            code: API_ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid password. Please enter your account password to accept the invitation.',
          });
        }

        userId = existingUser.id;
        userFirstName = existingUser.firstName;
        userLastName = existingUser.lastName;
      } else {
        // New user registration via invite
        if (!dto.password || dto.password.length < 8) {
          throw new BadRequestException({
            code: 'PASSWORD_REQUIRED',
            message: 'Password of at least 8 characters is required to set up your account.',
          });
        }

        const passwordHash = await this.passwordService.hashPassword(dto.password);
        const newUser = await this.prisma.base.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            firstName: (dto.firstName || 'User').trim(),
            lastName: (dto.lastName || '').trim(),
            status: 'ACTIVE',
            isPlatformSuperadmin: false,
          },
        });

        userId = newUser.id;
        userFirstName = newUser.firstName;
        userLastName = newUser.lastName;
      }
    }

    // Atomic transaction: create/activate membership + mark invitation accepted
    await this.prisma.base.$transaction(async (tx) => {
      // Ensure no active membership exists
      const existingMembership = await tx.workspaceMember.findFirst({
        where: {
          tenantId: invitation.tenantId,
          userId,
        },
      });

      if (existingMembership) {
        if (existingMembership.status === 'ACTIVE') {
          throw new ConflictException({
            code: 'MEMBER_ALREADY_EXISTS',
            message: 'You are already an active member of this workspace.',
          });
        }
        // Reactivate existing suspended/invited membership
        await tx.workspaceMember.update({
          where: { id: existingMembership.id },
          data: {
            status: 'ACTIVE',
            roleId: invitation.roleId,
          },
        });
      } else {
        await tx.workspaceMember.create({
          data: {
            tenantId: invitation.tenantId,
            userId,
            roleId: invitation.roleId,
            status: 'ACTIVE',
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
        },
      });
    });

    // Mint session token for target tenant
    const token = this.sessionService.createSessionToken({
      userId,
      email: userEmail,
      isPlatformSuperadmin: false,
      tenantId: invitation.tenant.id,
    });

    const permissions =
      invitation.role.code === 'OWNER'
        ? ['*']
        : invitation.role.permissions.map((p) => p.permission.code);

    return {
      user: {
        id: userId,
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
      },
      activeWorkspace: {
        id: invitation.tenant.id,
        slug: invitation.tenant.slug,
        name: invitation.tenant.name,
        role: invitation.role.code,
        permissions,
      },
      token,
    };
  }

  async removeMember(
    tenantId: string,
    memberId: string,
    _currentUserId: string
  ): Promise<{ message: string }> {
    const member = await this.prisma.base.workspaceMember.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
      include: {
        role: {
          select: { code: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: API_ERROR_CODES.MEMBERSHIP_NOT_FOUND,
        message: 'Workspace member not found.',
      });
    }

    // Invariant: The workspace owner CANNOT be removed or deactivated!
    if (member.role.code === 'OWNER') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.CANNOT_REMOVE_TENANT_OWNER,
        message: 'The workspace owner cannot be removed or deactivated.',
      });
    }

    // Suspend member
    await this.prisma.base.workspaceMember.update({
      where: { id: member.id },
      data: { status: 'SUSPENDED' },
    });

    return {
      message: 'Workspace member deactivated successfully.',
    };
  }

  async getCapabilities(tenantId: string) {
    const configs = await this.prisma.base.tenantCapabilityConfig.findMany({
      where: { tenantId },
      select: {
        capabilityCode: true,
        isEnabled: true,
        configJson: true,
      },
    });

    return configs.map((c) => ({
      code: c.capabilityCode,
      enabled: c.isEnabled,
      config: c.configJson,
    }));
  }

  async getWorkspaceProfile(tenantId: string) {
    const tenant = await this.prisma.base.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        currency: true,
        timezone: true,
        logoUrl: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Workspace not found.',
      });
    }

    return tenant;
  }

  async updateWorkspaceProfile(
    tenantId: string,
    actorId: string,
    dto: UpdateWorkspaceProfileDto
  ) {
    const existingTenant = await this.prisma.base.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      throw new NotFoundException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Workspace not found.',
      });
    }

    const data: Prisma.TenantUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.currency !== undefined) data.currency = dto.currency.toUpperCase();
    if (dto.timezone !== undefined) data.timezone = dto.timezone.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl.trim() || null;
    if (dto.metadata !== undefined) {
      const currentMeta = (existingTenant.metadata as Record<string, unknown>) || {};
      data.metadata = { ...currentMeta, ...dto.metadata } as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.base.tenant.update({
      where: { id: tenantId },
      data,
    });

    // Immutable audit trail logging (Golden Rule 2)
    await this.prisma.base.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: 'workspace.profile.update',
        entityType: 'Tenant',
        entityId: tenantId,
        diffJson: {
          before: {
            name: existingTenant.name,
            currency: existingTenant.currency,
            timezone: existingTenant.timezone,
            logoUrl: existingTenant.logoUrl,
            metadata: existingTenant.metadata,
          },
          after: {
            name: updated.name,
            currency: updated.currency,
            timezone: updated.timezone,
            logoUrl: updated.logoUrl,
            metadata: updated.metadata,
          },
        },
      },
    });

    return updated;
  }
}

