/**
 * Subdomain resolution utility for WhitraWorks Tenant Admin Data Plane.
 * Golden Rule 5 & 10: Isolates data plane to the issuing host (<slug>.whitraworks.com or <slug>.localhost).
 */

const RESERVED_SUBDOMAINS = new Set([
  'ops',
  'api',
  'admin',
  'app',
  'www',
  'static',
  'assets',
  'mail',
  'smtp',
]);

export interface SubdomainResolution {
  slug: string | null;
  hostname: string;
  isReserved: boolean;
  isDevFallback: boolean;
  error?: string;
}

const DEV_WORKSPACE_STORAGE_KEY = 'whitraworks_dev_workspace_slug';
export const DEFAULT_DEV_SLUG = 'abchotel';

export function getDevWorkspaceSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_DEV_SLUG;
  return localStorage.getItem(DEV_WORKSPACE_STORAGE_KEY) || DEFAULT_DEV_SLUG;
}

export function setDevWorkspaceSlug(slug: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_WORKSPACE_STORAGE_KEY, slug.trim().toLowerCase());
}

export function resolveTenantSubdomain(hostname: string = window.location.hostname): SubdomainResolution {
  const parts = hostname.toLowerCase().split('.');

  // Scenario 1: <slug>.whitraworks.com (3 or more parts: e.g. ["acme", "whitraworks", "com"])
  // Scenario 2: <slug>.localhost (2 parts: e.g. ["acme", "localhost"])
  let rawSubdomain: string | null = null;
  let isDevFallback = false;

  if (parts.length >= 3 && !hostname.endsWith('.localhost')) {
    rawSubdomain = parts[0] || null;
  } else if (parts.length >= 2 && hostname.endsWith('.localhost')) {
    rawSubdomain = parts[0] || null;
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development fallback when not browsing via *.localhost
    rawSubdomain = getDevWorkspaceSlug();
    isDevFallback = true;
  }

  if (!rawSubdomain) {
    return {
      slug: null,
      hostname,
      isReserved: false,
      isDevFallback,
      error: 'No tenant workspace subdomain detected. Please navigate to <workspace>.whitraworks.com',
    };
  }

  if (RESERVED_SUBDOMAINS.has(rawSubdomain)) {
    return {
      slug: rawSubdomain,
      hostname,
      isReserved: true,
      isDevFallback,
      error: `Subdomain "${rawSubdomain}" is reserved and cannot be accessed as a tenant workspace.`,
    };
  }

  return {
    slug: rawSubdomain,
    hostname,
    isReserved: false,
    isDevFallback,
  };
}
