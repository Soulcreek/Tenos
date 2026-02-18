/**
 * API Client for Tenos Admin Center
 *
 * Handles authentication token management, request/response formatting,
 * and automatic token refresh on 401 responses.
 */

import type { ApiResponse, PaginatedResponse, ApiError } from '@tenos/shared';

const API_BASE = '/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('refreshToken');
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

async function attemptRefresh(): Promise<boolean> {
  const stored = refreshToken ?? getStoredRefreshToken();
  if (!stored) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    if (data.success && data.data) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
    clearTokens();
    return false;
  } catch {
    clearTokens();
    return false;
  }
}

async function refreshIfNeeded(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = attemptRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && accessToken) {
    const refreshed = await refreshIfNeeded();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  const data = await res.json();

  if (!res.ok) {
    const error = data as ApiError;
    throw new ApiRequestError(error.error ?? 'Request failed', error.code ?? 'UNKNOWN', res.status);
  }

  return data as T;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// --- Auth ---

export const auth = {
  login: (username: string, password: string) =>
    request<ApiResponse<{ accessToken: string; refreshToken: string; user: any }>>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  me: () => request<ApiResponse<any>>('/auth/me'),

  logout: () =>
    request<ApiResponse<null>>('/auth/logout', { method: 'POST' }).finally(() => clearTokens()),
};

// --- Dashboard ---

export const dashboard = {
  stats: () => request<ApiResponse<any>>('/dashboard/stats'),
  playerActivity: (hours = 24) =>
    request<ApiResponse<any[]>>('/dashboard/player-activity', { params: { hours } }),
  kingdomDistribution: () => request<ApiResponse<any[]>>('/dashboard/kingdom-distribution'),
  classDistribution: () => request<ApiResponse<any[]>>('/dashboard/class-distribution'),
  levelDistribution: () => request<ApiResponse<any[]>>('/dashboard/level-distribution'),
  recentActivity: (limit = 20) =>
    request<ApiResponse<any[]>>('/dashboard/recent-activity', { params: { limit } }),
  serverOverview: () => request<ApiResponse<any[]>>('/dashboard/server-overview'),
};

// --- Players ---

export const players = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    banned?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => request<PaginatedResponse<any>>('/players', { params: params as any }),

  get: (id: string) => request<ApiResponse<any>>(`/players/${id}`),

  update: (id: string, data: { role?: string; email?: string }) =>
    request<ApiResponse<any>>(`/players/${id}`, { method: 'PATCH', body: data }),

  ban: (id: string, data: { reason: string; type: string; expiresAt?: string }) =>
    request<ApiResponse<any>>(`/players/${id}/ban`, { method: 'POST', body: data }),

  unban: (id: string) =>
    request<ApiResponse<any>>(`/players/${id}/unban`, { method: 'POST' }),
};

// --- Characters ---

export const characters = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    characterClass?: string;
    kingdom?: number;
    minLevel?: number;
    maxLevel?: number;
    zone?: string;
    isOnline?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => request<PaginatedResponse<any>>('/characters', { params: params as any }),

  get: (id: string) => request<ApiResponse<any>>(`/characters/${id}`),

  update: (id: string, data: Record<string, any>) =>
    request<ApiResponse<any>>(`/characters/${id}`, { method: 'PATCH', body: data }),

  teleport: (id: string, data: { zone: string; x: number; y: number; z: number }) =>
    request<ApiResponse<any>>(`/characters/${id}/teleport`, { method: 'POST', body: data }),

  grantItem: (
    id: string,
    data: { itemId: string; quantity: number; upgradeLevel?: number; slot: number },
  ) =>
    request<ApiResponse<any>>(`/characters/${id}/grant-item`, { method: 'POST', body: data }),

  removeItem: (id: string, inventoryItemId: string) =>
    request<ApiResponse<any>>(`/characters/${id}/remove-item`, {
      method: 'POST',
      body: { inventoryItemId },
    }),

  resetStats: (id: string) =>
    request<ApiResponse<any>>(`/characters/${id}/reset-stats`, { method: 'POST' }),
};

