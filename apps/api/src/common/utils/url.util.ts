/**
 * Utility for constructing workspace URLs in WhitraWorks.
 *
 * Golden Rule 5: Host-Only isolation. URLs must target the exact workspace host.
 *
 * Domain resolution hierarchy:
 * 1. process.env['TENANT_ADMIN_BASE_DOMAIN'] (e.g. "stage.whitraworks.online", "localhost:3000", "whitraworks.online")
 * 2. process.env['ROOT_DOMAIN']
 * 3. process.env['PLATFORM_DOMAIN']
 * 4. Fallback based on NODE_ENV:
 *    - 'development' | 'test' => 'localhost:3000'
 *    - all others => 'whitraworks.online'
 *
 * Protocol resolution:
 * - If baseDomain starts with 'http://' or 'https://', preserve that scheme.
 * - If hostname contains 'localhost' or '127.0.0.1', default to 'http://'.
 * - Otherwise, default to 'https://'.
 */

export function getTenantAdminBaseDomain(): string {
  const envDomain =
    process.env['TENANT_ADMIN_BASE_DOMAIN'] ||
    process.env['ROOT_DOMAIN'] ||
    process.env['PLATFORM_DOMAIN'];

  const trimmed = envDomain?.trim();
  if (trimmed) {
    return trimmed;
  }

  const nodeEnv = process.env['NODE_ENV'];
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return 'localhost:3000';
  }

  return 'whitraworks.online';
}

export function buildWorkspaceUrl(slug: string, path: string = ''): string {
  const rawBase = getTenantAdminBaseDomain();

  let protocol = 'https://';
  let hostPart = rawBase;

  if (rawBase.startsWith('http://')) {
    protocol = 'http://';
    hostPart = rawBase.slice(7);
  } else if (rawBase.startsWith('https://')) {
    protocol = 'https://';
    hostPart = rawBase.slice(8);
  } else if (
    hostPart.startsWith('localhost') ||
    hostPart.includes('.localhost') ||
    hostPart.includes('127.0.0.1')
  ) {
    protocol = 'http://';
  }

  // Strip trailing slashes and spaces from hostPart
  hostPart = hostPart.replace(/\/+$/, '').trim();

  // Normalize path to ensure leading slash if path is non-empty
  let normalizedPath = path.trim();
  if (normalizedPath && !normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }

  return `${protocol}${slug}.${hostPart}${normalizedPath}`;
}
