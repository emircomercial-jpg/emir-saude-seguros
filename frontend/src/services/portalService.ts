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
