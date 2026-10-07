import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { RegistrationService } from './registration.service';
import { SessionService } from '../auth/session.service';
import { RegisterDto } from './dto/register.dto';
import { CheckSlugDto } from './dto/check-slug.dto';

@ApiTags('Public')
@Controller('public')
export class RegistrationController {
  constructor(
    @Inject(RegistrationService) private readonly registrationService: RegistrationService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  @Get('check-slug')
  @ApiOperation({ summary: 'Check subdomain slug availability and platform reserved status' })
  @SwaggerResponse({ status: 200, description: 'Slug availability status returned' })
  async checkSlug(@Query() query: CheckSlugDto) {
    return this.registrationService.checkSlug(query.slug);
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Public workspace registration with Scenario A email collision guardrails' })
  @SwaggerResponse({ status: 201, description: 'User, Tenant, and Owner membership created atomically' })
  @SwaggerResponse({ status: 409, description: 'Email collision directing user to existing workspace or slug taken' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.registrationService.register(dto);

    // Mint Host-Scoped Session Cookie for the newly registered workspace (Golden Rule 5)
    this.sessionService.setSessionCookie(res, result.token);

    return {
      user: result.user,
      tenant: result.tenant,
    };
  }
}
