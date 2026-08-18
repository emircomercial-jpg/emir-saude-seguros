import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface PlatformOrganization {
  id: string;
  name: string;
  legalName: string | null;
  nif: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  userCount: number;
  insuredCount: number;
  policyCount: number;
}

export interface CreateOrganizationPayload {
  name: string;
  legalName?: string;
  nif?: string;
  phone?: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function listOrganizations() {
  const { data } = await apiClient.get<ApiSuccessResponse<PlatformOrganization[]>>('/platform/organizations');
  return data.data;
}

export async function createOrganization(payload: CreateOrganizationPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<{ organization: PlatformOrganization; admin: { email: string } }>>(
    '/platform/organizations',
    payload,
  );
  return data.data;
}

export async function updateOrganizationStatus(id: string, status: 'active' | 'suspended' | 'inactive') {
  const { data } = await apiClient.patch<ApiSuccessResponse<PlatformOrganization>>(`/platform/organizations/${id}/status`, { status });
  return data.data;
}
