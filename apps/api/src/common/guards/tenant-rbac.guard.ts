import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RequestWithTenant } from '../middleware/tenant-resolution.middleware';
import { AuthenticatedRequest } from './auth.guard';
import { API_ERROR_CODES } from '@whitraworks/types';

@Injectable()
export class TenantRbacGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithTenant & AuthenticatedRequest>();

    if (!req.user) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Authentication session required.',
      });
    }

    if (!req.tenant?.tenantId) {
      throw new BadRequestException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Operation requires a valid workspace domain context.',
      });
    }

    // Query active membership with assigned role permissions
    const member = await this.prisma.base.workspaceMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: req.tenant.tenantId,
          userId: req.user.userId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: API_ERROR_CODES.AUTH_FORBIDDEN,
        message: 'You do not have an active membership in this workspace.',
      });
    }

    // OWNER has unrestricted access
    if (member.role.code === 'OWNER') {
      return true;
    }

    // Extract granted permission codes
    const grantedCodes = new Set<string>(
      member.role.permissions.map((p) => p.permission.code)
    );

    // Verify all required permissions are granted
    const missingPermissions = requiredPermissions.filter(
      (perm) => !grantedCodes.has(perm) && !grantedCodes.has('*')
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException({
        code: API_ERROR_CODES.AUTH_FORBIDDEN,
        message: 'You do not have the required permissions for this action.',
        details: { missingPermissions },
      });
    }

    return true;
  }
}

