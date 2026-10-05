// WhitraWorks Multi-Tenant Workspace & Membership Contracts

import { User } from './user';

export type TenantStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  currency: string;
  timezone: string;
  logoUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  createdAt: string;
}

export interface Role {
  id: string;
  tenantId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isSystemRole: boolean;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  status: MembershipStatus;
  user?: User;
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  roleId: string;
  token: string;
  invitedById: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  role?: Role;
}
