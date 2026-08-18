import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Regista o Service Worker com verificação activa de actualizações — sem
// isto, apesar de "registerType: autoUpdate" no vite.config.ts, o script
// gerado por omissão só regista o Service Worker uma única vez e nunca
// mais verifica se há uma versão nova, deixando quem já tem a aplicação
// aberta preso à versão antiga indefinidamente (bug real, encontrado ao
// verificar porque uma actualização publicada não estava a chegar a quem
// já usava a aplicação).
//
// Verificação em várias camadas, para nunca mais depender de uma limpeza
// manual de cache no futuro:
//  1. Imediatamente ao carregar a página.
//  2. A cada 60 segundos, enquanto a aplicação estiver aberta.
//  3. Sempre que a pessoa volta a esta aba depois de estar noutra
//     (visibilitychange) — é o momento mais provável de já existir uma
//     versão nova publicada entretanto.
//  4. Sempre que a janela recupera o foco.
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      registration.update();

      setInterval(() => registration.update(), 60_000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });

      window.addEventListener('focus', () => registration.update());
    },
    onNeedRefresh() {
      updateSW(true);
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
