import { apiClient } from './apiClient';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';

export interface Company {
  id: string;
  legalName: string;
  tradeName?: string | null;
  nif: string;
  sector?: string | null;
  phone?: string | null;
  email?: string | null;
  planId?: string | null;
  plan?: { id: string; name: string } | null;
  monthlyValue?: number | null;
  status: string;
}

export async function listCompanies(params: { search?: string; page?: number; pageSize?: number } = {}) {
  const { data } = await apiClient.get<ApiSuccessResponse<Company[]> & { meta: PaginationMeta }>('/companies', { params });
  return { items: data.data, meta: data.meta };
}

export interface CreateCompanyPayload {
  legalName: string;
  tradeName?: string;
  nif: string;
  sector?: string;
  responsibleName?: string;
  phone?: string;
  email?: string;
  planId?: string;
  monthlyValue?: number;
}

export async function createCompany(payload: CreateCompanyPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Company>>('/companies', payload);
  return data.data;
}

export async function setCompanyStatus(id: string, status: 'active' | 'suspended' | 'cancelled') {
  const { data } = await apiClient.patch<ApiSuccessResponse<Company>>(`/companies/${id}/status`, { status });
  return data.data;
}

export async function deleteCompany(id: string) {
  await apiClient.delete(`/companies/${id}`);
}
