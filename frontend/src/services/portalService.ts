import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export async function getInsuredPortalProfile() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/portal/insured/profile');
  return data.data;
}
export async function getInsuredPortalPolicies() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/insured/policies');
  return data.data;
}
export async function getInsuredPortalClaims() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/insured/claims');
  return data.data;
}
export async function getInsuredPortalReimbursements() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/insured/reimbursements');
  return data.data;
}
export async function getInsuredPortalAuthorizations() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/insured/authorizations');
  return data.data;
}
export async function getInsuredPortalPremiums() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/insured/premiums');
  return data.data;
}

// Descarrega o Cartão de Seguro do próprio cliente, directamente do
// Portal — usa o mesmo endpoint de impressão já usado pela equipa, o
// PortalService garante do lado do servidor que só se acede ao cartão do
// próprio segurado autenticado.
export async function downloadOwnInsuranceCard() {
  const response = await apiClient.get('/portal/insured/card.pdf', { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'cartao-de-seguro.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

// Descarrega o documento completo (contrato) de uma apólice do próprio
// cliente.
export async function downloadOwnPolicyContract(policyId: string, policyNumber: string) {
  const response = await apiClient.get(`/portal/insured/policies/${policyId}/contract.pdf`, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `apolice-${policyNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function getProviderPortalProfile() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/portal/provider/profile');
  return data.data;
}
export async function getProviderPortalAuthorizations() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/provider/authorizations');
  return data.data;
}
export async function getProviderPortalInvoices() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/portal/provider/invoices');
  return data.data;
}