// --- Servers ---

export const servers = {
  list: () => request<ApiResponse<any[]>>('/servers'),
  get: (id: string) => request<ApiResponse<any>>(`/servers/${id}`),
  start: (id: string) => request<ApiResponse<any>>(`/servers/${id}/start`, { method: 'POST' }),
  stop: (id: string) => request<ApiResponse<any>>(`/servers/${id}/stop`, { method: 'POST' }),
  restart: (id: string) =>
    request<ApiResponse<any>>(`/servers/${id}/restart`, { method: 'POST' }),
  maintenance: (id: string) =>
    request<ApiResponse<any>>(`/servers/${id}/maintenance`, { method: 'POST' }),
  overview: () => request<ApiResponse<any>>('/servers/stats/overview'),
};

// --- Config ---

export const config = {
  list: (category?: string) =>
    request<ApiResponse<any[]>>('/config', { params: category ? { category } : undefined }),
  categories: () => request<ApiResponse<string[]>>('/config/categories'),
  update: (id: string, value: string) =>
    request<ApiResponse<any>>(`/config/${id}`, { method: 'PATCH', body: { value } }),
  bulkUpdate: (updates: { id: string; value: string }[]) =>
    request<ApiResponse<any>>('/config/bulk-update', { method: 'POST', body: { updates } }),
};

// --- Logs ---

export const logs = {
  audit: (params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    actor?: string;
    targetType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => request<PaginatedResponse<any>>('/logs/audit', { params: params as any }),

  auditActions: () => request<ApiResponse<string[]>>('/logs/audit/actions'),

  announcements: (params?: { page?: number; pageSize?: number; type?: string }) =>
    request<PaginatedResponse<any>>('/logs/announcements', { params: params as any }),

  createAnnouncement: (data: {
    title: string;
    message: string;
    type: string;
    target: string;
    targetValue?: string;
    scheduledAt?: string;
    expiresAt?: string;
  }) => request<ApiResponse<any>>('/logs/announcements', { method: 'POST', body: data }),

  deleteAnnouncement: (id: string) =>
    request<ApiResponse<any>>(`/logs/announcements/${id}`, { method: 'DELETE' }),
};

// --- Tools ---

export const tools = {
  list: () => request<ApiResponse<any[]>>('/tools'),
  categories: () => request<ApiResponse<string[]>>('/tools/categories'),
  get: (id: string) => request<ApiResponse<any>>(`/tools/${id}`),

  execute: (id: string, parameters: Record<string, unknown>) =>
    request<ApiResponse<any>>(`/tools/${id}/execute`, {
      method: 'POST',
      body: { parameters },
    }),

  history: (params?: {
    page?: number;
    pageSize?: number;
    toolId?: string;
    status?: string;
  }) => request<PaginatedResponse<any>>('/tools/executions/history', { params: params as any }),
};

// --- SSE Helpers ---

export function subscribeDashboard(onMessage: (data: any) => void): () => void {
  const url = `${API_BASE}/events/dashboard`;
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  // EventSource doesn't support custom headers, so we use fetch-based SSE
  let aborted = false;

  async function connect() {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventData = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            eventData += line.slice(6);
          } else if (line === '' && eventData) {
            try {
              onMessage(JSON.parse(eventData));
            } catch { /* malformed JSON */ }
            eventData = '';
          }
        }
      }
    } catch {
      // Reconnect after delay
      if (!aborted) setTimeout(connect, 5000);
    }
  }

  connect();
  return () => { aborted = true; };
}

// --- CSV Export ---

export function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map((row) =>
    keys
      .map((k) => {
        const val = row[k];
        if (val == null) return '';
        const str = String(val);
        // Escape CSV values with commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
