import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Consultation {
  id: string;
  insuredMember: { id: string; fullName: string };
  provider?: { id: string; name: string } | null;
  consultationType?: string | null;
  date: string;
  totalValue?: number | null;
  coveredValue?: number | null;
  copayment?: number | null;
}

export interface CoverageCheckResult {
  insured: { id: string; fullName: string; status: string; plan?: string };
  coverage?: { name: string; coveredPercentage: number; requiresAuthorization: boolean };
  alerts: string[];
}

export async function checkCoverage(insuredMemberId: string, coverageName?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<CoverageCheckResult>>(
    `/consultations/coverage-check/${insuredMemberId}`,
    { params: { coverageName } },
  );
  return data.data;
}

export async function listConsultations(insuredMemberId?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<Consultation[]>>('/consultations', { params: { insuredMemberId } });
  return data.data;
}

export interface CreateConsultationPayload {
  insuredMemberId: string;
  providerId?: string;
  doctorName?: string;
  specialty?: string;
  consultationType?: string;
  reason?: string;
  totalValue?: number;
}

export async function createConsultation(payload: CreateConsultationPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Consultation>>('/consultations', payload);
  return data.data;
}
