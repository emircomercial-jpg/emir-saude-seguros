import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  provider: { id: string; name: string };
  grossValue: number;
  approvedValue?: number | null;
  netValue?: number | null;
  status: string;
}

export async function listInvoices(status?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<Invoice[]>>('/billing/invoices', { params: { status } });
  return data.data;
}

export interface CreateInvoicePayload {
  providerId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  items: { description: string; value: number }[];
}

export async function createInvoice(payload: CreateInvoicePayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Invoice>>('/billing/invoices', payload);
  return data.data;
}

export async function setInvoiceStatus(id: string, status: string) {
  const { data } = await apiClient.patch<ApiSuccessResponse<Invoice>>(`/billing/invoices/${id}/status`, { status });
  return data.data;
}
