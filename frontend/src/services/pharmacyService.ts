import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export interface Medicine {
  id: string;
  name: string;
  activeIngredient?: string | null;
  isGeneric: boolean;
  isCovered: boolean;
  requiresAuthorization: boolean;
  monthlyLimitQuantity?: number | null;
}

export async function listMedicines(search?: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<Medicine[]>>('/pharmacy/medicines', { params: { search } });
  return data.data;
}

export interface CreateMedicinePayload {
  name: string;
  activeIngredient?: string;
  isGeneric?: boolean;
  isCovered?: boolean;
  requiresAuthorization?: boolean;
  monthlyLimitQuantity?: number;
  copaymentPercentage?: number;
}

export async function createMedicine(payload: CreateMedicinePayload) {
  const { data } = await apiClient.post<ApiSuccessResponse<Medicine>>('/pharmacy/medicines', payload);
  return data.data;
}

export async function createPrescription(payload: { insuredMemberId: string; medicineId: string; quantity: number; prescriberName?: string }) {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>('/pharmacy/prescriptions', payload);
  return data.data;
}

export async function dispenseMedicine(payload: { prescriptionId: string; quantity: number; providerId?: string; value?: number }) {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>('/pharmacy/dispenses', payload);
  return data.data;
}

export async function listDispenses(insuredMemberId: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<any[]>>('/pharmacy/dispenses', { params: { insuredMemberId } });
  return data.data;
}
