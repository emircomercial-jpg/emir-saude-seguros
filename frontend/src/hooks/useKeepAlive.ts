import { useEffect } from 'react';
import { env } from '@/config/env';

// Mantém o servidor "acordado" durante uma sessão de uso activa —
// o plano gratuito do servidor adormece ao fim de 15 minutos sem
// nenhum pedido, e demora até 50 segundos a arrancar de novo. Um "ping"
// silencioso a cada 10 minutos, só enquanto a aba está visível (não faz
// sentido gastar pedidos com a aplicação minimizada ou em segundo plano),
// evita que isso aconteça a meio de uma sessão em que a pessoa só está a
// ler o ecrã sem clicar em nada por uns minutos.
export function useKeepAlive() {
  useEffect(() => {
    const PING_INTERVAL_MS = 10 * 60 * 1000;

    function ping() {
      if (document.visibilityState !== 'visible') return;
      fetch(`${env.apiUrl}/health`).catch(() => undefined);
    }

    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
