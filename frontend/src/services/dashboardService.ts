import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export async function getSummary() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/summary');
  return data.data;
}
export async function getRevenueExpenses() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/revenue-expenses');
  return data.data;
}
export async function getMemberGrowth() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/member-growth');
  return data.data;
}
export async function getPlanUsage() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/plan-usage');
  return data.data;
}
export async function getAuthorizationStatus() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/authorization-status');
  return data.data;
}
export async function getRecentActivities() {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/dashboard/recent-activities');
  return data.data;
}
export async function getAlerts() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/alerts');
  return data.data;
}
export async function getSystemStatus() {
  const { data } = await apiClient.get<ApiSuccessResponse<any>>('/dashboard/system-status');
  return data.data;
}
