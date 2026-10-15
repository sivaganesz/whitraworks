/**
 * URL and hostname helper utilities for Ops Admin.
 */

export function getTenantWorkspaceHost(slug: string): string {
  if (typeof window === 'undefined') return `${slug}.whitraworks.online`;
  const host = window.location.hostname;
  if (host.endsWith('stage.whitraworks.online')) {
    return `${slug}.stage.whitraworks.online`;
  }
  if (host.endsWith('localhost') || host === '127.0.0.1') {
    return `${slug}.localhost:3000`;
  }
  return `${slug}.whitraworks.online`;
}

export function getTenantWorkspaceUrl(slug: string): string {
  if (typeof window === 'undefined') return `https://${slug}.whitraworks.online`;
  const host = window.location.hostname;
  if (host.endsWith('stage.whitraworks.online')) {
    return `https://${slug}.stage.whitraworks.online`;
  }
  if (host.endsWith('localhost') || host === '127.0.0.1') {
    return `http://${slug}.localhost:3000`;
  }
  return `https://${slug}.whitraworks.online`;
}
