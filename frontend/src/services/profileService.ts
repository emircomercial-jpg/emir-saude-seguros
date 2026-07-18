import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';
import type { AuthUser } from '@/types/auth';

export async function updateProfile(payload: { fullName: string; phone?: string }) {
  const { data } = await apiClient.patch<ApiSuccessResponse<AuthUser>>('/profile', payload);
  return data.data;
}
