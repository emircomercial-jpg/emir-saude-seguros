import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface PlanCoverage {
  id: string;
  name: string;
  coveredPercentage: number;
  requiresAuthorization: boolean;
}

export interface HealthPlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  monthlyValue: number;
  annualLimit?: number | null;
  maxDependents?: number | null;
  waitingPeriodDays?: number | null;
  status: string;
  coverages: PlanCoverage[];
}

export async function listPlans() {
  const { data } = await apiClient.get<ApiSuccessResponse<HealthPlan[]>>('/plans');
  return data.data;
}

export interface CreatePlanPayload {
  name: string;
  code: string;
  description?: string;
  monthlyValue: number;
  annualLimit?: number;
  maxDependents?: number;
  waitingPeriodDays?: number;
  copaymentPercentage?: number;
}

export async function createPlan(payload: CreatePlanPayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<HealthPlan>>('/plans', payload);
  return data.data;
}

export async function setPlanStatus(id: string, status: 'active' | 'inactive') {
  const { data } = await apiClient.patch<ApiSuccessResponse<HealthPlan>>(`/plans/${id}/status`, { status });
  return data.data;
}

export async function deletePlan(id: string) {
  await apiClient.delete(`/plans/${id}`);
}

export async function addCoverage(planId: string, payload: { name: string; coveredPercentage: number; requiresAuthorization?: boolean }) {
  const { data } = await apiClient.post<ApiSuccessResponse<PlanCoverage>>(`/plans/${planId}/coverages`, payload);
  return data.data;
}

export async function removeCoverage(planId: string, coverageId: string) {
  await apiClient.delete(`/plans/${planId}/coverages/${coverageId}`);
}
