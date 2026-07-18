import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';
import type { AuthUser, LoginResponseData } from '@/types/auth';

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<LoginResponseData>>('/auth/login', {
    email,
    password,
  });
  return data.data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function logoutAll() {
  await apiClient.post('/auth/logout-all');
}

export async function fetchMe() {
  const { data } = await apiClient.get<ApiSuccessResponse<AuthUser>>('/auth/me');
  return data.data;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<null>>('/auth/forgot-password', { email });
  return data.message;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<null>>('/auth/reset-password', {
    token,
    newPassword,
  });
  return data.message;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<null>>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data.message;
}

export async function listDevices() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/auth/devices');
  return data.data;
}

export async function removeDevice(id: string) {
  await apiClient.delete(`/auth/devices/${id}`);
}
