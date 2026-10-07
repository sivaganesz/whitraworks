import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { Response } from 'express';
import { API_ERROR_CODES } from '@whitraworks/types';
import { RedisService } from '../redis/redis.service';

export const SESSION_COOKIE_NAME = 'ww_session';
export const LEGACY_SESSION_COOKIE_NAME = '__whitraworks_tenant_session';

export interface SessionPayload {
  userId: string;
  email: string;
  isPlatformSuperadmin: boolean;
  tenantId?: string;
  iat?: number; // Issued-at timestamp in seconds
  exp: number; // Unix timestamp in seconds
}

@Injectable()
export class SessionService {
  private readonly secret: string;

  constructor(@Inject(RedisService) private readonly redis: RedisService) {
    this.secret =
      process.env['SESSION_SECRET'] ||
      'whitraworks-super-secret-session-key-change-in-production-min32chars';
  }

  createSessionToken(payload: Omit<SessionPayload, 'exp' | 'iat'>, expiresInDays = 7): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + expiresInDays * 24 * 60 * 60;
    const fullPayload: SessionPayload = { ...payload, iat: now, exp };

    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = this.sign(payloadB64);

    return `${payloadB64}.${signature}`;
  }

  /**
   * Block a specific session token in Redis (e.g. upon user logout)
   */
  async blockToken(token: string): Promise<void> {
    const hash = this.hashToken(token);
    const key = `session:block:${hash}`;

    try {
      const payload = this.decodeTokenWithoutBlocklistCheck(token);
      const now = Math.floor(Date.now() / 1000);
      const remainingTtl = payload?.exp ? Math.max(1, payload.exp - now) : 7 * 24 * 60 * 60;
      await this.redis.set(key, '1', remainingTtl);
    } catch {
      await this.redis.set(key, '1', 7 * 24 * 60 * 60);
    }
  }

  /**
   * Check if a token has been explicitly blocklisted in Redis
   */
  async isTokenBlocked(token: string): Promise<boolean> {
    const hash = this.hashToken(token);
    const key = `session:block:${hash}`;
    const value = await this.redis.get(key);
    return Boolean(value);
  }

  /**
   * Invalidate all existing sessions for a specific user (e.g. member suspended or password reset)
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.redis.set(`session:user_invalidated:${userId}`, String(now), 7 * 24 * 60 * 60);
  }

  /**
   * Invalidate all sessions for an entire workspace (e.g. workspace suspended via Ops Control Plane)
   */
  async invalidateTenantSessions(tenantId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.redis.set(`session:tenant_invalidated:${tenantId}`, String(now), 7 * 24 * 60 * 60);
  }

  /**
   * Clear workspace-level session invalidation upon reactivation
   */
  async clearTenantSessionInvalidation(tenantId: string): Promise<void> {
    await this.redis.del(`session:tenant_invalidated:${tenantId}`);
  }

  /**
   * Verify token signature, expiration, and distributed Redis blocklist/invalidation
   */
  async verifySessionToken(token?: string): Promise<SessionPayload> {
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

    let payload: SessionPayload;
    try {
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      payload = JSON.parse(payloadJson);
    } catch {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.AUTH_UNAUTHORIZED,
        message: 'Invalid session payload.',
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.SESSION_EXPIRED,
        message: 'Session has expired. Please log in again.',
      });
    }

    // 1. Check Redis Token Blocklist
    const isBlocked = await this.isTokenBlocked(token);
    if (isBlocked) {
      throw new UnauthorizedException({
        code: API_ERROR_CODES.SESSION_EXPIRED,
        message: 'Session has been revoked or logged out.',
      });
    }

    // 2. Check User-Level Invalidation
    if (payload.userId) {
      const userInvalidatedAtStr = await this.redis.get(`session:user_invalidated:${payload.userId}`);
      if (userInvalidatedAtStr) {
        const userInvalidatedAt = parseInt(userInvalidatedAtStr, 10);
        const tokenIat = payload.iat || 0;
        if (tokenIat <= userInvalidatedAt) {
          throw new UnauthorizedException({
            code: API_ERROR_CODES.SESSION_EXPIRED,
            message: 'User session has been revoked. Please log in again.',
          });
        }
      }
    }

    // 3. Check Tenant-Level Invalidation
    if (payload.tenantId) {
      const tenantInvalidatedAtStr = await this.redis.get(`session:tenant_invalidated:${payload.tenantId}`);
      if (tenantInvalidatedAtStr) {
        const tenantInvalidatedAt = parseInt(tenantInvalidatedAtStr, 10);
        const tokenIat = payload.iat || 0;
        if (tokenIat <= tenantInvalidatedAt) {
          throw new UnauthorizedException({
            code: API_ERROR_CODES.SESSION_EXPIRED,
            message: 'Workspace sessions have been revoked. Please log in again.',
          });
        }
      }
    }

    return payload;
  }

  /**
   * Synchronous decode without blocklist checks (used internally for inspect/cleanup)
   */
  decodeTokenWithoutBlocklistCheck(token: string): SessionPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2 || !parts[0]) return null;
      const payloadJson = Buffer.from(parts[0], 'base64url').toString('utf-8');
      return JSON.parse(payloadJson) as SessionPayload;
    } catch {
      return null;
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
