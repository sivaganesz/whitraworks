import {
  Injectable,
  NestMiddleware,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { runWithTenantContext } from '@whitraworks/database';
import { API_ERROR_CODES, TenantContext } from '@whitraworks/types';
import { PrismaService } from '../../modules/prisma/prisma.service';

export interface RequestWithTenant extends Request {
  tenant?: TenantContext;
  isControlPlane?: boolean;
}

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async use(req: RequestWithTenant, _res: Response, next: NextFunction): Promise<void> {
    const path = req.path;

    // Fast-path bypass for health checks, API docs, and public registration routes
    const isExemptPath =
      path.startsWith('/health') ||
      path.startsWith('/api/docs') ||
      path.startsWith('/public');

    const hostHeader = (req.headers['x-forwarded-host'] || req.headers['host'] || '') as string;
    const hostname = hostHeader.split(':')[0]?.toLowerCase() || '';

    // Extract subdomain
    const slug = this.extractSubdomain(hostname, req);

    // 1. Control Plane (ops.whitraworks.com or ops.localhost)
    if (slug === 'ops') {
      req.isControlPlane = true;
      return next();
    }

    // 2. No subdomain or root api domain
    if (!slug || slug === 'api' || slug === 'www' || slug === 'localhost') {
      if (isExemptPath) {
        return next();
      }
      // If a non-exempt endpoint was accessed without a workspace subdomain
      return next();
    }

    // 3. Resolve Tenant Data Plane (<slug>.localhost or <slug>.whitraworks.com)
    try {
      const tenant = await this.prisma.base.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
        },
      });

      if (!tenant) {
        if (isExemptPath) {
          return next();
        }
        throw new NotFoundException({
          code: API_ERROR_CODES.TENANT_NOT_FOUND,
          message: `Workspace "${slug}" does not exist. Please check the URL.`,
          details: { requestedSlug: slug },
        });
      }

      if (tenant.status === 'SUSPENDED') {
        throw new ForbiddenException({
          code: API_ERROR_CODES.TENANT_SUSPENDED,
          message: `Workspace "${tenant.name}" (${slug}) is currently suspended. Please contact platform support.`,
          details: { slug, status: tenant.status },
        });
      }

      if (tenant.status === 'TERMINATED') {
        throw new ForbiddenException({
          code: API_ERROR_CODES.TENANT_SUSPENDED,
          message: `Workspace "${tenant.name}" (${slug}) has been terminated.`,
          details: { slug, status: tenant.status },
        });
      }

      // Populate request context
      req.tenant = {
        tenantId: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
      };

      // Wrap downstream request pipeline in AsyncLocalStorage tenant isolation context
      runWithTenantContext({ tenantId: tenant.id }, () => {
        next();
      });
    } catch (err) {
      next(err);
    }
  }

  private extractSubdomain(hostname: string, req: Request): string | null {
    // Check developer override header for local testing/curl
    const headerSlug = (req.headers['x-tenant-slug'] as string)?.toLowerCase();
    if (headerSlug) {
      return headerSlug;
    }

    // Development: <slug>.localhost
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2 && parts[0]) {
        return parts[0];
      }
    }

    // Production: <slug>.whitraworks.com
    const rootDomain = process.env['ROOT_DOMAIN'] || 'whitraworks.com';
    if (hostname.endsWith(`.${rootDomain}`)) {
      const subparts = hostname.replace(`.${rootDomain}`, '').split('.');
      if (subparts.length >= 1 && subparts[0]) {
        return subparts[0];
      }
    }

    return null;
  }
}
