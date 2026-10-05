import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAPABILITIES_KEY } from '../decorators/require-capability.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RequestWithTenant } from '../middleware/tenant-resolution.middleware';
import { API_ERROR_CODES } from '@whitraworks/types';

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities = this.reflector.getAllAndOverride<string[]>(
      CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithTenant>();

    if (!req.tenant?.tenantId) {
      throw new BadRequestException({
        code: API_ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Capability verification requires an active workspace domain context.',
      });
    }

    // Query active capability configuration for this tenant
    const enabledConfigs = await this.prisma.base.tenantCapabilityConfig.findMany({
      where: {
        tenantId: req.tenant.tenantId,
        capabilityCode: { in: requiredCapabilities },
        isEnabled: true,
      },
      select: {
        capabilityCode: true,
      },
    });

    const enabledSet = new Set(enabledConfigs.map((c) => c.capabilityCode));

    for (const required of requiredCapabilities) {
      if (!enabledSet.has(required)) {
        throw new ForbiddenException({
          code: API_ERROR_CODES.CAPABILITY_NOT_ENABLED,
          message: `The capability "${required}" is not enabled for this workspace.`,
          details: { missingCapability: required },
        });
      }
    }

    return true;
  }
}

