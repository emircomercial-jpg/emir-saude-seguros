import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface PolicyMember {
  id: string;
  insuredMember: { id: string; fullName: string; internalNumber: string };
}

export interface Policy {
  id: string;
  policyNumber: string;
  plan: { id: string; name: string };
  company?: { id: string; legalName: string } | null;
  issueDate: string;
  startDate: string;
  endDate: string;
  value: number;
  paymentMode: string;
  status: string;
  members: PolicyMember[];
  signatureHash?: string | null;
  signedAt?: string | null;
  signedByName?: string | null;
}

export async function listPolicies(status?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<Policy[]>>('/policies', { params: { status } });
  return data.data;
}

export interface CreatePolicyPayload {
  planId: string;
  companyId?: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  value: number;
  paymentMode: string;
  insuredMemberIds?: string[];
}

export async function createPolicy(payload: CreatePolicyPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Policy>>('/policies', payload);
  return data.data;
}

export async function renewPolicy(id: string, endDate: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<Policy>>(`/policies/${id}/renew`, { endDate });
  return data.data;
}

export async function setPolicyStatus(id: string, status: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<Policy>>(`/policies/${id}/status`, { status });
  return data.data;
}

export async function addPolicyMember(id: string, insuredMemberId: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<Policy>>(`/policies/${id}/members`, { insuredMemberId });
  return data.data;
}

export async function removePolicyMember(id: string, insuredMemberId: string) {
  const { data } = await apiClient.delete<ApiSuccessResponse<Policy>>(`/policies/${id}/members/${insuredMemberId}`);
  return data.data;
}

export async function signPolicy(id: string, signedByName: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<Policy>>(`/policies/${id}/sign`, { signedByName });
  return data.data;
}

export interface SignatureVerification {
  signed: boolean;
  valid: boolean;
  signedAt?: string;
  signedByName?: string;
}

export async function verifyPolicySignature(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<SignatureVerification>>(`/policies/${id}/verify-signature`);
  return data.data;
}

export async function downloadPolicyContract(id: string, policyNumber: string) {
  const response = await apiClient.get(`/policies/${id}/contract.pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `apolice-${policyNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
