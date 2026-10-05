import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Response } from 'express';
import { API_ERROR_CODES } from '@whitraworks/types';

export const SESSION_COOKIE_NAME = 'ww_session';
export const LEGACY_SESSION_COOKIE_NAME = '__whitraworks_tenant_session';

export interface SessionPayload {
  userId: string;
  email: string;
  isPlatformSuperadmin: boolean;
  tenantId?: string;
  exp: number; // Unix timestamp in seconds
}

@Injectable()
export class SessionService {
  private readonly secret: string;

  constructor() {
    this.secret =
      process.env['SESSION_SECRET'] ||
      'whitraworks-super-secret-session-key-change-in-production-min32chars';
  }

  createSessionToken(payload: Omit<SessionPayload, 'exp'>, expiresInDays = 7): string {
    const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
    const fullPayload: SessionPayload = { ...payload, exp };

    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = this.sign(payloadB64);

    return `${payloadB64}.${signature}`;
  }

  verifySessionToken(token?: string): SessionPayload {
    if (!token) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'No session provided. Please log in.',
      });
    }

    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Invalid session token format.',
      });
    }

    const [payloadB64, providedSig] = parts;
    const expectedSig = this.sign(payloadB64);

    const providedSigBuf = Buffer.from(providedSig);
    const expectedSigBuf = Buffer.from(expectedSig);

    if (
      providedSigBuf.length !== expectedSigBuf.length ||
      !timingSafeEqual(providedSigBuf, expectedSigBuf)
    ) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Session signature verification failed.',
      });
    }

    try {
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      const payload: SessionPayload = JSON.parse(payloadJson);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException({
          code: API_ERROR_CODES.SESSION_EXPIRED,
          message: 'Session has expired. Please log in again.',
        });
      }

      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Invalid session payload.',
      });
    }
  }

  setSessionCookie(res: Response, token: string, maxAgeDays = 7): void {
    const isProd = process.env['NODE_ENV'] === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
      // IMPORTANT: Notice domain is intentionally omitted to lock strictly to the exact issuing host (Golden Rule 5)
    };

    res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
    res.cookie(LEGACY_SESSION_COOKIE_NAME, token, cookieOptions);
  }

  clearSessionCookie(res: Response): void {
    const isProd = process.env['NODE_ENV'] === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    res.clearCookie(LEGACY_SESSION_COOKIE_NAME, cookieOptions);
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
