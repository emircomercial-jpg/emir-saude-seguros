import Dexie, { type Table } from 'dexie';

// Base de dados local (IndexedDB via Dexie) — fundação do offline-first
// (secção 22 do briefing). Guarda dados de referência em cache (para leitura
// sem internet) e a fila de operações pendentes de sincronização.
//
// REGRA DE SEGURANÇA: nunca guardar senhas, tokens de acesso/refresh, ou
// qualquer segredo nesta base de dados local — apenas dados já devolvidos
// pela API para consulta offline.

export interface CachedSettings {
  id: 'system_settings';
  data: unknown;
  updatedAt: string;
}

export interface CachedProfile {
  id: 'my_profile';
  data: unknown;
  updatedAt: string;
}

export interface CachedPermissions {
  id: 'permissions_catalog';
  data: unknown;
  updatedAt: string;
}

export interface CachedDashboard {
  id: 'dashboard_summary';
  data: unknown;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  operationId: string; // gerado no cliente — evita duplicação ao reenviar
  entity: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'synced' | 'error';
  errorMessage?: string;
}

export interface AppMeta {
  key: 'last_sync_at';
  value: string;
}

class EmirLocalDatabase extends Dexie {
  settingsCache!: Table<CachedSettings, string>;
  profileCache!: Table<CachedProfile, string>;
  permissionsCache!: Table<CachedPermissions, string>;
  dashboardCache!: Table<CachedDashboard, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  appMeta!: Table<AppMeta, string>;

  constructor() {
    super('emir_saude_seguros_local');
    this.version(1).stores({
      settingsCache: 'id',
      profileCache: 'id',
      permissionsCache: 'id',
      dashboardCache: 'id',
      syncQueue: '++id, status, entity, createdAt',
      appMeta: 'key',
    });
  }
}

export const db = new EmirLocalDatabase();
