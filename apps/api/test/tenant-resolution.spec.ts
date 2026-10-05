import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Req } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RequestWithTenant } from '../src/common/middleware/tenant-resolution.middleware';
import { API_ERROR_CODES } from '@whitraworks/types';

@Controller('test-context')
class TestContextController {
  @Get()
  getContext(@Req() req: RequestWithTenant) {
    return {
      isControlPlane: req.isControlPlane || false,
      tenant: req.tenant || null,
    };
  }
}

describe('TenantResolutionMiddleware (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const activeSlug = 'test-hotel-active';
  const suspendedSlug = 'test-hotel-suspended';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestContextController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up & seed test tenants
    await prisma.base.tenant.deleteMany({
      where: { slug: { in: [activeSlug, suspendedSlug] } },
    });

    await prisma.base.tenant.create({
      data: {
        slug: activeSlug,
        name: 'Test Hotel Active',
        status: 'ACTIVE',
      },
    });

    await prisma.base.tenant.create({
      data: {
        slug: suspendedSlug,
        name: 'Test Hotel Suspended',
        status: 'SUSPENDED',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.base.tenant.deleteMany({
        where: { slug: { in: [activeSlug, suspendedSlug] } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('1. Control Plane: resolves ops.localhost with isControlPlane = true', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-context')
      .set('Host', 'ops.localhost:4000');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isControlPlane).toBe(true);
    expect(res.body.data.tenant).toBeNull();
  });

  it('2. Active Tenant: resolves valid tenant and attaches context', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-context')
      .set('Host', `${activeSlug}.localhost:4000`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isControlPlane).toBe(false);
    expect(res.body.data.tenant).toBeDefined();
    expect(res.body.data.tenant.slug).toBe(activeSlug);
    expect(res.body.data.tenant.status).toBe('ACTIVE');
  });

  it('3. Unknown Tenant: returns 404 with TENANT_NOT_FOUND code', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-context')
      .set('Host', 'non-existent-workspace.localhost:4000');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(API_ERROR_CODES.TENANT_NOT_FOUND);
  });

  it('4. Suspended Tenant: returns 403 with TENANT_SUSPENDED code', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-context')
      .set('Host', `${suspendedSlug}.localhost:4000`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(API_ERROR_CODES.TENANT_SUSPENDED);
  });
});
