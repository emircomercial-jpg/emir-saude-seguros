import { useCallback, useEffect, useState } from 'react';
import { runFullSync, type SyncStatus } from '@/sync/syncEngine';
import { getLastSyncAt } from '@/offline/cacheService';
import { useAuthStore } from '@/stores/authStore';

// Indicadores de internet, servidor e sincronização (secção 22 do briefing):
// - Online / Offline (navigator.onLine)
// - Servidor disponível / inacessível (GET /api/health)
// - Estado da sincronização e data/hora da última sincronização
// - Sincronização manual (accionada pelo utilizador) e automática (ao
//   recuperar ligação)
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const accessToken = useAuthStore((s) => s.accessToken);

  const sync = useCallback(async () => {
    if (!accessToken) return; // só sincroniza com sessão iniciada
    setStatus('checking');
    const result = await runFullSync();
    setStatus(result.status);
    if (result.syncedAt) setLastSyncAt(result.syncedAt);
  }, [accessToken]);

  useEffect(() => {
    getLastSyncAt().then(setLastSyncAt);
  }, []);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      sync(); // sincronização automática ao recuperar ligação
    }
    function handleOffline() {
      setOnline(false);
      setStatus('offline');
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  // Primeira sincronização assim que há sessão iniciada.
  useEffect(() => {
    if (accessToken) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return { status, online, lastSyncAt, syncNow: sync };
}
