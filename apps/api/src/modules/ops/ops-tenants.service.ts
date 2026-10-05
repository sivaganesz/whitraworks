import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { TenantStatus, Prisma } from '@whitraworks/database';

@Injectable()
export class OpsTenantsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
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

    return {
      success: true,
      message: `Tenant status successfully updated to ${dto.status}`,
      tenant: updated,
    };
  }
}
