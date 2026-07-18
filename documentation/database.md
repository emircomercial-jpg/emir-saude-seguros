# Modelo de Dados — EMIR SAÚDE SEGUROS (Bloco 2)

Schema completo em `backend/prisma/schema.prisma`. Entidades da fundação do
sistema (utilizadores, perfis, permissões, sessões, auditoria, configurações
e fila de sincronização). Os módulos de negócio (segurados, apólices,
sinistros, etc.) serão adicionados em blocos futuros, sem alterar esta base.

## Entidades

| Entidade | Descrição |
|---|---|
| `Organization` | Organização proprietária dos dados (preparado para multi-organização) |
| `User` | Utilizadores internos do sistema |
| `Role` | Perfis de acesso (RBAC) |
| `Permission` | Catálogo global de permissões (`módulo.acção`) |
| `UserRole` | Associação utilizador ↔ perfil (N:N) |
| `RolePermission` | Associação perfil ↔ permissão (N:N) |
| `RefreshToken` | Tokens de sessão de longa duração (guardados como hash) |
| `Device` | Dispositivos usados para autenticação |
| `AuditLog` | Registo de auditoria (nunca editável/eliminável pela aplicação) |
| `SystemSetting` | Configurações do sistema, por organização |
| `SyncQueue` | Fila de sincronização offline-first (base para o Bloco 8) |

## Regras aplicadas no schema

- Eliminação lógica (`deletedAt`) em `Organization`, `User` e `Role`.
- `Role.isSystem` impede que perfis do sistema (Superadministrador,
  Administrador) sejam eliminados pela aplicação.
- `RefreshToken.tokenHash` — nunca se guarda o token em texto simples.
- `AuditLog` não tem nenhuma rota de update/delete prevista — é
  estritamente um registo de leitura.
- `SyncQueue.operationId` é único, para que o mesmo pedido de sincronização
  enviado duas vezes pelo cliente (ex: por falha de rede) não seja aplicado
  em duplicado.

## Comandos

```bash
cd backend
cp .env.example .env   # preencher DATABASE_URL e variáveis do seed
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

Ou, a partir da raiz do projecto, usando o script auxiliar:

```bash
./scripts/setup-db.sh
```

## Dados criados pelo seed

- Organização **EMIR SAÚDE SEGUROS** (`EMIR PHARMA JULIETA LDA`).
- Catálogo de 17 permissões (`dashboard.view`, `users.view`, `users.create`, …).
- 16 perfis iniciais, incluindo os perfis de sistema `Superadministrador` e
  `Administrador` (não elimináveis).
- O perfil `Superadministrador` recebe automaticamente todas as permissões.
- Um utilizador administrador inicial, com nome/e-mail/senha vindos de
  `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` — **nunca fixos no código**.
  O seed falha explicitamente se `ADMIN_EMAIL` ou `ADMIN_PASSWORD` não
  estiverem definidos.
- Configurações iniciais de localização (país, moeda, idioma, fuso horário)
  e de segurança (tentativas de login, tempo de bloqueio).
