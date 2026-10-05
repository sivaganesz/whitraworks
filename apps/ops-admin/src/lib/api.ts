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
