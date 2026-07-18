# Perfis e Permissões — EMIR SAÚDE SEGUROS

## Perfis iniciais (seed)

| Perfil | Código | Sistema? |
|---|---|---|
| Superadministrador | `superadmin` | Sim (não pode ser eliminado/desactivado) |
| Administrador | `admin` | Sim |
| Gestor de Seguros | `insurance_manager` | Não |
| Operador de Cadastro | `registration_operator` | Não |
| Gestor Financeiro | `financial_manager` | Não |
| Auditor | `auditor` | Não |
| Médico | `doctor` | Não |
| Enfermeiro | `nurse` | Não |
| Farmacêutico | `pharmacist` | Não |
| Técnico de Laboratório | `lab_technician` | Não |
| Recepcionista | `receptionist` | Não |
| Gestor de Empresa | `company_manager` | Não |
| Segurado | `insured` | Não |
| Prestador | `provider` | Não |
| Agente Comercial | `sales_agent` | Não |
| Atendimento ao Cliente | `customer_support` | Não |

O **Superadministrador** recebe automaticamente todas as permissões no seed.
Os restantes perfis começam sem permissões atribuídas — devem ser
configurados através de Perfis e Permissões → Matriz de Permissões.

## Catálogo de permissões (módulo.acção)

| Módulo | Acções disponíveis |
|---|---|
| `dashboard` | `view` |
| `users` | `view`, `create`, `update`, `delete`, `activate`, `suspend`, `block`, `restore` |
| `roles` | `view`, `create`, `update`, `delete` |
| `permissions` | `view` |
| `audit` | `view` |
| `settings` | `view`, `update` |
| `profile` | `view`, `update` |

Novos módulos de negócio (segurados, apólices, sinistros, etc.), quando
implementados em fases futuras, devem seguir o mesmo padrão `módulo.acção` e
ser adicionados ao seed (`backend/prisma/seed.ts`) para ficarem disponíveis
na matriz de permissões sem exigirem alterações ao motor de RBAC.

## Como funciona o controlo de acesso

1. Cada rota do backend é anotada com `@RequirePermissions('modulo.accao', ...)`.
2. O `PermissionsGuard` verifica se algum dos perfis do utilizador autenticado
   (activos) possui **todas** as permissões exigidas pela rota.
3. Se não possuir, a rota devolve `403 Forbidden` — nunca apenas esconde o
   botão no frontend sem também bloquear no backend.
4. No frontend, o hook `usePermissions` (`useHasRole`) permite ocultar opções
   de interface como camada de conveniência — a única fonte de verdade é
   sempre o backend.

## Perfis de sistema

`Superadministrador` e `Administrador` têm `isSystem = true`:
- Não podem ser eliminados (`DELETE /api/roles/:id` devolve `403`).
- Não podem ter o estado alterado (`PATCH /api/roles/:id/status` devolve `403`).
- Podem, ainda assim, ter as suas permissões ajustadas via
  `PATCH /api/roles/:id/permissions`.

## Portal de Auto-Serviço (acesso por identidade, não por permissão)

As rotas `/portal/insured/*` e `/portal/provider/*` são uma excepção
deliberada ao modelo RBAC descrito acima: não exigem nenhuma permissão
administrativa. Em vez disso, o acesso é concedido a qualquer conta
autenticada cujo registo tenha `insuredMemberId` ou `providerId`
preenchido — e todas as consultas nessas rotas usam sempre esse valor
vindo do próprio token (nunca de um parâmetro na URL), garantindo que uma
conta nunca pode ver os dados de outro segurado/prestador.

Os perfis `Segurado` (`insured`) e `Prestador` (`provider`), já presentes
no seed, destinam-se a este propósito — atribua-os a contas de portal por
clareza organizacional, mas note que a restrição de acesso real não vem do
perfil atribuído, vem da ligação `insuredMemberId`/`providerId` no registo
do utilizador.

Para criar uma conta de portal:
1. Criar um utilizador normal em Utilizadores → Novo Utilizador, com o perfil `Segurado` ou `Prestador`.
2. No menu de acções desse utilizador, usar "Ligar ao Portal do Segurado" ou "Ligar ao Portal do Prestador", indicando o ID da entidade correspondente.
3. O utilizador pode agora aceder a `/portal/segurado` ou `/portal/prestador` após iniciar sessão normalmente.
