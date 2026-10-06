import { ApiResponse, User } from '@whitraworks/types';
import { getDevWorkspaceSlug } from './subdomain';

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

export interface ActiveWorkspace {
  id: string;
  slug: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AvailableWorkspace {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export interface SessionProfile {
  user: User;
  activeWorkspace: ActiveWorkspace | null;
  availableWorkspaces: AvailableWorkspace[];
}

export interface LoginResult {
  user: User;
  activeWorkspace?: ActiveWorkspace;
  token?: string;
}

export interface SwitchWorkspaceResult {
  redirectUrl: string;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  tenantSlugOverride?: string | null
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // If provided or in local development fallback, attach x-tenant-slug header
  const activeSlug = tenantSlugOverride || getDevWorkspaceSlug();
  if (activeSlug && !headers.has('x-tenant-slug')) {
    headers.set('x-tenant-slug', activeSlug);
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

export const authApi = {
  login: async (email: string, password: string, tenantSlug?: string | null): Promise<LoginResult> => {
    return fetchApi<LoginResult>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      tenantSlug
    );
  },

  getMe: async (tenantSlug?: string | null): Promise<SessionProfile> => {
    return fetchApi<SessionProfile>(
      '/auth/me',
      {
        method: 'GET',
      },
      tenantSlug
    );
  },

  switchWorkspace: async (targetTenantSlug: string): Promise<SwitchWorkspaceResult> => {
    return fetchApi<SwitchWorkspaceResult>('/auth/switch-workspace', {
      method: 'POST',
      body: JSON.stringify({ targetTenantSlug }),
    });
  },

  logout: async (): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};

export interface WorkspaceProfile {
  id: string;
  slug: string;
  name: string;
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  currency: string;
  timezone: string;
  logoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWorkspaceProfilePayload {
  name?: string;
  currency?: string;
  timezone?: string;
  logoUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  role: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
}

export interface ListMembersResponse {
  items: WorkspaceMember[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  role: {
    id: string;
    code: string;
    name: string;
  };
  invitedBy?: {
    id: string;
    email: string;
    name: string;
  } | null;
  inviteUrl: string;
}

export interface InviteMemberPayload {
  email: string;
  roleCode?: string;
  roleId?: string;
}

export interface InviteMemberResponse {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  inviteUrl: string;
}

export const workspaceApi = {
  getProfile: async (tenantSlug?: string | null): Promise<WorkspaceProfile> => {
    return fetchApi<WorkspaceProfile>('/workspace/profile', { method: 'GET' }, tenantSlug);
  },

  updateProfile: async (
    payload: UpdateWorkspaceProfilePayload,
    tenantSlug?: string | null
  ): Promise<WorkspaceProfile> => {
    return fetchApi<WorkspaceProfile>(
      '/workspace/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      tenantSlug
    );
  },

  listMembers: async (
    params?: { page?: number; limit?: number; status?: string; search?: string },
    tenantSlug?: string | null
  ): Promise<ListMembersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString();
    return fetchApi<ListMembersResponse>(
      `/workspace/members${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' },
      tenantSlug
    );
  },

  listInvitations: async (tenantSlug?: string | null): Promise<WorkspaceInvitation[]> => {
    return fetchApi<WorkspaceInvitation[]>('/workspace/invitations', { method: 'GET' }, tenantSlug);
  },

  inviteMember: async (
    payload: InviteMemberPayload,
    tenantSlug?: string | null
  ): Promise<InviteMemberResponse> => {
    return fetchApi<InviteMemberResponse>(
      '/workspace/members/invite',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      tenantSlug
    );
  },

  removeMember: async (
    memberId: string,
    tenantSlug?: string | null
  ): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>(
      `/workspace/members/${memberId}`,
      {
        method: 'DELETE',
      },
      tenantSlug
    );
  },

  revokeInvitation: async (
    invitationId: string,
    tenantSlug?: string | null
  ): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>(
      `/workspace/invitations/${invitationId}`,
      {
        method: 'DELETE',
      },
      tenantSlug
    );
  },
};

