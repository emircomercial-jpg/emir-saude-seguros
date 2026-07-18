# Arquitectura — EMIR SAÚDE SEGUROS

## Visão geral

Monorepo com dois pacotes principais (`frontend` e `backend`), geridos por
npm workspaces, e uma base de dados PostgreSQL partilhada, orquestrados via
Docker Compose.

```
[React + Vite PWA] <--REST/JSON--> [NestJS API] <--Prisma--> [PostgreSQL]
```

## Backend (Bloco 3 — fundação)

```
backend/src/
├── main.ts                        # bootstrap: Helmet, CORS, cookies, Swagger, body limits
├── app.module.ts                  # ConfigModule, ThrottlerModule, DatabaseModule, providers globais
├── config/
│   ├── configuration.ts           # configuração tipada, lida a partir do .env
│   └── env.validation.ts          # validação estrita das variáveis de ambiente
├── database/
│   ├── prisma.service.ts          # cliente Prisma, módulo global
│   └── database.module.ts
├── health/
│   ├── health.controller.ts       # GET /api/health
│   └── health.module.ts
└── common/
    ├── filters/http-exception.filter.ts    # padrão de resposta de erro (secção 25)
    ├── interceptors/response.interceptor.ts # padrão de resposta de sucesso (secção 25)
    └── middleware/logger.middleware.ts      # logs seguros (nunca regista o corpo do pedido)
```

Providers globais registados em `app.module.ts`:
- `APP_GUARD` → `ThrottlerGuard` (rate limiting)
- `APP_PIPE` → `ValidationPipe` (validação e sanitização de DTOs)
- `APP_FILTER` → `HttpExceptionFilter`
- `APP_INTERCEPTOR` → `ResponseInterceptor`

## Autenticação (Bloco 4)

```
backend/src/auth/
├── auth.service.ts       # login, refresh, logout, forgot/reset/change password, devices
├── auth.controller.ts    # rotas + gestão do cookie HTTP-only do refresh token
├── auth.module.ts
├── strategies/jwt.strategy.ts
└── dto/                  # login, forgot-password, reset-password, change-password

backend/src/common/
├── decorators/
│   ├── public.decorator.ts          # @Public() — isenta uma rota do JwtAuthGuard
│   ├── current-user.decorator.ts    # @CurrentUser() — utilizador autenticado
│   └── permissions.decorator.ts     # @RequirePermissions(...)
├── guards/
│   ├── jwt-auth.guard.ts            # global — exige token válido, salvo @Public()
│   └── permissions.guard.ts         # RBAC real, activo apenas com @RequirePermissions
└── utils/
    ├── device-info.util.ts          # heurística simples a partir do User-Agent
    └── duration.util.ts             # conversão "15m"/"7d" → milissegundos

backend/src/email/          # interface + implementação de desenvolvimento (mostra o
                             # token no terminal; produção ligaria um fornecedor real)
backend/src/audit/          # AuditService.log() — escrita apenas; consulta no Bloco 5
```

Guards globais (por ordem de execução, definidos em `app.module.ts`):
`ThrottlerGuard` → `JwtAuthGuard` → `PermissionsGuard`.

## Frontend (Bloco 6)

```
frontend/src/
├── main.tsx / App.tsx        # bootstrap; QueryClientProvider + BrowserRouter
├── routes/
│   ├── AppRoutes.tsx          # árvore de rotas
│   ├── ProtectedRoute.tsx     # exige sessão (redirecciona para /login)
│   └── PublicRoute.tsx        # redirecciona para /dashboard se já autenticado
├── stores/authStore.ts        # Zustand — access token e utilizador EM MEMÓRIA
│                               # (nunca em localStorage — secção 7 do briefing)
├── services/
│   ├── apiClient.ts           # Axios + renovação automática do access token (401 → refresh → retry)
│   └── authService.ts         # login, logout, me, forgot/reset/change-password, devices
├── hooks/
│   ├── useAuthBootstrap.ts    # restaura a sessão a partir do cookie de refresh ao arrancar
│   └── usePermissions.ts      # verificação de perfis no frontend (camada de conveniência)
├── components/ui/             # Shadcn UI (button, input, label) — base para os formulários do Bloco 7
├── types/                     # ApiResponse, AuthUser, Role
├── config/                    # env.ts, queryClient.ts
└── pages/                     # cada módulo com uma página placeholder ("Em desenvolvimento"),
                                # substituída por conteúdo real no Bloco 7
```

Fluxo de autenticação no frontend:
1. Ao carregar a app, `useAuthBootstrap` chama `POST /auth/refresh` (cookie HTTP-only) para tentar obter um novo access token sem exigir novo login.
2. O access token vive apenas em memória (`authStore`); nunca é persistido.
3. Se uma chamada à API responder `401`, o `apiClient` tenta renovar o token uma vez (evitando loops) e repete o pedido original.
4. Se a renovação falhar, a sessão é terminada no frontend e `ProtectedRoute` redirecciona para `/login`.

## Próximos blocos

- **Bloco 7**: páginas reais (login, layout administrativo, dashboard, utilizadores, perfis, auditoria, configurações, meu perfil).
- **Bloco 8**: PWA, IndexedDB (Dexie), cache offline, sincronização inicial.
- **Bloco 9**: testes, documentação final, revisão.

## Páginas reais (Bloco 7)

```
frontend/src/pages/
├── auth/{LoginPage,ForgotPasswordPage,ResetPasswordPage}.tsx
├── dashboard/DashboardPage.tsx     # KPIs 100% reais, gráficos (recharts)
├── users/UsersPage.tsx             # CRUD completo, filtros, paginação, perfis, estados, histórico, dispositivos
├── roles/RolesPage.tsx             # CRUD + matriz de permissões por módulo/acção
├── audit/AuditPage.tsx             # consulta com filtros (módulo, acção, período)
├── settings/SettingsPage.tsx       # edição agrupada por categoria
└── profile/ProfilePage.tsx         # dados pessoais, alteração de palavra-passe, dispositivos

frontend/src/components/layout/
├── AdminLayout.tsx      # junta sidebar + header + breadcrumb + footer
├── Sidebar.tsx           # versão desktop (recolhível) e mobile (painel deslizante)
├── Header.tsx            # pesquisa global funcional, indicador online/offline, menu da conta
├── Breadcrumb.tsx
└── Footer.tsx

frontend/src/components/ui/        # Dialog, Badge, Card, Select, Checkbox (Shadcn-style)
frontend/src/stores/{toastStore,uiStore}.ts   # notificações e estado do layout
```

Todas as acções destrutivas (eliminar perfil, remover dispositivo) pedem
confirmação antes de prosseguir. Todas as mutações mostram mensagens de
sucesso/erro (toasts) e estados de carregamento nos botões — nunca uma acção
silenciosa ou sem resposta visual.
