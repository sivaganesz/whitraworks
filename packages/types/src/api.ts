// WhitraWorks API Standards, Envelopes & Error Codes

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetails;
  meta?: ApiMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: PaginationMeta;
}

export const API_ERROR_CODES = {
  // Authentication & Session
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Registration & Collision Guardrails
  EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE: 'EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE',
  SLUG_ALREADY_TAKEN: 'SLUG_ALREADY_TAKEN',
  SLUG_RESERVED: 'SLUG_RESERVED',
  INVALID_SLUG_FORMAT: 'INVALID_SLUG_FORMAT',

  // Tenant & Membership
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_PROVISIONING: 'TENANT_PROVISIONING',
  MEMBERSHIP_NOT_FOUND: 'MEMBERSHIP_NOT_FOUND',
  MEMBERSHIP_SUSPENDED: 'MEMBERSHIP_SUSPENDED',
  CANNOT_REMOVE_TENANT_OWNER: 'CANNOT_REMOVE_TENANT_OWNER',

  // Invitations
  INVALID_INVITATION_TOKEN: 'INVALID_INVITATION_TOKEN',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
  INVITATION_EMAIL_MISMATCH: 'INVITATION_EMAIL_MISMATCH',
  CANNOT_INVITE_AS_OWNER: 'CANNOT_INVITE_AS_OWNER',

  // Capability Engine
  CAPABILITY_NOT_ENABLED: 'CAPABILITY_NOT_ENABLED',
  CAPABILITY_DEPENDENCY_MISSING: 'CAPABILITY_DEPENDENCY_MISSING',
  UNKNOWN_CAPABILITY: 'UNKNOWN_CAPABILITY',

  // General Validation & Platform
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
