import { apiClient } from './apiClient';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';

export interface IntegrationApiKey {
  id: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface NewIntegrationApiKey extends IntegrationApiKey {
  key: string; // só vem preenchido na resposta de criação, nunca mais depois
}

export interface ExternalInvoice {
  id: string;
  source: string;
  externalId: string;
  invoiceNumber: string;
  customerName: string;
  customerTaxId: string | null;
  issueDate: string;
  dueDate: string | null;
  totalValue: number;
  status: string;
  items: { description: string; quantity: number; unitValue: number; totalValue: number }[] | null;
  receivedAt: string;
}

export async function listApiKeys() {
  const { data } = await apiClient.get<ApiSuccessResponse<IntegrationApiKey[]>>('/integrations/api-keys');
  return data.data;
}

export async function createApiKey(name: string) {
  const { data } = await apiClient.post<ApiSuccessResponse<NewIntegrationApiKey>>('/integrations/api-keys', { name });
  return data.data;
}

export async function revokeApiKey(id: string) {
  await apiClient.delete(`/integrations/api-keys/${id}`);
}

export async function listExternalInvoices(params: { status?: string; page?: number; pageSize?: number } = {}) {
  const { data } = await apiClient.get<ApiSuccessResponse<ExternalInvoice[]> & { meta: PaginationMeta }>(
    '/integrations/invoices',
    { params },
  );
  return { items: data.data, meta: data.meta };
}
