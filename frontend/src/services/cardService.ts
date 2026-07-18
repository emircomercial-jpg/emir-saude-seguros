import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface InsuranceCard {
  id: string;
  cardNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
}

export async function issueCard(insuredMemberId: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuranceCard>>(`/cards/insured/${insuredMemberId}/issue`);
  return data.data;
}

export async function listCardsByInsured(insuredMemberId: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<InsuranceCard[]>>(`/cards/insured/${insuredMemberId}`);
  return data.data;
}

export async function blockCard(id: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuranceCard>>(`/cards/${id}/block`);
  return data.data;
}

export async function reportCardLost(id: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuranceCard>>(`/cards/${id}/report-lost`);
  return data.data;
}

export async function reportCardStolen(id: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuranceCard>>(`/cards/${id}/report-stolen`);
  return data.data;
}

export async function replaceCard(id: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuranceCard>>(`/cards/${id}/replace`);
  return data.data;
}

export interface ValidateCardResult {
  fullName: string;
  status: string;
  cardValidUntil?: string;
  dependentsCount: number;
}

export async function validateCard(params: { cardNumber?: string; idDocumentNumber?: string; qrToken?: string }) {
  const { data } = await apiClient.get<ApiSuccessResponse<ValidateCardResult>>('/cards/validate', { params });
  return data.data;
}
