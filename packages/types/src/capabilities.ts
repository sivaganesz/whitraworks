// WhitraWorks Capability Configuration Engine Contracts & Registry

export type CapabilityCategory = 'core' | 'operations' | 'fulfillment' | 'intelligence';

export interface CapabilityDefinition {
  code: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  dependencies: string[]; // Codes of capabilities that must be enabled first
  defaultEnabled: boolean;
}

export interface TenantCapabilityConfig {
  id: string;
  tenantId: string;
  capabilityCode: string;
  isEnabled: boolean;
  configJson: Record<string, unknown>;
  updatedAt: string;
}

export const CAPABILITY_REGISTRY: Record<string, CapabilityDefinition> = {
  catalog: {
    code: 'catalog',
    name: 'Product & Menu Catalog',
    description: 'Manage categories, items, pricing, and variants/options.',
    category: 'core',
    dependencies: [],
    defaultEnabled: true,
  },
  orders: {
    code: 'orders',
    name: 'Order Lifecycle & Checkout',
    description: 'Cart, checkout, order creation, and payment verification.',
    category: 'core',
    dependencies: ['catalog'],
    defaultEnabled: true,
  },
  inventory: {
    code: 'inventory',
    name: 'Stock & Inventory Management',
    description: 'Real-time stock counts, re-order thresholds, and depletion tracking.',
    category: 'operations',
    dependencies: ['catalog'],
    defaultEnabled: false,
  },
  kitchen: {
    code: 'kitchen',
    name: 'Kitchen Display System (KDS)',
    description: 'Order preparation statuses, station assignments, and ticket ready alerts.',
    category: 'operations',
    dependencies: ['orders'],
    defaultEnabled: false,
  },
  delivery: {
    code: 'delivery',
    name: 'Delivery & Fulfillment Dispatch',
    description: 'Address verification, delivery zones, fees, and driver dispatch.',
    category: 'fulfillment',
    dependencies: ['orders'],
    defaultEnabled: false,
  },
  analytics: {
    code: 'analytics',
    name: 'Business Analytics & Reporting',
    description: 'Sales volume, revenue trends, and operational metrics.',
    category: 'intelligence',
    dependencies: ['orders'],
    defaultEnabled: false,
  },
};

export type CapabilityCode = keyof typeof CAPABILITY_REGISTRY;
