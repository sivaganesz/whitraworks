import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionService, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME, SessionPayload } from '../../modules/auth/session.service';
import { API_ERROR_CODES } from '@whitraworks/types';

export interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      req.cookies?.[LEGACY_SESSION_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Authentication session required. Please log in.',
      });
    }

    const session = await this.sessionService.verifySessionToken(token);
    req.user = session;
    return true;
  }
}

