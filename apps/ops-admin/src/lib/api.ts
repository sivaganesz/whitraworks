import { ApiResponse, User } from '@whitraworks/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string = 'INTERNAL_SERVER_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  // Fallback for local development if Host header is not automatically set to ops.*
  if (!headers.has('x-tenant-slug')) {
    headers.set('x-tenant-slug', 'ops');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes host-scoped cookies (Golden Rule 5)
  });

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Failed to parse server response.', 'PARSE_ERROR');
  }

  if (!response.ok || !data.success) {
    const error = data.error;
    throw new ApiError(
      error?.message || 'An unexpected API error occurred.',
      error?.code || `HTTP_${response.status}`,
      error?.details
    );
  }

  return data.data as T;
}

export interface LoginResult {
  user: User;
  token?: string;
}

export interface MeResult {
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    return fetchApi<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<MeResult> => {
    return fetchApi<MeResult>('/auth/me', {
      method: 'GET',
    });
  },

  logout: async (): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  activeCapabilitiesCount: number;
}

export interface TenantListResponse {
  tenants: TenantListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantStatusUpdateResult {
  success: boolean;
  message: string;
  tenant: {
    id: string;
    status: 'ACTIVE' | 'SUSPENDED';
    slug: string;
    name: string;
  };
}

export const opsApi = {
  getTenants: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<TenantListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);

    const qs = query.toString();
    return fetchApi<TenantListResponse>(`/ops/tenants${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  updateTenantStatus: async (
    id: string,
    payload: { status: 'ACTIVE' | 'SUSPENDED'; reason: string }
  ): Promise<TenantStatusUpdateResult> => {
    return fetchApi<TenantStatusUpdateResult>(`/ops/tenants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getTenantCapabilities: async (tenantId: string): Promise<TenantCapabilitiesResponse> => {
    return fetchApi<TenantCapabilitiesResponse>(`/ops/tenants/${tenantId}/capabilities`, {
      method: 'GET',
    });
  },

  updateTenantCapabilities: async (
    tenantId: string,
    capabilities: Record<string, boolean>
  ): Promise<{ success: boolean; message: string; data: TenantCapabilitiesResponse }> => {
    return fetchApi<{ success: boolean; message: string; data: TenantCapabilitiesResponse }>(
      `/ops/tenants/${tenantId}/capabilities`,
      {
        method: 'PUT',
        body: JSON.stringify({ capabilities }),
      }
    );
  },

  getOverviewMetrics: async (): Promise<OverviewMetricsResponse> => {
    return fetchApi<OverviewMetricsResponse>('/ops/overview', {
      method: 'GET',
    });
  },

  getAuditLogs: async (params?: AuditLogsQuery): Promise<AuditLogsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.action && params.action !== 'ALL') query.set('action', params.action);
    if (params?.entityType && params.entityType !== 'ALL') query.set('entityType', params.entityType);
    if (params?.search) query.set('search', params.search);
    if (params?.tenantId) query.set('tenantId', params.tenantId);

    const qs = query.toString();
    return fetchApi<AuditLogsResponse>(`/ops/audit-logs${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },
};

export interface CapabilityItem {
  code: string;
  name: string;
  description: string;
  category: 'core' | 'operations' | 'fulfillment' | 'intelligence';
  dependencies: string[];
  isEnabled: boolean;
}

export interface TenantCapabilitiesResponse {
  tenantId: string;
  capabilities: CapabilityItem[];
}

export interface OverviewMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  provisioningTenants: number;
  totalUsers: number;
  totalMembers: number;
}

export interface SystemHealth {
  database: string;
  redis: string;
  controlPlane: string;
}

export interface AuditLogActor {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isPlatformSuperadmin?: boolean;
}

export interface AuditLogTenant {
  id: string;
  name: string;
  slug: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  tenantId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: AuditLogActor | null;
  tenant?: AuditLogTenant | null;
}

export interface OverviewMetricsResponse {
  metrics: OverviewMetrics;
  systemHealth: SystemHealth;
  recentActivity: AuditLogItem[];
}

export interface AuditLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  search?: string;
  tenantId?: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


