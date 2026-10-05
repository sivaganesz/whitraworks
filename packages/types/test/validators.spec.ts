import { describe, it, expect } from 'vitest';
import {
  slugSchema,
  registerSchema,
  loginSchema,
  inviteMemberSchema,
  updateTenantSchema,
  RESERVED_SLUGS,
} from '../src/validators';
import { CAPABILITY_REGISTRY } from '../src/capabilities';

describe('Validation Schemas (Zod)', () => {
  describe('slugSchema', () => {
    it('accepts valid alphanumeric slugs', () => {
      expect(slugSchema.safeParse('abchotel').success).toBe(true);
      expect(slugSchema.safeParse('cloud-kitchen-01').success).toBe(true);
    });

    it('rejects slugs with invalid characters or casing', () => {
      expect(slugSchema.safeParse('AbcHotel').success).toBe(false);
      expect(slugSchema.safeParse('abc_hotel').success).toBe(false);
      expect(slugSchema.safeParse('ab').success).toBe(false);
      expect(slugSchema.safeParse('-abchotel').success).toBe(false);
    });

    it('rejects reserved platform slugs', () => {
      for (const reserved of RESERVED_SLUGS) {
        expect(slugSchema.safeParse(reserved).success).toBe(false);
      }
    });
  });

  describe('registerSchema', () => {
    it('accepts a valid registration payload', () => {
      const validPayload = {
        email: 'founder@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        workspaceName: 'Acme Dining',
        workspaceSlug: 'acme-dining',
      };
      const result = registerSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects weak passwords', () => {
      const weakPayload = {
        email: 'founder@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        workspaceName: 'Acme Dining',
        workspaceSlug: 'acme-dining',
      };
      const result = registerSchema.safeParse(weakPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Capability Registry', () => {
    it('has standard core capabilities defined with dependencies', () => {
      expect(CAPABILITY_REGISTRY.catalog).toBeDefined();
      expect(CAPABILITY_REGISTRY.orders).toBeDefined();
      expect(CAPABILITY_REGISTRY.orders.dependencies).toContain('catalog');
      expect(CAPABILITY_REGISTRY.kitchen.dependencies).toContain('orders');
    });
  });
});
