import { db } from './db';
import { getSettings } from '@/services/settingsService';
import { listPermissions } from '@/services/permissionService';
import { getSummary } from '@/services/dashboardService';
import { fetchMe } from '@/services/authService';

// Camada de cache offline (secção 22 do briefing).
//
// Regras aplicadas:
// - o dashboard pode mostrar o último cache quando fica offline;
// - listas já carregadas permanecem disponíveis em modo de leitura;
// - nunca se guarda aqui nada sensível (senhas, tokens) — apenas dados já
//   públicos para o utilizador autenticado, devolvidos pela própria API.
export async function refreshAllCaches() {
  const [settings, permissions, dashboard, profile] = await Promise.all([
    getSettings(),
    listPermissions(),
    getSummary(),
    fetchMe(),
  ]);

  const updatedAt = new Date().toISOString();

  await Promise.all([
    db.settingsCache.put({ id: 'system_settings', data: settings, updatedAt }),
    db.permissionsCache.put({ id: 'permissions_catalog', data: permissions, updatedAt }),
    db.dashboardCache.put({ id: 'dashboard_summary', data: dashboard, updatedAt }),
    db.profileCache.put({ id: 'my_profile', data: profile, updatedAt }),
  ]);

  await db.appMeta.put({ key: 'last_sync_at', value: updatedAt });

  return updatedAt;
}

export async function getCachedDashboard() {
  return db.dashboardCache.get('dashboard_summary');
}

export async function getCachedProfile() {
  return db.profileCache.get('my_profile');
}

export async function getCachedSettings() {
  return db.settingsCache.get('system_settings');
}

export async function getCachedPermissions() {
  return db.permissionsCache.get('permissions_catalog');
}

export async function getLastSyncAt(): Promise<string | null> {
  const meta = await db.appMeta.get('last_sync_at');
  return meta?.value ?? null;
}
