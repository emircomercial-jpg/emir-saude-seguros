# Offline-First e Sincronização — EMIR SAÚDE SEGUROS

> Este documento será preenchido no Bloco 8, com a estratégia de cache local
> (Dexie/IndexedDB), a fila de sincronização (`sync_queue`) e as regras de
> resolução de conflitos entre cliente e servidor.

## Implementação (Bloco 8)

### IndexedDB (Dexie) — `frontend/src/offline/db.ts`

Tabelas locais:
- `settingsCache`, `profileCache`, `permissionsCache`, `dashboardCache` — dados de referência para consulta offline.
- `syncQueue` — fila de operações pendentes (preparada para os módulos de negócio de fases futuras; cada item tem um `operationId` único gerado no cliente, para nunca duplicar um envio reenviado por falha de rede).
- `appMeta` — guarda `last_sync_at`.

**Nunca guardados aqui:** senhas, tokens de acesso/refresh, ou qualquer segredo.

### Indicadores (`frontend/src/hooks/useSyncStatus.ts`, usado no cabeçalho)

- **Online/Offline**: `navigator.onLine` + eventos `online`/`offline`.
- **Servidor disponível**: `GET /api/health` com timeout de 4s.
- **Estado da sincronização**: `idle | checking | syncing | synced | offline | server_unreachable | error`.
- **Última sincronização**: mostrada como tooltip sobre o indicador.
- **Sincronização manual**: clicar no indicador chama `runFullSync()`.
- **Sincronização automática**: disparada ao recuperar a ligação (`window.addEventListener('online', ...)`) e uma vez ao iniciar sessão.

### Regras de conflito e segurança aplicadas

- O dashboard mostra o último cache local quando a chamada à API falha (banner "a mostrar dados em cache de ...").
- Criação e edição de operações críticas (utilizadores, perfis, configurações) **nunca** são confirmadas offline — falham explicitamente, pedindo ligação à internet, em vez de dar uma falsa confirmação.
- A fila de sincronização (`enqueueSyncOperation`) está pronta a ser usada pelos módulos de negócio das fases seguintes deste sistema.

### PWA (`frontend/vite.config.ts`)

- Manifesto com nome, ícones, cor do tema (`#0F4C81`) e cor de fundo (`#F4F6F8`).
- Service Worker (`vite-plugin-pwa`, `registerType: autoUpdate`) com cache do shell da aplicação.
- `navigateFallback: /offline.html` — página offline dedicada quando a navegação falha sem cache disponível.
- Estratégia de cache seguindo a regra de segurança: **apenas pedidos GET à API** podem cair para cache (`NetworkFirst`); pedidos de escrita (POST/PATCH/DELETE) nunca passam pelo Service Worker.
