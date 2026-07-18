import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Reimbursement {
  id: string;
  reimbursementNumber: string;
  insuredMember: { id: string; fullName: string };
  requestedValue: number;
  eligibleValue?: number | null;
  finalValue?: number | null;
  status: string;
  createdAt: string;
}

export async function listReimbursements(status?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<Reimbursement[]>>('/reimbursements', { params: { status } });
  return data.data;
}

export interface CreateReimbursementPayload {
  insuredMemberId: string;
  description?: string;
  requestedValue: number;
  bankDetails?: string;
}

export async function createReimbursement(payload: CreateReimbursementPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Reimbursement>>('/reimbursements', payload);
  return data.data;
}

export async function updateReimbursementStatus(id: string, status: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<Reimbursement>>(`/reimbursements/${id}/status`, { status });
  return data.data;
}
