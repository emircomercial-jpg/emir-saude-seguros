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

// O PDF do cartão exige autenticação (token no cabeçalho, não em cookie),
// por isso não pode ser aberto directamente como um link — é preciso
// pedir o ficheiro através do cliente HTTP já autenticado, e só depois
// abri-lo (como um URL temporário local) numa nova aba, pronto a imprimir.
export async function printCardPdf(cardId: string) {
  const response = await apiClient.get(`/cards/${cardId}/print.pdf`, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(response.data);
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
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
