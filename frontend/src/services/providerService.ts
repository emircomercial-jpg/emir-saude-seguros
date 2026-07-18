import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Provider {
  id: string;
  name: string;
  nif: string;
  type: string;
  licenseNumber?: string | null;
  responsibleName?: string | null;
  phone?: string | null;
  email?: string | null;
  province?: string | null;
  municipality?: string | null;
  status: string;
}

export async function listProviders(params: { type?: string; search?: string } = {}) {
  const { data } = await apiClient.get<ApiSuccessResponse<Provider[]>>('/providers', { params });
  return data.data;
}

export interface CreateProviderPayload {
  name: string;
  nif: string;
  type: string;
  licenseNumber?: string;
  responsibleName?: string;
  phone?: string;
  email?: string;
  province?: string;
  municipality?: string;
}

export async function createProvider(payload: CreateProviderPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Provider>>('/providers', payload);
  return data.data;
}

export async function setProviderStatus(id: string, status: 'active' | 'suspended' | 'under_review') {
  const { data } = await apiClient.patch<ApiSuccessResponse<Provider>>(`/providers/${id}/status`, { status });
  return data.data;
}

export async function deleteProvider(id: string) {
  await apiClient.delete(`/providers/${id}`);
}
