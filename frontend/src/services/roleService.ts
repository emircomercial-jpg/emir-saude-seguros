import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface PermissionItem {
  id: string;
  module: string;
  action: string;
  code: string;
  description?: string | null;
}

export interface RoleItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  status: string;
  userCount: number;
  permissions: PermissionItem[];
}

export async function listRoles() {
  const { data } = await apiClient.get<ApiSuccessResponse<RoleItem[]>>('/roles');
  return data.data;
}

export async function getRole(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<RoleItem>>(`/roles/${id}`);
  return data.data;
}

export async function createRole(payload: { name: string; code: string; description?: string }) {
  const { data } = await apiClient.post<ApiSuccessResponse<RoleItem>>('/roles', payload);
  return data.data;
}

export async function updateRole(id: string, payload: { name?: string; description?: string }) {
  const { data } = await apiClient.patch<ApiSuccessResponse<RoleItem>>(`/roles/${id}`, payload);
  return data.data;
}

export async function deleteRole(id: string) {
  await apiClient.delete(`/roles/${id}`);
}

export async function setRoleStatus(id: string, status: 'active' | 'inactive') {
  const { data } = await apiClient.patch<ApiSuccessResponse<RoleItem>>(`/roles/${id}/status`, { status });
  return data.data;
}

export async function assignRolePermissions(id: string, permissionIds: string[]) {
  const { data } = await apiClient.patch<ApiSuccessResponse<RoleItem>>(`/roles/${id}/permissions`, { permissionIds });
  return data.data;
}
