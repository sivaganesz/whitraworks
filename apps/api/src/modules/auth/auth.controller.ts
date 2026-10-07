import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SessionService, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from './session.service';
import { LoginDto } from './dto/login.dto';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';
import { RequestWithTenant } from '../../common/middleware/tenant-resolution.middleware';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in to tenant workspace or ops control plane' })
  @SwaggerResponse({ status: 200, description: 'Authentication successful' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: RequestWithTenant,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(dto, req.tenant, req.isControlPlane);

    // Mint Host-Scoped Session Cookie (Golden Rule 5)
    this.sessionService.setSessionCookie(res, result.token);

    return {
      user: result.user,
      ...(result.activeWorkspace ? { activeWorkspace: result.activeWorkspace } : {}),
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user session and workspace profile' })
  @SwaggerResponse({ status: 200, description: 'Session profile retrieved' })
  async me(@Req() req: RequestWithTenant) {
    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      req.cookies?.[LEGACY_SESSION_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    const session = this.sessionService.verifySessionToken(token);

    return this.authService.getSessionProfile(
      session.userId,
      req.tenant?.tenantId || session.tenantId
    );
  }

  @Post('switch-workspace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active workspace (Scenario A invite-only model)' })
  @SwaggerResponse({ status: 200, description: 'Target workspace verified and redirect URL generated' })
  async switchWorkspace(
    @Body() dto: SwitchWorkspaceDto,
    @Req() req: RequestWithTenant
  ) {
    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      req.cookies?.[LEGACY_SESSION_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    const session = this.sessionService.verifySessionToken(token);

    return this.authService.switchWorkspace(session.userId, dto.targetTenantSlug);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and invalidate host-scoped session cookies' })
  @SwaggerResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Res({ passthrough: true }) res: Response) {
    this.sessionService.clearSessionCookie(res);
    return { message: 'Successfully logged out.' };
  }
}
