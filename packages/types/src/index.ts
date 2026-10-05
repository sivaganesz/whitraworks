// WhitraWorks Core Contracts & Shared Types

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';
export type TenantStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface TenantContext {
  tenantId: string;
  slug: string;
  status: TenantStatus;
}

