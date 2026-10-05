import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cookie Parser for host-scoped HttpOnly cookies
  const cookieSecret = process.env['COOKIE_SECRET'] || 'whitraworks-cookie-signer-secret-min32chars';
  app.use(cookieParser(cookieSecret));

  // CORS configuration supporting dynamic subdomains in development and production
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow server-to-server or requests without origin (like curl, postman)
      if (!origin) return callback(null, true);

      const allowedPatterns = [
        /^http:\/\/(.+\.)?localhost:[0-9]+$/,
        /^https:\/\/(.+\.)?whitraworks\.com$/,
      ];

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Cookie'],
  });

  // Global Class-Validator Pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // Standard API Envelope & Error Filters
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('WhitraWorks Core Platform API')
    .setDescription('Multi-Tenant Core Business Operations Platform Foundation API')
    .setVersion('1.0')
    .addTag('Health', 'Platform connectivity and uptime status')
    .addTag('Public', 'Public onboarding and collision check endpoints')
    .addTag('Auth', 'Session management and authentication')
    .addTag('Tenant', 'Tenant-scoped workspace management')
    .addTag('Ops', 'Root control plane operations')
    .addCookieAuth('ww_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env['PORT'] ?? 4000;
  await app.listen(port);
  logger.log(`🚀 WhitraWorks API running on http://api.localhost:${port}`);
  logger.log(`📚 Swagger Documentation available at http://api.localhost:${port}/api/docs`);
}

bootstrap();
