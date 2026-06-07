import type { ApiResponse, PageResult } from '@enterprise/shared-types';
import type { AuthSession, CreateTicketInput, ReviewTicketInput, Ticket } from '@enterprise/api-contracts';
import { useAuthStore } from './auth-store';
import { normalizeApiDates } from './datetime';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const redirectToLogin = () => {
  const base = import.meta.env.BASE_URL === '/' ? '/' : `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const loginPath = `${base}login`;
  useAuthStore.getState().clear();
  if (!window.location.pathname.endsWith('/login')) {
    window.location.assign(`${loginPath}?from=${encodeURIComponent(currentPath)}`);
  }
};

const request = async <T>(path: string, init: RequestInit = {}) => {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => ({
    success: false,
    data: null,
    error: { code: 'INVALID_RESPONSE', message: 'Invalid server response' },
    traceId: '',
  }))) as ApiResponse<T>;
  if (response.status === 401) {
    redirectToLogin();
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Request failed');
  }
  return normalizeApiDates(payload.data);
};

export const api = {
  login: (input: { username: string; password: string }) =>
    request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: () => request('/auth/me'),
  users: (query = 'page=1&pageSize=20') => request(`/users?${query}`),
  createUser: (input: {
    username: string;
    displayName: string;
    email?: string;
    phone?: string;
    password: string;
    roleIds: string[];
  }) => request('/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUserStatus: (id: string, status: 'active' | 'disabled') =>
    request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assignUserRoles: (id: string, roleIds: string[]) =>
    request(`/users/${id}/roles`, { method: 'PATCH', body: JSON.stringify({ roleIds }) }),
  roles: (query = 'page=1&pageSize=20') => request(`/roles?${query}`),
  createRole: (input: { name: string; code: string; description?: string; permissionCodes: string[] }) =>
    request('/roles', { method: 'POST', body: JSON.stringify(input) }),
  permissions: () =>
    request<{
      items: Array<{ id: string; code: string; name: string; resource: string; action: string; description?: string }>;
    }>('/permissions'),
  assignRolePermissions: (id: string, permissionCodes: string[]) =>
    request(`/roles/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissionCodes }),
    }),
  auditLogs: (query = 'page=1&pageSize=20') => request(`/audit/logs?${query}`),
  menus: () =>
    request<{
      items: Array<{
        id: string;
        name: string;
        routePath?: string;
        icon?: string;
        permissionCode?: string;
        sortOrder: number;
        visible: boolean;
        status: 'active' | 'disabled';
        updatedAt: string;
      }>;
    }>('/menus'),
  updateMenu: (
    id: string,
    input: {
      name?: string;
      icon?: string | null;
      permissionCode?: string | null;
      sortOrder?: number;
      visible?: boolean;
      status?: 'active' | 'disabled';
    },
  ) => request(`/menus/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  departments: () =>
    request<{
      items: Array<{
        id: string;
        parentId?: string | null;
        name: string;
        code: string;
        path: string;
        sortOrder: number;
        status: 'active' | 'disabled';
        userCount: number;
        ticketCount: number;
        updatedAt: string;
      }>;
    }>('/departments'),
  createDepartment: (input: { name: string; code: string; parentId?: string | null; sortOrder?: number }) =>
    request('/departments', { method: 'POST', body: JSON.stringify(input) }),
  updateDepartment: (id: string, input: { name?: string; sortOrder?: number; status?: 'active' | 'disabled' }) =>
    request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  dicts: () =>
    request<{
      items: Array<{
        id: string;
        name: string;
        code: string;
        description?: string;
        status: string;
        updatedAt: string;
        items: Array<{ id: string; label: string; value: string; color?: string; sortOrder: number; status: string }>;
      }>;
    }>('/config/dicts'),
  createDict: (input: { name: string; code: string; description?: string }) =>
    request('/config/dicts', { method: 'POST', body: JSON.stringify(input) }),
  createDictItem: (id: string, input: { label: string; value: string; color?: string; sortOrder?: number }) =>
    request(`/config/dicts/${id}/items`, { method: 'POST', body: JSON.stringify(input) }),
  featureFlags: () =>
    request<{
      items: Array<{ id: string; name: string; code: string; description?: string; enabled: boolean; updatedAt: string }>;
    }>('/config/feature-flags'),
  updateFeatureFlag: (id: string, input: { enabled: boolean; description?: string | null }) =>
    request(`/config/feature-flags/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  tickets: (query = 'page=1&pageSize=20') => request<PageResult<Ticket>>(`/tickets?${query}`),
  ticket: (id: string) => request<Ticket & { workflow?: unknown; comments?: unknown[] }>(`/tickets/${id}`),
  createTicket: (input: CreateTicketInput) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(input) }),
  submitTicket: (id: string) => request<Ticket>(`/tickets/${id}/submit`, { method: 'POST' }),
  commentTicket: (id: string, input: { content: string }) =>
    request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(input) }),
  withdrawTicket: (id: string, input: { comment?: string }) =>
    request<Ticket>(`/tickets/${id}/withdraw`, { method: 'POST', body: JSON.stringify(input) }),
  closeTicket: (id: string, input: { comment?: string }) =>
    request<Ticket>(`/tickets/${id}/close`, { method: 'POST', body: JSON.stringify(input) }),
  approveTicket: (id: string, input: ReviewTicketInput) =>
    request<Ticket>(`/tickets/${id}/approve`, { method: 'POST', body: JSON.stringify(input) }),
  rejectTicket: (id: string, input: ReviewTicketInput) =>
    request<Ticket>(`/tickets/${id}/reject`, { method: 'POST', body: JSON.stringify(input) }),
  myTasks: () => request<Array<{ id: string; createdAt: string; ticket: Ticket }>>('/workflow/tasks/my'),
  workflowTemplates: () =>
    request<{
      items: Array<{
        id: string;
        name: string;
        code: string;
        resourceType: string;
        version: number;
        status: string;
        nodeCount: number;
        edgeCount: number;
        instanceCount: number;
        nodes: Array<{ id: string; nodeKey: string; nodeType: string; name: string; assigneeType?: string }>;
        edges: Array<{ id: string; sourceNodeKey: string; targetNodeKey: string; conditionConfig?: unknown }>;
        updatedAt: string;
      }>;
    }>('/workflow/templates'),
  notifications: () =>
    request<{
      items: Array<{
        id: string;
        title: string;
        content: string;
        level: 'info' | 'success' | 'warning' | 'error';
        readAt: string | null;
        createdAt: string;
      }>;
    }>('/notifications'),
  createNotification: (input: {
    title: string;
    content: string;
    level?: 'info' | 'success' | 'warning' | 'error';
    userId?: string | null;
  }) => request('/notifications', { method: 'POST', body: JSON.stringify(input) }),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  files: () =>
    request<{
      items: Array<{
        id: string;
        name: string;
        mimeType: string;
        size: number;
        url: string;
        visibility: 'private' | 'internal' | 'public';
        uploaderName: string;
        createdAt: string;
      }>;
    }>('/files'),
  createFile: (input: {
    name: string;
    mimeType: string;
    size: number;
    url: string;
    visibility?: 'private' | 'internal' | 'public';
  }) => request('/files', { method: 'POST', body: JSON.stringify(input) }),
  operationReport: () =>
    request<{
      metrics: {
        ticketTotal: number;
        approvingTickets: number;
        approvedTickets: number;
        users: number;
        auditLogs: number;
        files: number;
        notifications: number;
      };
      ticketStatus: Array<{ name: string; value: number }>;
      ticketPriority: Array<{ name: string; value: number }>;
      ticketTrend: Array<{ date: string; type: string; value: number }>;
      auditTrend: Array<{ date: string; count: number }>;
      departmentRanking: Array<{ name: string; value: number }>;
      applicantRanking: Array<{ name: string; value: number }>;
    }>('/reports/operations'),
  systemMonitor: () =>
    request<{
      service: { status: string; nodeEnv: string; uptimeSeconds: number; startedAt: string };
      database: { status: string; latencyMs: number };
      memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
      modules: Array<{ name: string; value: number }>;
      recentAuditLogs: Array<{
        id: string;
        action: string;
        resource: string;
        actorName: string;
        traceId: string;
        createdAt: string;
      }>;
    }>('/system/monitor'),
};
