import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';
import type { PermissionItem } from './roleService';

export async function listPermissions() {
  const { data } = await apiClient.get<ApiSuccessResponse<PermissionItem[]>>('/permissions');
  return data.data;
}

export interface GroupedPermissions {
  module: string;
  permissions: PermissionItem[];
}

export async function listGroupedPermissions() {
  const { data } = await apiClient.get<ApiSuccessResponse<GroupedPermissions[]>>('/permissions/grouped');
  return data.data;
}
