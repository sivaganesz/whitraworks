import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPERADMIN_KEY } from '../decorators/require-superadmin.decorator';
import { RequestWithTenant } from '../middleware/tenant-resolution.middleware';
import { AuthenticatedRequest } from './auth.guard';
import { API_ERROR_CODES } from '@whitraworks/types';

@Injectable()
export class PlatformSuperadminGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isSuperadminRequired = this.reflector.getAllAndOverride<boolean>(
      SUPERADMIN_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!isSuperadminRequired) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithTenant & AuthenticatedRequest>();

    if (!req.user) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Platform superadmin session required.',
      });
    }

    // Golden Rule 6: Two-Tier Privilege Orthogonality
    // Must be platform superadmin AND issued from ops control plane
    if (!req.user.isPlatformSuperadmin) {
      throw new ForbiddenException({
        code: API_ERROR_CODES.AUTH_FORBIDDEN,
        message: 'Access restricted to Root Platform Superadmins.',
      });
    }

    return true;
  }
}

