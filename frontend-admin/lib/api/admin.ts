import { apiClient } from './client';

export interface DashboardStats {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
  deleted_users: number;
}

export interface AdminUserListItem {
  id: string;
  member_id: string;
  email: string;
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
  stats: { posts_count: number; followers_count: number; following_count: number };
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  profile_visibility: string | null;
  preferred_language: string;
  timezone: string;
  stats: {
    posts_count: number;
    followers_count: number;
    following_count: number;
    comments_count: number | null;
    vital_records_count: number | null;
    meal_records_count: number | null;
  };
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export const adminApi = {
  logAccess: () => apiClient.post('/api/v1/admin/audit/access'),

  getDashboard: () => apiClient.get<DashboardStats>('/api/v1/admin/stats/dashboard'),

  getUsers: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
    include_deleted?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
  }) => apiClient.get<AdminUserListResponse>('/api/v1/admin/users', { params }),

  getUser: (id: string) => apiClient.get<AdminUserDetail>(`/api/v1/admin/users/${id}`),

  updateUser: (id: string, data: Partial<AdminUserDetail>) =>
    apiClient.put<AdminUserDetail>(`/api/v1/admin/users/${id}`, data),

  setUserStatus: (id: string, is_active: boolean, reason?: string) =>
    apiClient.patch<AdminUserDetail>(`/api/v1/admin/users/${id}/status`, { is_active, reason }),

  deleteUser: (id: string, reason?: string) =>
    apiClient.delete<{ message: string; user_id: string }>(`/api/v1/admin/users/${id}`, {
      params: reason ? { reason } : undefined,
    }),

  getAuditLogs: (params?: { page?: number; per_page?: number; action?: string }) =>
    apiClient.get<AuditLogListResponse>('/api/v1/admin/audit/logs', { params }),
};
