import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface InsuranceAgreement {
  id: string;
  agencyName: string;
  agencyNif: string | null;
  agreementType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  scope: string | null;
  notes: string | null;
}

export interface CreateAgreementPayload {
  agencyName: string;
  agencyNif?: string;
  agreementType: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  startDate: string;
  endDate?: string;
  scope?: string;
  notes?: string;
}

export async function listAgreements() {
  const { data } = await apiClient.get<ApiSuccessResponse<InsuranceAgreement[]>>('/agreements');
  return data.data;
}

export async function createAgreement(payload: CreateAgreementPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuranceAgreement>>('/agreements', payload);
  return data.data;
}

export async function updateAgreementStatus(id: string, status: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<InsuranceAgreement>>(`/agreements/${id}`, { status });
  return data.data;
}

export async function deleteAgreement(id: string) {
  await apiClient.delete(`/agreements/${id}`);
}
