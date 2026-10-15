import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildWorkspaceUrl, getTenantAdminBaseDomain } from '../src/common/utils/url.util';

describe('url.util (buildWorkspaceUrl)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.TENANT_ADMIN_BASE_DOMAIN;
    delete process.env.ROOT_DOMAIN;
    delete process.env.PLATFORM_DOMAIN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Local development environment', () => {
    it('constructs http://<slug>.localhost:3000 when TENANT_ADMIN_BASE_DOMAIN=localhost:3000', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'localhost:3000';
      expect(buildWorkspaceUrl('acme')).toBe('http://acme.localhost:3000');
      expect(buildWorkspaceUrl('acme', '/login')).toBe('http://acme.localhost:3000/login');
      expect(buildWorkspaceUrl('acme', 'invite/accept?token=123')).toBe('http://acme.localhost:3000/invite/accept?token=123');
    });

    it('falls back to http://<slug>.localhost:3000 when NODE_ENV=development and no base domain is set', () => {
      process.env.NODE_ENV = 'development';
      expect(buildWorkspaceUrl('demo')).toBe('http://demo.localhost:3000');
    });

    it('falls back to http://<slug>.localhost:3000 when NODE_ENV=test and no base domain is set', () => {
      process.env.NODE_ENV = 'test';
      expect(buildWorkspaceUrl('demo')).toBe('http://demo.localhost:3000');
    });
  });

  describe('Staging environment', () => {
    it('constructs https://<slug>.stage.whitraworks.online when TENANT_ADMIN_BASE_DOMAIN=stage.whitraworks.online', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'stage.whitraworks.online';
      process.env.NODE_ENV = 'staging';

      const url = buildWorkspaceUrl('freshbite', '/invite/accept?token=staging-token-xyz');
      expect(url).toBe('https://freshbite.stage.whitraworks.online/invite/accept?token=staging-token-xyz');
    });

    it('constructs correct base url without path on staging', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'stage.whitraworks.online';
      expect(buildWorkspaceUrl('freshbite')).toBe('https://freshbite.stage.whitraworks.online');
    });

    it('uses ROOT_DOMAIN if TENANT_ADMIN_BASE_DOMAIN is not defined', () => {
      process.env.ROOT_DOMAIN = 'stage.whitraworks.online';
      expect(buildWorkspaceUrl('freshbite', '/login')).toBe('https://freshbite.stage.whitraworks.online/login');
    });
  });

  describe('Production environment', () => {
    it('constructs https://<slug>.whitraworks.online when TENANT_ADMIN_BASE_DOMAIN=whitraworks.online', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'whitraworks.online';
      process.env.NODE_ENV = 'production';

      const url = buildWorkspaceUrl('corp', '/invite/accept?token=prod-token-123');
      expect(url).toBe('https://corp.whitraworks.online/invite/accept?token=prod-token-123');
    });

    it('falls back to whitraworks.online when NODE_ENV=production and no domain env vars are set', () => {
      process.env.NODE_ENV = 'production';
      expect(buildWorkspaceUrl('corp')).toBe('https://corp.whitraworks.online');
    });
  });

  describe('Edge cases and path normalization', () => {
    it('handles baseDomain that explicitly specifies https:// protocol', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'https://custom.domain.com';
      expect(buildWorkspaceUrl('client')).toBe('https://client.custom.domain.com');
    });

    it('handles baseDomain that explicitly specifies http:// protocol', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'http://internal.local:8080';
      expect(buildWorkspaceUrl('client')).toBe('http://client.internal.local:8080');
    });

    it('handles trailing slashes on baseDomain', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'stage.whitraworks.online///';
      expect(buildWorkspaceUrl('acme', '/dashboard')).toBe('https://acme.stage.whitraworks.online/dashboard');
    });

    it('handles path with or without leading slash', () => {
      process.env.TENANT_ADMIN_BASE_DOMAIN = 'stage.whitraworks.online';
      expect(buildWorkspaceUrl('acme', 'settings')).toBe('https://acme.stage.whitraworks.online/settings');
      expect(buildWorkspaceUrl('acme', '/settings')).toBe('https://acme.stage.whitraworks.online/settings');
    });
  });
});
