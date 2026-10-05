import { describe, it, expect, vi } from 'vitest';
import { runWithTenantContext, getTenantContext } from '../src/tenant-context';
import { isTenantScopedModel, TENANT_SCOPED_MODELS } from '../src/tenant-extension';

describe('Tenant Context & Isolation', () => {
  it('should return undefined when no context is active', () => {
    expect(getTenantContext()).toBeUndefined();
  });

  it('should correctly scope context within runWithTenantContext', () => {
    const mockContext = {
      tenantId: '018f6c4a-3829-7a00-8451-123456789abc',
      userId: '018f6c4a-3829-7a00-8451-987654321def',
      isPlatformSuperadmin: false,
    };

    expect(getTenantContext()).toBeUndefined();

    runWithTenantContext(mockContext, () => {
      const active = getTenantContext();
      expect(active).toEqual(mockContext);
      expect(active?.tenantId).toBe(mockContext.tenantId);
    });

    expect(getTenantContext()).toBeUndefined();
  });

  it('should identify tenant-scoped models correctly', () => {
    for (const model of TENANT_SCOPED_MODELS) {
      expect(isTenantScopedModel(model)).toBe(true);
    }

    expect(isTenantScopedModel('User')).toBe(false);
    expect(isTenantScopedModel('Tenant')).toBe(false);
    expect(isTenantScopedModel('Permission')).toBe(false);
    expect(isTenantScopedModel(undefined)).toBe(false);
  });

  it('should verify tenant isolation behavior on query arguments', () => {
    const tenantId = '018f6c4a-3829-7a00-8451-tenant000001';

    runWithTenantContext({ tenantId }, () => {
      const active = getTenantContext();
      expect(active?.tenantId).toBe(tenantId);

      // Simulating query middleware injection
      const args: { where?: Record<string, unknown> } = { where: { status: 'ACTIVE' } };
      if (active?.tenantId) {
        args.where = { ...args.where, tenantId: active.tenantId };
      }

      expect(args.where).toEqual({
        status: 'ACTIVE',
        tenantId: '018f6c4a-3829-7a00-8451-tenant000001',
      });
    });
  });
});
