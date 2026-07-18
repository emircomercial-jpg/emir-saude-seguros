import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Claim {
  id: string;
  claimNumber: string;
  insuredMember: { id: string; fullName: string };
  occurrenceType?: string | null;
  requestedValue?: number | null;
  approvedValue?: number | null;
  status: string;
  createdAt: string;
}

export async function listClaims(status?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<Claim[]>>('/claims', { params: { status } });
  return data.data;
}

export interface CreateClaimPayload {
  insuredMemberId: string;
  occurrenceType?: string;
  occurrenceDate?: string;
  location?: string;
  diagnosis?: string;
  requestedValue?: number;
}

export async function createClaim(payload: CreateClaimPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Claim>>('/claims', payload);
  return data.data;
}

export async function updateClaimStatus(id: string, payload: { status: string; analystNotes?: string; approvedValue?: number }) {
  const { data } = await apiClient.patch<ApiSuccessResponse<Claim>>(`/claims/${id}/status`, payload);
  return data.data;
}
