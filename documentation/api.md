# Referência da API — EMIR SAÚDE SEGUROS (Bloco 4)

## Padrão de resposta

Ver Bloco 3 — mantém-se inalterado (`ResponseInterceptor` / `HttpExceptionFilter`).

## Autenticação

Todas as rotas exigem um `Authorization: Bearer <accessToken>` válido, **excepto**
as marcadas como públicas (`@Public()`): login, refresh, logout, forgot-password,
reset-password e health check.

O refresh token nunca é devolvido no corpo da resposta — é sempre gravado
como cookie HTTP-only, assinado e restrito ao caminho `/api/auth`
(`Set-Cookie: refreshToken=...; HttpOnly; SameSite=Lax; Path=/api/auth`).

| Método | Rota | Pública | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | Sim | Autentica com e-mail/palavra-passe; devolve `accessToken` + define cookie de refresh |
| POST | `/api/auth/logout` | Sim | Revoga o refresh token actual e limpa o cookie |
| POST | `/api/auth/refresh` | Sim | Roda o refresh token (revoga o antigo, emite um novo) e devolve novo `accessToken` |
| POST | `/api/auth/forgot-password` | Sim | Gera token de recuperação (mostrado no terminal, via `EmailService` de desenvolvimento) |
| POST | `/api/auth/reset-password` | Sim | Redefine a palavra-passe a partir do token; termina todas as sessões activas |
| POST | `/api/auth/change-password` | Não | Altera a palavra-passe do utilizador autenticado |
| POST | `/api/auth/logout-all` | Não | Termina a sessão em todos os dispositivos |
| GET | `/api/auth/me` | Não | Dados do utilizador autenticado (perfis incluídos) |
| GET | `/api/auth/devices` | Não | Lista os dispositivos associados à conta |
| DELETE | `/api/auth/devices/:id` | Não | Remove um dispositivo e revoga as suas sessões |

## Regras de segurança aplicadas

- Bloqueio temporário da conta após `MAX_LOGIN_ATTEMPTS` falhas consecutivas,
  durante `LOGIN_LOCK_MINUTES` minutos.
- Palavra-passe sempre com bcrypt (custo 12); nunca em texto simples.
- Refresh token gerado aleatoriamente e guardado apenas como hash SHA-256.
- Rotação do refresh token a cada renovação (o anterior é sempre revogado).
- `forgot-password` devolve sempre a mesma mensagem, exista ou não o e-mail
  (evita revelar quais contas existem).
- `reset-password` termina todas as sessões activas do utilizador.
- Todas as tentativas de login (com sucesso ou falha) e alterações de
  palavra-passe ficam registadas em auditoria (`audit_logs`).

## Documentação interactiva

`GET /api/docs` (Swagger), quando `SWAGGER_ENABLED=true` e fora de produção.

## Utilizadores, Perfis, Permissões, Auditoria, Dashboard e Configurações (Bloco 5)

| Módulo | Rotas |
|---|---|
| Utilizadores | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id`, `PATCH /api/users/:id/{activate,suspend,block,restore,roles}`, `POST /api/users/:id/reset-password`, `GET /api/users/:id/{audit-logs,devices}` |
| Perfis | `GET/POST /api/roles`, `GET/PATCH/DELETE /api/roles/:id`, `PATCH /api/roles/:id/{status,permissions}` |
| Permissões | `GET /api/permissions`, `GET /api/permissions/grouped` |
| Auditoria | `GET /api/audit-logs`, `GET /api/audit-logs/:id` (sem update/delete — nunca editável) |
| Dashboard | `GET /api/dashboard/{summary,revenue-expenses,member-growth,plan-usage,authorization-status,recent-activities,alerts,system-status}` |
| Configurações | `GET /api/settings`, `GET /api/settings/:category`, `PATCH /api/settings` |
| Perfil ("Meu Perfil") | `PATCH /api/profile` (nome/telefone/foto — nunca permissões); ver também `/api/auth/me`, `/change-password`, `/devices`, `/logout-all` |

Todas as rotas exigem as permissões correspondentes via `@RequirePermissions(...)`
(ex: `users.create`, `roles.update`, `audit.view`).

### Nota sobre o Dashboard

Os indicadores de utilizadores/perfis e as actividades recentes são dados
reais. Os indicadores de segurados, apólices, mensalidades, etc. são dados
de demonstração (`isDemoData: true` na resposta), pois esses módulos de
negócio ainda não foram construídos — conforme indicado explicitamente na
secção 17 do briefing.
