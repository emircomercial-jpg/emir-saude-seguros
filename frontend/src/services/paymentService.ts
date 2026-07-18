import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Premium {
  id: string;
  referenceMonth: string;
  dueDate: string;
  value: number;
  status: string;
  insuredMember?: { id: string; fullName: string } | null;
  company?: { id: string; legalName: string } | null;
  payments: { id: string; amount: number }[];
}

export async function listPremiums(params: { status?: string } = {}) {
  const { data } = await apiClient.get<ApiSuccessResponse<Premium[]>>('/payments/premiums', { params });
  return data.data;
}

export interface CreatePremiumPayload {
  insuredMemberId?: string;
  referenceMonth: string;
  dueDate: string;
  value: number;
}

export async function createPremium(payload: CreatePremiumPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Premium>>('/payments/premiums', payload);
  return data.data;
}

export async function registerPayment(payload: { premiumId: string; amount: number; method: string }) {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>('/payments/pay', payload);
  return data.data;
}
