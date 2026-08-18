import { apiClient } from './apiClient';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';

export interface Dependent {
  id: string;
  fullName: string;
  relationship: string;
  birthDate: string;
  sex: string;
  status: string;
}

export interface InsuredMember {
  id: string;
  internalNumber: string;
  fullName: string;
  birthDate: string;
  sex: string;
  idDocumentNumber: string;
  nif?: string | null;
  phone?: string | null;
  whatsappOptIn?: boolean;
  email?: string | null;
  province?: string | null;
  municipality?: string | null;
  status: string;
  dependents: Dependent[];
  createdAt: string;
}

export interface QueryInsuredParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listInsured(params: QueryInsuredParams) {
  const { data } = await apiClient.get<ApiSuccessResponse<InsuredMember[]> & { meta: PaginationMeta }>('/insured', { params });
  return { items: data.data, meta: data.meta };
}

export async function getInsured(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<InsuredMember>>(`/insured/${id}`);
  return data.data;
}

export interface LookupByDocumentResult {
  found: boolean;
  type?: 'insured' | 'dependent';
  alreadyRegistered?: boolean;
  data?: {
    fullName: string;
    birthDate: string;
    sex: string;
    idDocumentNumber: string;
    phone?: string | null;
    internalNumber?: string;
  };
  dependentOf?: { fullName: string; internalNumber: string };
}

// Pesquisa prática por BI — preenche o formulário automaticamente quando a
// pessoa já existe no sistema (como Dependente de outro Segurado), ou
// avisa claramente se já estiver registada como Segurado (evita duplicar).
export async function lookupInsuredByDocument(idDocumentNumber: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<LookupByDocumentResult>>(
    `/insured/lookup/by-document/${encodeURIComponent(idDocumentNumber)}`,
  );
  return data.data;
}

export interface CreateInsuredPayload {
  fullName: string;
  birthDate: string;
  sex: string;
  idDocumentNumber: string;
  nif?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  email?: string;
  province?: string;
  municipality?: string;
  address?: string;
}

export async function createInsured(payload: CreateInsuredPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<InsuredMember>>('/insured', payload);
  return data.data;
}

export interface RegisterInsuredPayload extends CreateInsuredPayload {
  planId: string;
  dependents?: { relationship: string; fullName: string; birthDate: string; sex: string }[];
}

export interface RegisterInsuredResult {
  insured: InsuredMember;
  policy: { id: string; policyNumber: string };
  card: { id: string; cardNumber: string };
  dependents: { id: string; fullName: string }[];
}

// Registo completo "tudo num só ecrã": cria o Segurado, a Apólice (a partir
// do Plano escolhido), emite o Cartão de Seguro, e inclui os Dependentes —
// tudo numa única chamada, correspondendo à transacção atómica do backend
// (POST /insured/register).
export async function registerInsured(payload: RegisterInsuredPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<RegisterInsuredResult>>('/insured/register', payload);
  return data.data;
}

export async function updateInsured(id: string, payload: Partial<CreateInsuredPayload>) {
  const { data } = await apiClient.patch<ApiSuccessResponse<InsuredMember>>(`/insured/${id}`, payload);
  return data.data;
}

export async function deleteInsured(id: string) {
  await apiClient.delete(`/insured/${id}`);
}

export async function setInsuredStatus(id: string, status: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<InsuredMember>>(`/insured/${id}/status`, { status });
  return data.data;
}

export async function addDependent(insuredId: string, payload: { relationship: string; fullName: string; birthDate: string; sex: string }) {
  const { data } = await apiClient.post<ApiSuccessResponse<Dependent>>(`/insured/${insuredId}/dependents`, payload);
  return data.data;
}

export async function removeDependent(dependentId: string) {
  await apiClient.delete(`/insured/dependents/${dependentId}`);
}

// Cria o acesso ao Portal do Cliente para este Segurado — devolve a senha
// temporária UMA ÚNICA VEZ, para dar ao cliente (nunca fica recuperável
// depois disto).
export async function createPortalAccess(insuredId: string, email: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<{ email: string; temporaryPassword: string }>>(
    `/insured/${insuredId}/portal-access`,
    { email },
  );
  return data.data;
}
