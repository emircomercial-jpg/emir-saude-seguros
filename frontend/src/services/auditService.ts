import { apiClient } from './apiClient';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  entity?: string | null;
  entityId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string } | null;
}

export interface QueryAuditParams {
  userId?: string;
  module?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(params: QueryAuditParams) {
  const { data } = await apiClient.get<ApiSuccessResponse<AuditLogItem[]> & { meta: PaginationMeta }>(
    '/audit-logs',
    { params },
  );
  return { items: data.data, meta: data.meta };
}
