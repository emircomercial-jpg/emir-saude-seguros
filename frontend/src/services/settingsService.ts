import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

export type SettingsByCategory = Record<string, { key: string; value: unknown }[]>;

export async function getSettings() {
  const { data } = await apiClient.get<ApiSuccessResponse<SettingsByCategory>>('/settings');
  return data.data;
}

export async function updateSettings(settings: { key: string; value: unknown }[]) {
  const { data } = await apiClient.patch<ApiSuccessResponse<SettingsByCategory>>('/settings', { settings });
  return data.data;
}
