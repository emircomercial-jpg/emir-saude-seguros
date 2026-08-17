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
// já usava a aplicação). Agora verifica a cada 60 segundos e recarrega
// automaticamente assim que houver uma versão nova disponível.
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => registration.update(), 60_000);
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
