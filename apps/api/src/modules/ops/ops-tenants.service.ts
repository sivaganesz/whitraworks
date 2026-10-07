import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateTenantCapabilitiesDto } from './dto/update-tenant-capabilities.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { TenantStatus, Prisma } from '@whitraworks/database';
import { CAPABILITY_REGISTRY } from '@whitraworks/types';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../auth/session.service';

@Injectable()
export class OpsTenantsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  async listTenants(dto: ListTenantsDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {};

    if (dto.status && dto.status !== 'ALL') {
      where.status = dto.status as TenantStatus;
    }

    if (dto.search && dto.search.trim()) {
      const search = dto.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.base.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: { where: { status: 'ACTIVE' } },
              capabilities: { where: { isEnabled: true } },
            },
          },
        },
      }),
      this.prisma.base.tenant.count({ where }),
    ]);

    const items = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      currency: t.currency,
      timezone: t.timezone,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      memberCount: t._count.members,
      activeCapabilitiesCount: t._count.capabilities,
    }));

    return {
      tenants: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateStatus(
    tenantId: string,
    dto: UpdateTenantStatusDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!dto.reason || typeof dto.reason !== 'string' || dto.reason.trim().length < 3) {
      throw new BadRequestException({
        code: 'INVALID_AUDIT_REASON',
        message: 'A mandatory audit reason of at least 3 characters is required.',
      });
    }

    if (!['ACTIVE', 'SUSPENDED'].includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: 'Target status must be either ACTIVE or SUSPENDED.',
      });
    }

    const tenant = await this.prisma.base.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: `Tenant with ID ${tenantId} was not found.`,
      });
    }

    const updated = await this.prisma.base.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: dto.status as TenantStatus },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: dto.status === 'SUSPENDED' ? 'tenant.suspend' : 'tenant.activate',
          entityType: 'Tenant',
          entityId: tenantId,
          diffJson: {
            previousStatus: tenant.status,
            newStatus: dto.status,
            reason: dto.reason,
          },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });

      return updatedTenant;
    });

    // Invalidate distributed Redis cache immediately so changes take effect across all nodes
    await this.redis.invalidateTenant(tenant.slug);

    // Invalidate all active sessions for this workspace if suspended, or clear if reactivated
    if (dto.status === 'SUSPENDED') {
      await this.sessionService.invalidateTenantSessions(tenantId);
    } else if (dto.status === 'ACTIVE') {
      await this.sessionService.clearTenantSessionInvalidation(tenantId);
    }

    return {
      success: true,
      message: `Tenant status successfully updated to ${dto.status}`,
      tenant: updated,
    };
  }

  async getTenantCapabilities(tenantId: string) {
    const tenant = await this.prisma.base.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: `Tenant with ID ${tenantId} was not found.`,
      });
    }

    const configs = await this.prisma.base.tenantCapabilityConfig.findMany({
      where: { tenantId },
    });

    const configMap = new Map(configs.map((c) => [c.capabilityCode, c.isEnabled]));

    const capabilities = Object.values(CAPABILITY_REGISTRY).map((def) => ({
      code: def.code,
      name: def.name,
      description: def.description,
      category: def.category,
      dependencies: def.dependencies,
      isEnabled: configMap.has(def.code) ? configMap.get(def.code)! : def.defaultEnabled,
    }));

    return {
      tenantId,
      capabilities,
    };
  }

  async updateTenantCapabilities(
    tenantId: string,
    dto: UpdateTenantCapabilitiesDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tenant = await this.prisma.base.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: `Tenant with ID ${tenantId} was not found.`,
      });
    }

    // 1. Validate capability codes against registry
    for (const code of Object.keys(dto.capabilities)) {
      if (!CAPABILITY_REGISTRY[code]) {
        throw new BadRequestException({
          code: 'UNKNOWN_CAPABILITY',
          message: `Unknown capability code "${code}".`,
        });
      }
    }

    // 2. Fetch current configurations to compute projected state
    const currentConfigs = await this.prisma.base.tenantCapabilityConfig.findMany({
      where: { tenantId },
    });
    const stateMap: Record<string, boolean> = {};
    for (const def of Object.values(CAPABILITY_REGISTRY)) {
      stateMap[def.code] = def.defaultEnabled;
    }
    for (const cfg of currentConfigs) {
      stateMap[cfg.capabilityCode] = cfg.isEnabled;
    }

    // Apply incoming changes
    for (const [code, isEnabled] of Object.entries(dto.capabilities)) {
      stateMap[code] = Boolean(isEnabled);
    }

    // 3. Enforce Golden Rule 3: Capability Engine Dependency Validation
    for (const [code, isEnabled] of Object.entries(stateMap)) {
      if (isEnabled) {
        const def = CAPABILITY_REGISTRY[code];
        if (def && def.dependencies) {
          for (const dep of def.dependencies) {
            if (!stateMap[dep]) {
              const depName = CAPABILITY_REGISTRY[dep]?.name || dep;
              throw new BadRequestException({
                code: 'CAPABILITY_DEPENDENCY_ERROR',
                message: `Cannot enable "${def.name}" (${code}) because required dependency "${depName}" (${dep}) is not enabled.`,
              });
            }
          }
        }
      }
    }

    // 4. Atomic transaction updating database and logging audit event
    await this.prisma.base.$transaction(async (tx) => {
      for (const [code, isEnabled] of Object.entries(dto.capabilities)) {
        await tx.tenantCapabilityConfig.upsert({
          where: {
            tenantId_capabilityCode: {
              tenantId,
              capabilityCode: code,
            },
          },
          create: {
            tenantId,
            capabilityCode: code,
            isEnabled,
          },
          update: {
            isEnabled,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'tenant.capabilities.update',
          entityType: 'Capability',
          entityId: tenantId,
          diffJson: {
            updatedCapabilities: dto.capabilities,
          },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    });

    return {
      success: true,
      message: 'Tenant capabilities updated successfully.',
      data: await this.getTenantCapabilities(tenantId),
    };
  }

  async getOverviewMetrics() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      provisioningTenants,
      totalUsers,
      totalMembers,
      recentAudits,
    ] = await Promise.all([
      this.prisma.base.tenant.count(),
      this.prisma.base.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.base.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.base.tenant.count({ where: { status: 'PROVISIONING' } }),
      this.prisma.base.user.count(),
      this.prisma.base.workspaceMember.count({ where: { status: 'ACTIVE' } }),
      this.prisma.base.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return {
      metrics: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        provisioningTenants,
        totalUsers,
        totalMembers,
      },
      systemHealth: {
        database: 'HEALTHY',
        redis: 'HEALTHY',
        controlPlane: 'HEALTHY',
      },
      recentActivity: recentAudits,
    };
  }

  async listAuditLogs(dto: ListAuditLogsDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 15;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (dto.action && dto.action.trim()) {
      where.action = dto.action.trim();
    }

    if (dto.entityType && dto.entityType.trim()) {
      where.entityType = dto.entityType.trim();
    }

    if (dto.tenantId && dto.tenantId.trim()) {
      where.tenantId = dto.tenantId.trim();
    }

    if (dto.search && dto.search.trim()) {
      const search = dto.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { actor: { email: { contains: search, mode: 'insensitive' } } },
        { tenant: { slug: { contains: search, mode: 'insensitive' } } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.base.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isPlatformSuperadmin: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.base.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

