import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Authorization {
  id: string;
  requestNumber: string;
  insuredMember: { id: string; fullName: string };
  provider?: { id: string; name: string } | null;
  type: string;
  priority: string;
  status: string;
  budget?: number | null;
  approvedValue?: number | null;
  createdAt: string;
}

export async function listAuthorizations(params: { status?: string } = {}) {
  const { data } = await apiClient.get<ApiSuccessResponse<Authorization[]>>('/authorizations', { params });
  return data.data;
}

export interface CreateAuthorizationPayload {
  insuredMemberId: string;
  providerId?: string;
  requestingDoctor?: string;
  type: string;
  diagnosisCode?: string;
  clinicalJustification?: string;
  requestedProcedure?: string;
  budget?: number;
  priority?: string;
}

export async function createAuthorization(payload: CreateAuthorizationPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Authorization>>('/authorizations', payload);
  return data.data;
}

export async function decideAuthorization(id: string, payload: { status: string; decisionNotes?: string; approvedValue?: number }) {
  const { data } = await apiClient.patch<ApiSuccessResponse<Authorization>>(`/authorizations/${id}/decision`, payload);
  return data.data;
}
