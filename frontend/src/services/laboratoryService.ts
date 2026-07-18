import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface LabRequest {
  id: string;
  examName: string;
  status: string;
  requestedAt: string;
  insuredMember: { id: string; fullName: string };
  provider?: { id: string; name: string } | null;
  result?: { id: string; resultAttachmentUrl?: string | null; notes?: string | null } | null;
}

export async function listLabRequests(status?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<LabRequest[]>>('/laboratory/requests', { params: { status } });
  return data.data;
}

export async function createLabRequest(payload: { insuredMemberId: string; examName: string; providerId?: string }) {
  const { data } = await apiClient.post<ApiSuccessResponse<LabRequest>>('/laboratory/requests', payload);
  return data.data;
}

export async function setLabRequestStatus(id: string, status: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<LabRequest>>(`/laboratory/requests/${id}/status`, { status });
  return data.data;
}

export async function attachLabResult(id: string, payload: { resultAttachmentUrl: string; notes?: string }) {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/laboratory/requests/${id}/result`, payload);
  return data.data;
}
