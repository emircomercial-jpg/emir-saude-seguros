import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface ReportOption {
  key: string;
  label: string;
}

export async function listReports() {
  const { data } = await apiClient.get<ApiSuccessResponse<ReportOption[]>>('/reports');
  return data.data;
}

// Descarrega o relatório directamente no browser (Excel ou PDF), sem
// recarregar a página nem depender de pop-ups.
export async function downloadReport(key: string, format: 'xlsx' | 'pdf') {
  const response = await apiClient.get(`/reports/${key}/export`, {
    params: { format },
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="(.+)"/);
  const filename = match?.[1] || `${key}.${format}`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
