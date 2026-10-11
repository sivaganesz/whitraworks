import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Patterns matching allowed CORS origins for WhitraWorks.
 *
 * 1. Development: Localhost with arbitrary port and optional subdomain
 *    (e.g., http://localhost:3000, http://ops.localhost:3001, http://demo.localhost:3000)
 * 2. Production (whitraworks.com): HTTPS apex and subdomains
 *    (e.g., https://whitraworks.com, https://ops.whitraworks.com, https://demo.whitraworks.com)
 * 3. Staging & Production (whitraworks.online): HTTPS apex and subdomains
 *    (e.g., https://stage.whitraworks.online, https://ops.stage.whitraworks.online, https://demo.stage.whitraworks.online)
 */
export const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^http:\/\/([a-z0-9-]+\.)?localhost:[0-9]+$/i,
  /^https:\/\/([a-z0-9-]+\.)?whitraworks\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?stage\.whitraworks\.online$/i,
  /^https:\/\/([a-z0-9-]+\.)?whitraworks\.online$/i,
];

/**
 * Validates whether an incoming HTTP Origin header is authorized.
 * Requests without an Origin header (server-to-server, curl, mobile native) are permitted.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * Standard CORS configuration for WhitraWorks API.
 */
export const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Cookie'],
};

