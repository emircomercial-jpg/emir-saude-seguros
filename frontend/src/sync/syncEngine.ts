import axios from 'axios';
import { db } from '@/offline/db';
import { env } from '@/config/env';
import { refreshAllCaches } from '@/offline/cacheService';

export type SyncStatus = 'idle' | 'checking' | 'syncing' | 'synced' | 'offline' | 'server_unreachable' | 'error';

// Serviço de sincronização centralizado (secção 22 do briefing).
//
// Nesta fase (Bloco 8), os módulos de negócio que escrevem dados offline
// ainda não existem — por isso a fila de sincronização (sync_queue) está
// preparada e funcional (enqueue/list/clear), mas apenas os dados de
// REFERÊNCIA (dashboard, definições, permissões, perfil) são efectivamente
// sincronizados/colocados em cache neste bloco. Operações de escrita
// continuam a exigir ligação directa ao servidor, conforme instruído:
// "Criação e edição de operações críticas não devem ser confirmadas offline."

export async function checkServerReachable(): Promise<boolean> {
  try {
    await axios.get(`${env.apiUrl}/health`, { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

// Adiciona uma operação à fila local de sincronização. Nunca aceitar aqui
// senhas, tokens de acesso/refresh ou qualquer segredo.
export async function enqueueSyncOperation(entity: string, operation: 'create' | 'update' | 'delete', payload: unknown) {
  await db.syncQueue.add({
    operationId: crypto.randomUUID(),
    entity,
    operation,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
}

export async function listPendingSyncItems() {
  return db.syncQueue.where('status').equals('pending').toArray();
}

export async function countPendingSyncItems() {
  return db.syncQueue.where('status').equals('pending').count();
}

// Executa uma sincronização completa: verifica ligação, actualiza as caches
// de referência, e (quando existirem operações pendentes de escrita de
// módulos futuros) tenta processá-las via POST /api/sync/push.
export async function runFullSync(): Promise<{ status: SyncStatus; syncedAt?: string }> {
  if (!navigator.onLine) {
    return { status: 'offline' };
  }

  const reachable = await checkServerReachable();
  if (!reachable) {
    return { status: 'server_unreachable' };
  }

  try {
    const syncedAt = await refreshAllCaches();
    return { status: 'synced', syncedAt };
  } catch {
    return { status: 'error' };
  }
}
