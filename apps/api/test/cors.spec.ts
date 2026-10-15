import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Controller,
  Get,
  Module,
  INestApplication,
  UseGuards,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  isAllowedOrigin,
  corsOptions,
  ALLOWED_ORIGIN_PATTERNS,
} from '../src/common/config/cors.config';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['authorization']) {
      throw new UnauthorizedException('Authentication token required');
    }
    return true;
  }
}

@Controller('test-cors')
class TestCorsController {
  @Get()
  getHello() {
    return { status: 'ok' };
  }

  @Get('protected')
  @UseGuards(MockAuthGuard)
  getProtected() {
    return { secret: 'authenticated-data' };
  }
}

@Module({
  controllers: [TestCorsController],
})
class TestCorsModule {}

describe('CORS Origin Validation (Unit & NestJS Integration)', () => {
  describe('isAllowedOrigin unit validation', () => {
    it('allows requests without an Origin header (server-to-server, curl, mobile native)', () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
      expect(isAllowedOrigin('')).toBe(true);
    });

    describe('Staging origins under whitraworks.online', () => {
      it('allows operations dashboard: https://ops.stage.whitraworks.online', () => {
        expect(isAllowedOrigin('https://ops.stage.whitraworks.online')).toBe(true);
      });

      it('allows tenant workspace: https://demo.stage.whitraworks.online', () => {
        expect(isAllowedOrigin('https://demo.stage.whitraworks.online')).toBe(true);
      });

      it('allows arbitrary tenant subdomains under stage: https://tenant-abc.stage.whitraworks.online', () => {
        expect(isAllowedOrigin('https://tenant-abc.stage.whitraworks.online')).toBe(true);
      });

      it('allows staging apex domain: https://stage.whitraworks.online', () => {
        expect(isAllowedOrigin('https://stage.whitraworks.online')).toBe(true);
      });

      it('allows production apex and subdomains under whitraworks.online', () => {
        expect(isAllowedOrigin('https://whitraworks.online')).toBe(true);
        expect(isAllowedOrigin('https://ops.whitraworks.online')).toBe(true);
        expect(isAllowedOrigin('https://demo.whitraworks.online')).toBe(true);
      });
    });

    describe('Disallowed legacy domains', () => {
      it('rejects legacy whitraworks.com origins (apex and subdomains)', () => {
        expect(isAllowedOrigin('https://whitraworks.com')).toBe(false);
        expect(isAllowedOrigin('https://ops.whitraworks.com')).toBe(false);
        expect(isAllowedOrigin('https://demo.whitraworks.com')).toBe(false);
      });
    });

    describe('Local development origins under localhost', () => {
      it('allows localhost with port: http://localhost:3000', () => {
        expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
        expect(isAllowedOrigin('http://localhost:4000')).toBe(true);
      });

      it('allows localhost subdomains with port: http://ops.localhost:3001', () => {
        expect(isAllowedOrigin('http://ops.localhost:3001')).toBe(true);
      });

      it('allows tenant subdomains on localhost: http://demo.localhost:3000', () => {
        expect(isAllowedOrigin('http://demo.localhost:3000')).toBe(true);
      });
    });

    describe('Disallowed & Deceptive Origins (Security Boundaries)', () => {
      it('rejects unrelated public origins: https://evil.example.com', () => {
        expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
        expect(isAllowedOrigin('https://google.com')).toBe(false);
      });

      it('rejects deceptive domain suffixes: https://whitraworks.online.evil.example', () => {
        expect(isAllowedOrigin('https://whitraworks.online.evil.example')).toBe(false);
      });

      it('rejects deceptive domain suffixes: https://whitraworks.com.evil.example', () => {
        expect(isAllowedOrigin('https://whitraworks.com.evil.example')).toBe(false);
      });

      it('rejects hyphenated deceptive prefixes: https://evil-whitraworks.online', () => {
        expect(isAllowedOrigin('https://evil-whitraworks.online')).toBe(false);
      });

      it('rejects hyphenated deceptive prefixes: https://evil-whitraworks.com', () => {
        expect(isAllowedOrigin('https://evil-whitraworks.com')).toBe(false);
      });

      it('rejects unencrypted HTTP on public domains: http://ops.stage.whitraworks.online', () => {
        expect(isAllowedOrigin('http://ops.stage.whitraworks.online')).toBe(false);
      });

      it('rejects unencrypted HTTP on public domains: http://whitraworks.online', () => {
        expect(isAllowedOrigin('http://whitraworks.online')).toBe(false);
      });

      it('rejects unencrypted HTTP on public domains: http://whitraworks.com', () => {
        expect(isAllowedOrigin('http://whitraworks.com')).toBe(false);
      });

      it('rejects arbitrary nested subdomains: https://foo.bar.whitraworks.com', () => {
        expect(isAllowedOrigin('https://foo.bar.whitraworks.com')).toBe(false);
      });

      it('rejects arbitrary nested subdomains: https://foo.bar.stage.whitraworks.online', () => {
        expect(isAllowedOrigin('https://foo.bar.stage.whitraworks.online')).toBe(false);
      });

      it('rejects arbitrary nested subdomains: https://foo.bar.whitraworks.online', () => {
        expect(isAllowedOrigin('https://foo.bar.whitraworks.online')).toBe(false);
      });

      it('rejects arbitrary nested subdomains on localhost: http://foo.bar.localhost:3000', () => {
        expect(isAllowedOrigin('http://foo.bar.localhost:3000')).toBe(false);
      });
    });
  });

  describe('corsOptions callback verification', () => {
    function invokeOriginCallback(origin: string | undefined): Promise<boolean> {
      return new Promise((resolve, reject) => {
        const originFn = corsOptions.origin as (
          orig: string | undefined,
          cb: (err: Error | null, allow?: boolean) => void
        ) => void;
        originFn(origin, (err, allow) => {
          if (err) return reject(err);
          resolve(Boolean(allow));
        });
      });
    }

    it('resolves true for allowed origins', async () => {
      await expect(invokeOriginCallback('https://ops.stage.whitraworks.online')).resolves.toBe(true);
      await expect(invokeOriginCallback('https://demo.stage.whitraworks.online')).resolves.toBe(true);
      await expect(invokeOriginCallback('https://ops.whitraworks.online')).resolves.toBe(true);
      await expect(invokeOriginCallback('http://ops.localhost:3001')).resolves.toBe(true);
      await expect(invokeOriginCallback(undefined)).resolves.toBe(true);
    });

    it('resolves false (without throwing) for disallowed origins', async () => {
      await expect(invokeOriginCallback('https://evil.example.com')).resolves.toBe(false);
      await expect(invokeOriginCallback('https://ops.whitraworks.com')).resolves.toBe(false);
      await expect(invokeOriginCallback('https://whitraworks.online.evil.example')).resolves.toBe(false);
      await expect(invokeOriginCallback('https://foo.bar.stage.whitraworks.online')).resolves.toBe(false);
    });
  });

  describe('NestJS app.enableCors integration with HTTP headers & credentials', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestCorsModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.enableCors(corsOptions);
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('sets Access-Control-Allow-Origin and credentials for https://stage.whitraworks.online', async () => {
      const origin = 'https://stage.whitraworks.online';
      const response = await request(app.getHttpServer())
        .get('/test-cors')
        .set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('sets Access-Control-Allow-Origin and credentials for https://ops.stage.whitraworks.online', async () => {
      const origin = 'https://ops.stage.whitraworks.online';
      const response = await request(app.getHttpServer())
        .get('/test-cors')
        .set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('sets Access-Control-Allow-Origin and credentials for https://demo.stage.whitraworks.online', async () => {
      const origin = 'https://demo.stage.whitraworks.online';
      const response = await request(app.getHttpServer())
        .get('/test-cors')
        .set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('sets Access-Control-Allow-Origin and credentials for http://ops.localhost:3001', async () => {
      const origin = 'http://ops.localhost:3001';
      const response = await request(app.getHttpServer())
        .get('/test-cors')
        .set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('handles requests without an Origin header normally', async () => {
      const response = await request(app.getHttpServer()).get('/test-cors');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('handles OPTIONS preflight for https://ops.stage.whitraworks.online with 204', async () => {
      const origin = 'https://ops.stage.whitraworks.online';
      const response = await request(app.getHttpServer())
        .options('/test-cors')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('omits Access-Control-Allow-Origin for disallowed origins on HTTP GET without 500 error', async () => {
      const disallowedOrigin = 'https://evil.example.com';
      const response = await request(app.getHttpServer())
        .get('/test-cors')
        .set('Origin', disallowedOrigin);

      // Disallowed origins must never receive Access-Control-Allow-Origin or credentials
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
      // Unauthenticated public route returns 200, but browser blocks reading due to absent ACAO
      expect(response.status).toBe(200);
    });

    it('omits Access-Control-Allow-Origin for deceptive suffix origins on HTTP GET', async () => {
      const deceptiveOrigin = 'https://whitraworks.online.evil.example';
      const response = await request(app.getHttpServer())
        .get('/test-cors')
        .set('Origin', deceptiveOrigin);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it('refuses to authorize cross-origin request on OPTIONS preflight from disallowed origin', async () => {
      const disallowedOrigin = 'https://evil.example.com';
      const response = await request(app.getHttpServer())
        .options('/test-cors')
        .set('Origin', disallowedOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      // Preflight MUST omit Access-Control-Allow-Origin and methods, preventing browser from sending actual request
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
      expect(response.headers['access-control-allow-methods']).toBeUndefined();
    });

    describe('Authentication & Authorization Invariance', () => {
      it('enforces 401 Unauthorized on protected routes when unauthenticated, regardless of origin', async () => {
        // Allowed origin: gets 401 with ACAO header
        const allowedRes = await request(app.getHttpServer())
          .get('/test-cors/protected')
          .set('Origin', 'https://ops.stage.whitraworks.online');
        expect(allowedRes.status).toBe(401);
        expect(allowedRes.headers['access-control-allow-origin']).toBe('https://ops.stage.whitraworks.online');

        // Disallowed origin: gets 401 without ACAO header
        const disallowedRes = await request(app.getHttpServer())
          .get('/test-cors/protected')
          .set('Origin', 'https://evil.example.com');
        expect(disallowedRes.status).toBe(401);
        expect(disallowedRes.headers['access-control-allow-origin']).toBeUndefined();

        // Non-browser / curl: gets 401 without ACAO header
        const noOriginRes = await request(app.getHttpServer())
          .get('/test-cors/protected');
        expect(noOriginRes.status).toBe(401);
        expect(noOriginRes.headers['access-control-allow-origin']).toBeUndefined();
      });

      it('allows authenticated requests on protected routes and sets ACAO only for allowed origins', async () => {
        // Allowed origin with valid token
        const allowedRes = await request(app.getHttpServer())
          .get('/test-cors/protected')
          .set('Origin', 'https://ops.stage.whitraworks.online')
          .set('Authorization', 'Bearer valid-token');
        expect(allowedRes.status).toBe(200);
        expect(allowedRes.headers['access-control-allow-origin']).toBe('https://ops.stage.whitraworks.online');
        expect(allowedRes.headers['access-control-allow-credentials']).toBe('true');

        // Disallowed origin with valid token: response generated but ACAO omitted (browser blocks access)
        const disallowedRes = await request(app.getHttpServer())
          .get('/test-cors/protected')
          .set('Origin', 'https://evil.example.com')
          .set('Authorization', 'Bearer valid-token');
        expect(disallowedRes.status).toBe(200);
        expect(disallowedRes.headers['access-control-allow-origin']).toBeUndefined();
        expect(disallowedRes.headers['access-control-allow-credentials']).toBeUndefined();
      });
    });
  });
});

