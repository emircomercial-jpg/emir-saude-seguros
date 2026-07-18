import { apiClient } from './apiClient';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: { id: string; name: string; code: string }[];
}

export interface QueryUsersParams {
  search?: string;
  status?: string;
  roleId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listUsers(params: QueryUsersParams) {
  const { data } = await apiClient.get<ApiSuccessResponse<UserListItem[]> & { meta: PaginationMeta }>(
    '/users',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function getUser(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<UserListItem>>(`/users/${id}`);
  return data.data;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone?: string;
  temporaryPassword: string;
  mustChangePassword?: boolean;
  roleIds: string[];
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<UserListItem>>('/users', payload);
  return data.data;
}

export async function updateUser(id: string, payload: Partial<{ fullName: string; phone: string; avatarUrl: string }>) {
  const { data } = await apiClient.patch<ApiSuccessResponse<UserListItem>>(`/users/${id}`, payload);
  return data.data;
}

export async function deleteUser(id: string) {
  await apiClient.delete(`/users/${id}`);
}

export async function activateUser(id: string) {
  await apiClient.patch(`/users/${id}/activate`);
}

export async function suspendUser(id: string) {
  await apiClient.patch(`/users/${id}/suspend`);
}

export async function blockUser(id: string) {
  await apiClient.patch(`/users/${id}/block`);
}

export async function restoreUser(id: string) {
  await apiClient.patch(`/users/${id}/restore`);
}

export async function assignUserRoles(id: string, roleIds: string[]) {
  const { data } = await apiClient.patch<ApiSuccessResponse<UserListItem>>(`/users/${id}/roles`, { roleIds });
  return data.data;
}

export async function resetUserPassword(id: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<null>>(`/users/${id}/reset-password`);
  return data.message;
}

export async function getUserAuditLogs(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>(`/users/${id}/audit-logs`);
  return data.data;
}

export async function getUserDevices(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>(`/users/${id}/devices`);
  return data.data;
}

export async function linkUserToInsured(id: string, insuredMemberId: string | null) {
  const { data } = await apiClient.patch<ApiSuccessResponse<UserListItem>>(`/users/${id}/link-insured`, { insuredMemberId });
  return data.data;
}

export async function linkUserToProvider(id: string, providerId: string | null) {
  const { data } = await apiClient.patch<ApiSuccessResponse<UserListItem>>(`/users/${id}/link-provider`, { providerId });
  return data.data;
}
