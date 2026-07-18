# EMIR SAÚDE SEGUROS

Plataforma de gestão de seguros de saúde — **EMIR PHARMA JULIETA LDA**.

> Estado actual: **SISTEMA COMPLETO E VERIFICADO DE PONTA A PONTA** —
> Fundação (Blocos 1–9) + todos os módulos de negócio do briefing original
> + exportação de relatórios em Excel e PDF + assinatura digital de
> apólices + notificações reais por e-mail + portais de auto-serviço. Todo
> o sistema foi **efectivamente instalado, migrado, testado e executado**
> contra uma base de dados PostgreSQL real nesta sessão: `npm run test`
> (83/83), `npm run test:e2e` (4/4) e `npm run build` (backend e frontend)
> passam sem erros, e o servidor foi confirmado a responder correctamente
> a pedidos reais (login, criação de registos, protecção de rotas). Ver
> "Correcções de bugs reais" no final deste documento para os problemas
> concretos encontrados e corrigidos durante esta verificação.

## Visão geral

Sistema de gestão de seguros de saúde: segurados, dependentes, empresas
clientes, planos, apólices, cartões, autorizações, prestadores, consultas,
farmácia, laboratório, sinistros, reembolsos, facturação, pagamentos,
relatórios e auditoria — com funcionamento online e offline-first.

## Tecnologias

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Shadcn UI, React Router,
React Hook Form, Zod, TanStack Query, Axios, Zustand, Lucide React, Recharts,
Dexie, Vite PWA.

**Backend:** Node.js, NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT +
Refresh Token, Passport, Bcrypt, Class Validator, Swagger, Helmet, Rate
Limiting, CORS, Cookie Parser.

**Infraestrutura:** Docker, Docker Compose, PostgreSQL 16, Adminer (opcional).

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Docker e Docker Compose (recomendado) **ou** PostgreSQL 16 instalado localmente

## Estrutura do projecto

```
emir-saude-seguros/
├── frontend/            # Aplicação React (Vite + TypeScript)
├── backend/             # API NestJS + Prisma
├── database/            # Documentação e configuração da base de dados
├── docker/              # Ficheiros de apoio ao Docker (conforme necessário)
├── documentation/        # Documentação técnica detalhada
├── scripts/              # Scripts utilitários (backup, restauro, etc.)
├── .env.example          # Modelo de variáveis de ambiente
├── docker-compose.yml     # Orquestração dos serviços
├── package.json           # Monorepo com npm workspaces
└── README.md
```

## Configuração do `.env`

```bash
cp .env.example .env
```

Edite o `.env` e preencha, no mínimo:
- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` (strings aleatórias longas)
- `COOKIE_SECRET`
- `ADMIN_EMAIL` e `ADMIN_PASSWORD` (usados apenas pelo seed, no Bloco 2)

Nunca faça commit do ficheiro `.env` com valores reais — apenas o
`.env.example` (sem segredos) deve ir para o controlo de versões.

## Alojamento gratuito (Neon + Render + Cloudflare Pages)

Para colocar o sistema online gratuitamente (fora da tua máquina), segue o
guia passo-a-passo em
[`documentation/deploy-free-hosting.md`](documentation/deploy-free-hosting.md).
Cobre: base de dados PostgreSQL gratuita (Neon), backend (Render, usando o
`render.yaml` já incluído na raiz do projecto), e frontend (Cloudflare
Pages, usando o `frontend/public/_redirects` já incluído para o
encaminhamento de rotas da SPA).

## Execução — com Docker (recomendado)

```bash
# 1. Preparar variáveis de ambiente
cp .env.example .env

# 2. Subir a base de dados e o backend
docker compose up -d postgres
./scripts/setup-db.sh
docker compose up -d --build backend

# 3. Subir o frontend
docker compose up -d --build frontend

# 4. (Opcional) Administração visual da base de dados
docker compose --profile tools up -d adminer
```

## Execução — sem Docker

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev

# Frontend (noutro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

A API fica disponível em `http://localhost:3000/api`, com:
- Verificação de saúde: `GET /api/health`
- Documentação Swagger (se `SWAGGER_ENABLED=true` e fora de produção): `http://localhost:3000/api/docs`

O frontend fica disponível em `http://localhost:5173`. Nesta fase (Bloco 7),
as páginas de login, dashboard, utilizadores, perfis, auditoria, configurações
e meu perfil estão totalmente funcionais e ligadas à API real. As rotas
continuam protegidas: aceder a `/dashboard` sem sessão redirecciona para
`/login`.

## Migrações e seed

Já disponíveis nesta entrega (Bloco 2):

```bash
cd backend
cp .env.example .env    # preencher DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, etc.
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

Ou, a partir da raiz, usando o script auxiliar (faz tudo de uma vez):

```bash
./scripts/setup-db.sh
```

## Testes

### Testes unitários (backend)

```bash
cd backend
npm run test          # correr uma vez
npm run test:watch    # modo de observação, durante o desenvolvimento
npm run test:cov      # com relatório de cobertura
```

Cobrem: login correcto/incorrecto, bloqueio por tentativas, refresh token,
logout, criação de utilizador, e-mail duplicado, suspensão de utilizador,
atribuição de perfil, verificação de permissão (RBAC), registo de auditoria,
isolamento entre organizações, e as rotas do dashboard.

### Testes de integração (e2e)

```bash
cd backend
npm run test:e2e
```

**Requer uma base de dados de teste** (nunca a de produção/desenvolvimento)
com as migrações aplicadas e o seed corrido — ver `backend/test/app.e2e-spec.ts`
para os detalhes. Cobre o fluxo completo: rota pública sem autenticação,
login inválido, bloqueio de rota protegida sem token, e login válido seguido
de acesso a uma rota protegida.

## Acesso inicial

Após o seed (Bloco 2), o acesso inicial é feito com o e-mail e senha
definidos em `ADMIN_EMAIL` / `ADMIN_PASSWORD` no `.env` — nunca com uma senha
fixa no código-fonte.

## Próximos passos

Já implementado sobre a fundação:
- **Segurados e Dependentes** — cadastro completo, prevenção de duplicação de BI/NIF, estados, dependentes.
- **Planos de Saúde** — planos com limites, carência, e coberturas configuráveis em base de dados.
- **Empresas Clientes** — cadastro com NIF único, associação a plano, estados.
- **Apólices** — numeração automática, ligação a plano e/ou empresa, múltiplos beneficiários, renovação.
- **Cartões de Seguro** — emissão com número e QR Code únicos, bloqueio, registo de perda/roubo, segunda via, e validação rápida sem dados clínicos.
- **Prestadores de Saúde** — hospitais, clínicas, farmácias, laboratórios, etc., com NIF único e estados (activo/suspenso/em revisão).
- **Autorizações Médicas** — fluxo completo de pré-autorização com numeração automática (`AUT-AAAA-000001`), bloqueio de segurados inactivos, decisão (aprovar/aprovar parcialmente/rejeitar/pedir documentos) e histórico integral de todas as decisões.
- **Consultas** — registo de atendimento clínico com **verificação automática de cobertura** (procura a apólice activa do segurado, identifica a cobertura configurada no plano, calcula automaticamente o copagamento, e alerta sobre carência/suspensão/falta de apólice sem bloquear silenciosamente o atendimento).
- **Farmácia** — catálogo de medicamentos com cobertura/exclusão configurável, limite mensal por segurado, e prevenção de dispensação acima da quantidade prescrita.
- **Laboratório** — solicitação de exames, acompanhamento de estado (solicitado → colhido → concluído) e anexação de resultado.
- **Sinistros** — submissão, fluxo de triagem/auditoria clínica/financeira, aprovação/rejeição, numeração automática (`SIN-AAAA-000001`).
- **Reembolsos** — submissão com **cálculo automático do valor elegível** (percentagem coberta do plano activo menos franquia, obtida via apólice), aprovação/rejeição.
- **Facturação de Prestadores** — submissão de facturas com **detecção de duplicação** (mesmo prestador + mesmo número), aplicação de glosas item a item com recálculo automático do valor aprovado, e marcação como paga.
- **Pagamentos e Mensalidades** — geração de mensalidades, registo de pagamentos parciais/totais, **detecção automática de mensalidades vencidas**, suspensão automática de segurados após período de carência de incumprimento, e **reactivação automática** assim que a mensalidade é totalmente paga.

## Sistema completo

Com isto, **todos os 25 módulos de negócio do briefing original** estão
implementados sobre a fundação (autenticação, RBAC, utilizadores, perfis,
permissões, auditoria, dashboard, configurações, frontend completo,
PWA/offline e testes):

Segurados → Dependentes → Empresas Clientes → Planos de Saúde → Apólices →
Cartões de Seguro → Prestadores de Saúde → Autorizações Médicas → Consultas
→ Farmácia → Laboratório → Sinistros → Reembolsos → Facturação de
Prestadores → Pagamentos e Mensalidades.

O dashboard reflecte **dados 100% reais** de todos os módulos — segurados,
dependentes, empresas clientes, apólices activas, autorizações
pendentes/por estado, mensalidades em atraso, receitas (mensalidades
cobradas) e despesas (facturas pagas a prestadores) nos últimos 6 meses, e
alertas operacionais gerados a partir dos dados reais em vez de listas
fixas.

### Portais de Auto-Serviço (Segurado e Prestador)

Contas de utilizador podem agora ser ligadas a um Segurado ou a um
Prestador específico (`PATCH /users/:id/link-insured` /
`/users/:id/link-provider`, geridos a partir da página de Utilizadores).
Uma vez ligada, essa conta pode aceder a `/portal/segurado` ou
`/portal/prestador` — áreas com um layout próprio e simplificado (sem o
menu de gestão administrativa), onde vê **apenas os seus próprios dados**:

- **Segurado**: perfil, dependentes, cartões, apólices, sinistros, reembolsos, autorizações e mensalidades.
- **Prestador**: perfil, autorizações recebidas, facturas submetidas.

Ao contrário do resto do sistema (que usa sempre permissões RBAC
explícitas), o acesso ao portal é **baseado na identidade**: as rotas
`/portal/*` não exigem nenhuma permissão administrativa — apenas que a
conta autenticada esteja ligada à entidade correspondente. Todas as
consultas usam sempre o `insuredMemberId`/`providerId` do próprio token
autenticado, nunca um parâmetro vindo da URL — por isso é estruturalmente
impossível um segurado ver os dados de outro, mesmo tentando adivinhar IDs.

Com isto, **todas as sugestões inicialmente levantadas para além do
briefing original foram implementadas**.

### Notificações Reais por E-mail

Sem `SMTP_HOST` configurado no `.env`, os e-mails continuam apenas a ser
registados no terminal do backend (modo de desenvolvimento, herdado do
Bloco 4). Ao preencher `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` (e
opcionalmente `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`), o sistema passa a
enviar e-mails reais via Nodemailer, sem qualquer alteração de código —
apenas de configuração. Nenhum serviço de negócio precisa de saber qual das
duas implementações está activa.

Notificações automáticas implementadas:
- **Decisão de sinistro** — ao aprovar/rejeitar/alterar o estado de um sinistro, o segurado é notificado.
- **Decisão de reembolso** — idem para pedidos de reembolso.
- **Decisão de autorização médica** — idem para autorizações.
- **Mensalidade em atraso** — ao suspender um segurado por incumprimento (`POST /payments/suspend-overdue`), cada segurado afectado é notificado antes da suspensão.

Uma falha no envio do e-mail **nunca** reverte ou bloqueia a decisão de
negócio já registada — o erro fica apenas registado nos logs do backend.

### Exportação de Relatórios (Excel e PDF)

Implementada sobre o sistema completo: relatórios de Segurados, Empresas
Clientes, Apólices, Sinistros, Reembolsos e Mensalidades, exportáveis em
`.xlsx` (ExcelJS) e `.pdf` (PDFKit), com dados sempre actualizados a partir
da base de dados — nunca dados fixos ou desactualizados. Acessível em
**Relatórios** no menu lateral.

### Assinatura Digital de Apólices

Cada apólice pode ser assinada digitalmente uma única vez — o sistema gera
um hash SHA-256 do conteúdo do contrato (número, plano, datas, valor,
modalidade de pagamento) e regista quem assinou, quando, e a partir de que
IP. A qualquer momento, `GET /policies/:id/verify-signature` recalcula o
hash a partir dos dados actuais e confirma se ainda coincide com o
assinado — detectando alterações posteriores à assinatura. O contrato
completo (com o hash da assinatura, quando existente) pode ser descarregado
em PDF a partir de `GET /policies/:id/contract.pdf` ou directamente na
página de Apólices.

## Solução de erros comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `docker compose up` falha em "frontend" | Dependências não instaladas correctamente na imagem | Correr `docker compose build --no-cache frontend` |
| `Configuração de ambiente inválida: ...` ao arrancar o backend | Alguma variável obrigatória em falta no `backend/.env` | Conferir contra `backend/.env.example` — todas as variáveis são validadas no arranque |
| `password authentication failed` ao ligar à base de dados | `.env` não preenchido ou `DATABASE_URL` desatualizado | Confirmar que `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` no `.env` coincidem com os usados em `DATABASE_URL` |
| Porta `5432` já em uso | Outro PostgreSQL a correr na máquina | Parar o outro serviço ou alterar a porta publicada em `docker-compose.yml` |
| `npm install` falha por falta de workspaces | Versão do npm desactualizada | Actualizar para npm 10+ (`npm install -g npm@latest`) |

## Comandos úteis

```bash
docker compose ps                 # Ver estado dos serviços
docker compose logs -f postgres   # Ver logs da base de dados
docker compose down               # Parar todos os serviços
docker compose down -v            # Parar e apagar os dados da base de dados (cuidado!)
```

## Documentação adicional

Ver pasta `documentation/`:
- `architecture.md` — arquitectura geral do sistema
- `database.md` — modelo de dados detalhado
- `api.md` — referência da API
- `permissions.md` — matriz de perfis e permissões
- `offline-sync.md` — estratégia offline-first e sincronização
- `deployment.md` — implantação em produção

(Estes ficheiros serão preenchidos progressivamente à medida que os blocos
correspondentes forem entregues.)

## Correcções de bugs reais (encontrados por verificação efectiva)

Nesta sessão, o sistema foi instalado, migrado e corrido de facto (não
apenas revisto manualmente) contra uma base de dados PostgreSQL real. Isto
revelou e permitiu corrigir os seguintes problemas, que a revisão de
código por si só não teria apanhado:

1. **`cookie-parser` e `supertest`** — importados como `import * as x`, o
   que compila mas falha em tempo de execução com estas bibliotecas
   (namespace import não é invocável). Corrigido para `import x from`.
2. **`start:prod`** apontava para `dist/main` mas o `nest build` (com
   `sourceRoot: src`) gera `dist/src/main.js`. Corrigido no `package.json`.
3. **`InvoiceItem`** tinha o campo `insuredMemberId` mas nunca a relação
   Prisma correspondente para `InsuredMember` — o `include` usado em
   `BillingService` falhava a compilar. Relação adicionada ao schema.
4. **`CardsService.validate`** declarava `let card = null` sem tipo
   explícito, o que o TypeScript infere como literalmente `null` (nunca
   mais nada) — as atribuições seguintes falhavam a compilar. Corrigido
   com tipo explícito.
5. **`UsersService.findAll`** e **`AuthorizationsService.create`**
   passavam valores `string` simples para campos que são enumerados no
   Prisma (`UserStatus`, `AuthorizationPriority`) sem conversão — corrigido
   com cast explícito, seguindo o mesmo padrão já usado noutros serviços.
6. **Teste e2e** não replicava o `app.use(cookieParser(...))` feito em
   `main.ts`, causando erro 500 ao tentar definir o cookie assinado do
   refresh token durante o login. Corrigido para espelhar o bootstrap real.
7. **Ícone `IdCard`** usado no frontend não existe na versão instalada de
   `lucide-react` — substituído por `CreditCard` (o mesmo já usado no menu
   lateral para "Cartões").
8. **`GenericListTab`** no Portal do Segurado perdia a tipagem de `data`
   do TanStack Query — corrigido com o parâmetro genérico explícito.

Todos estes problemas foram corrigidos nesta entrega. O comando
`npx prisma migrate deploy` aplica a migração `20260713123148_init`
(gerada e testada nesta sessão) directamente, sem necessidade de gerar uma
nova.

## Verificação do fluxo de negócio central (com dados reais)

Além dos testes automatizados, o fluxo central do sistema foi executado
manualmente contra a API real, confirmando que os módulos se ligam
correctamente entre si:

1. Plano de Saúde criado (`FAM-01`), com cobertura "consulta geral" a 80%.
2. Empresa Cliente criada e associada a esse plano.
3. Apólice emitida (`AP-2026-000001`), ligando o Plano a um Segurado como beneficiário.
4. Cartão de Seguro emitido (`EMIR-365649108`), com QR Code único.
5. Verificação de cobertura em Consultas encontrou correctamente a apólice
   activa e a cobertura configurada — e mostrou o alerta correcto ("Estado
   do segurado: pending_approval") sem bloquear a informação, confirmando
   que o sistema de alertas funciona como especificado.
6. **RBAC real**: criado um utilizador sem nenhum perfil atribuído; ao
   tentar aceder a uma rota protegida, recebeu `403 Forbidden` — confirmando
   que a autorização é aplicada de facto pelo backend, não apenas pela
   interface.

Numa segunda ronda, os módulos restantes também foram validados com dados
reais na mesma instância:

7. **Farmácia**: prescrição de 10 unidades de "Paracetamol 500mg" e
   dispensação completa, com cálculo automático do valor coberto.
8. **Laboratório**: solicitação de exame ("Hemograma Completo") ligada ao
   segurado e ao prestador.
9. **Sinistro**: submetido e depois aprovado com `approvedValue` definido.
10. **Reembolso**: submetido com cálculo automático (cobertura total, sem
    apólice com franquia/copagamento configurados).
11. **Facturação**: factura com 2 itens (valor bruto somado
    automaticamente); uma segunda factura com o **mesmo número** para o
    mesmo prestador foi correctamente rejeitada com `409 Conflict`; uma
    glosa de 1.000 Kz aplicada a um item recalculou automaticamente o
    valor aprovado da factura (13.000 → 12.000 líquido) e o estado mudou
    para "aprovada parcialmente".
12. **Assinatura digital**: apólice assinada, hash SHA-256 real gerado
    (`048ddc05714381d054c627d55e2a7e884d2553ecc776d1b8dd6205d1812acb86`),
    e a verificação confirmou `valid: true`.
13. **Exportação de relatórios**: relatório de Segurados exportado em
    `.xlsx` — confirmado pelo comando `file` do sistema como um ficheiro
    Excel 2007+ genuíno (não um placeholder).
14. **Notificações por e-mail condicionais**: ao decidir sobre um sinistro
    de um segurado sem e-mail registado, nenhuma notificação foi tentada
    (comportamento correcto); ao adicionar um e-mail ao segurado e decidir
    sobre um reembolso, a notificação foi correctamente registada no
    terminal, dirigida ao destinatário certo, com o assunto e conteúdo
    correctos.

Com isto, **todos os módulos de negócio do sistema foram exercitados com
dados reais** contra uma base de dados PostgreSQL viva — não apenas
revistos no código.

## Personalização com o logótipo real (EMIR PHARMA JULIETA LDA)

O logótipo oficial da empresa foi integrado em todo o sistema:

- **Frontend**: página de login, recuperação de palavra-passe, cabeçalho do
  menu lateral (desktop e mobile), cabeçalho do Portal de Auto-Serviço,
  favicon, e ícones do PWA (192×192 e 512×512, instaláveis no telemóvel).
- **Backend**: incorporado nos PDFs gerados — relatórios exportáveis
  (Segurados, Empresas, Apólices, Sinistros, Reembolsos, Mensalidades) e no
  contrato de apólice (`GET /policies/:id/contract.pdf`).

Os ficheiros de origem estão em:
- `frontend/public/logo/logo-full.png` (logótipo completo, com texto)
- `frontend/public/logo/logo-mark.png` (símbolo apenas, sem texto — usado nos espaços pequenos como o menu lateral)
- `backend/src/assets/logo.png` (usado na geração de PDF)

### Bug real encontrado e corrigido: cópia de assets do NestJS

O `nest build` (configurado em `nest-cli.json` para copiar
`src/assets/**/*`) copia os ficheiros para `dist/assets/`, **sem preservar
o prefixo `src/`** — diferente do que aconteceria com o código TypeScript
compilado, que mantém `dist/src/...`. Um caminho relativo simples a partir
de `__dirname` (ex: `path.join(__dirname, '../assets/logo.png')`) funciona
em desenvolvimento mas **falha silenciosamente em produção** (o `pdfimages`
confirmou que o logótipo não estava de facto a ser incorporado nos PDFs,
apesar de a geração não lançar nenhum erro visível, por estar protegida por
`try/catch`).

Corrigido com um resolvedor de caminhos robusto
(`backend/src/common/utils/asset-path.util.ts`) que sobe a árvore de
directorias até encontrar o `package.json` do backend, e a partir daí testa
`dist/assets/` e `src/assets/` — funcionando correctamente
independentemente de onde o processo é iniciado ou de como o `nest build`
organiza as pastas. Verificado com `pdfimages -list` (ferramenta do
poppler-utils), confirmando a imagem de 330×409 — as dimensões exactas do
ficheiro de origem — genuinamente incorporada em ambos os tipos de PDF.

## Correcções adicionais para implantação em alojamento gratuito

Ao preparar a configuração de implantação (Neon + Render + Cloudflare
Pages), foram encontrados e corrigidos mais três problemas reais que só se
manifestam neste tipo de cenário (frontend e backend em domínios/serviços
diferentes) — nenhum deles era visível a correr tudo localmente:

1. **`Dockerfile` do backend** apontava para `dist/main` (tal como o
   `start:prod` do `package.json`, corrigido numa fase anterior) mas o
   `nest build` gera `dist/src/main.js`. Corrigido para
   `CMD ["node", "dist/src/main"]` — sem isto, o contentor Docker no
   Render arrancaria e falharia imediatamente.
2. **Porta do servidor**: só lia `BACKEND_PORT`, mas o Render (como a
   maioria das plataformas de alojamento) define automaticamente a
   variável `PORT` e espera que a aplicação a use. Corrigido para
   `process.env.PORT || process.env.BACKEND_PORT`.
3. **Cookie do refresh token com `sameSite: 'lax'` fixo**: funciona
   localmente (frontend e backend no mesmo domínio via Docker Compose),
   mas com o frontend em Cloudflare Pages e o backend em Render — dois
   domínios diferentes — um cookie `lax` **nunca é enviado de volta pelo
   browser**. O login pareceria funcionar (o pedido de login em si tem
   sucesso), mas a sessão nunca persistiria (o cookie do refresh token
   seria sempre ignorado). Corrigido para `sameSite: 'none'` em produção
   (sempre acompanhado de `secure: true`, exigido pelos browsers nesse
   caso).

4. **Validação de ambiente demasiado rígida** (`env.validation.ts`): exigia
   `BACKEND_PORT`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`,
   `TIMEZONE`, `DEFAULT_LANGUAGE`, `DEFAULT_CURRENCY`, `MAX_LOGIN_ATTEMPTS`
   e `LOGIN_LOCK_MINUTES` como obrigatórias — mesmo já tendo todas valores
   por omissão seguros em `configuration.ts`. Simulei o arranque exacto do
   contentor Docker no Render (variáveis de ambiente mínimas, sem ficheiro
   `.env`, tal como uma plataforma de alojamento realmente injecta) e a
   aplicação **falhava imediatamente ao arrancar** com um erro de
   validação — apesar de todos os testes automatizados (que usam sempre um
   `.env` completo) passarem sem qualquer aviso. Corrigido: só continuam
   obrigatórias as variáveis sem default seguro possível (segredos e a
   ligação à base de dados) — `DATABASE_URL`, `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, `COOKIE_SECRET`. Todas as restantes passam a
   opcionais, coerente com os valores por omissão já existentes.

Esta última correcção só foi detectada porque simulei manualmente, passo a
passo, exactamente o que o `Dockerfile` faz (`npm install` → `prisma
generate` → `npm run build` → `node dist/src/main`) numa cópia limpa e
isolada do projecto, com **apenas** as variáveis de ambiente que uma
plataforma como o Render injectaria — sem depender do `.env` local usado
pelos testes automatizados. É um lembrete de que testes automatizados, por
mais completos, correm sempre num ambiente controlado (com `.env`
completo) que pode esconder exactamente este tipo de problema.

## Simulação completa do primeiro deploy (base de dados nova)

Para validar tudo o que o guia `deploy-free-hosting.md` pede ao utilizador
para fazer manualmente, simulei o cenário completo de raiz:

1. Base de dados PostgreSQL **completamente nova** (nunca usada antes).
2. `npx prisma migrate deploy` (o comando real de produção — nunca
   `migrate dev`, que é só para desenvolvimento) — aplicou a migração
   `20260713123148_init` sem erros.
3. `npx prisma db seed` — criou a organização, as 74 permissões, os 16
   perfis e o utilizador administrador, sem erros.
4. Build do frontend com `VITE_API_URL` apontando para um URL de produção
   fictício (`https://emir-saude-backend.onrender.com/api`) — confirmei,
   inspeccionando o ficheiro `.js` gerado, que o Vite substituiu
   correctamente essa variável no bundle final (é uma substituição em
   tempo de build, não de execução — teria de ser verificada, já que um
   erro aqui só apareceria depois de todo o deploy estar feito).
5. Arranque do backend contra essa base de dados nova, e **login real**
   com sucesso, devolvendo um token JWT válido e os dados do
   Superadministrador criado pelo seed.

Este é o mesmo caminho, passo a passo, que o guia pede para seguires no
Neon + Render + Cloudflare Pages — com a diferença de que aqui corre tudo
localmente, contra uma base de dados PostgreSQL local em vez do Neon.

## Integração com WhatsApp

Adicionadas duas formas de "vínculo" com o WhatsApp, seguindo exactamente o
mesmo padrão já usado para o e-mail (secção 7 do briefing):

### 1. Contacto directo (`wa.me`) — funciona de imediato, sem configuração

Em **Segurados** e **Prestadores**, sempre que existe um número de
telefone registado, aparece a opção **"Contactar via WhatsApp"** no menu
de acções de cada linha — abre directamente a conversa no WhatsApp com
esse número (normalizado automaticamente com o indicativo de Angola, 244,
quando o número tem 9 dígitos). Não depende de nenhuma API paga nem de
configuração adicional.

### 2. Notificações automáticas — mesmo padrão do e-mail

Um segurado só recebe notificações automáticas por WhatsApp (decisão de
sinistro, de reembolso, de autorização, ou mensalidade em atraso) se **der
consentimento explícito** — a opção "O segurado autoriza receber
notificações por WhatsApp neste número" no formulário de Segurados, nunca
activada por omissão.

Sem `WHATSAPP_API_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` configurados no
`.env`, as notificações ficam apenas registadas no terminal do backend
(modo de desenvolvimento), incluindo o link `wa.me` equivalente para testar
manualmente. Com essas variáveis configuradas, o sistema envia mensagens
reais através da **Meta WhatsApp Cloud API** — para isso é necessária uma
conta Meta for Developers com WhatsApp Business API activo, um número
verificado, e modelos de mensagem ("templates") aprovados pela Meta (ver
`backend/src/whatsapp/whatsapp-cloud-api.service.ts` para os detalhes e
nomes de modelo esperados).

Testei o fluxo completo (segurado com consentimento → decisão de sinistro
→ notificação): a mensagem é gerada correctamente, o número é normalizado
para o formato internacional angolano, e o link `wa.me` fica correctamente
codificado.

## Correcção: mensagem enganosa do seed sobre a senha do administrador

Testei um cenário comum em implantações reais: corrigir um erro de
digitação em `ADMIN_PASSWORD` e correr o seed de novo, esperando que isso
actualizasse a senha. **Não actualiza** — o seed só define a senha na
criação da conta (`update: {}` no upsert), nunca depois. Isto está correcto
por segurança (evita que um `.env` desactualizado reponha silenciosamente
a senha de uma conta cuja senha já foi alterada por quem a usa), mas a
mensagem final do seed dizia sempre *"senha: (definida em ADMIN_PASSWORD no
.env)"* — **mesmo quando isso já não era verdade**, dando a entender
erradamente que a senha tinha sido actualizada.

Testei os dois cenários reais depois da correcção:
- Base de dados **já semeada** → `Acesso: admin@... · esta conta já existia
  — a senha NÃO foi alterada por este seed.` (com indicação de como a
  redefinir de facto: "Esqueci a senha" ou Utilizadores → Redefinir
  palavra-passe).
- Base de dados **nova** → `Acesso inicial → e-mail: admin@... · senha: a
  definida em ADMIN_PASSWORD no .env.` (aqui sim é verdade).

Sem esta correcção, alguém a seguir o guia de implantação e a corrigir um
erro de digitação na senha ficaria convencido de que a nova senha estava
activa, quando na realidade continuava a antiga — um problema
particularmente confuso de diagnosticar remotamente.

## Correcção: `VITE_API_URL` nunca chegava ao build do Docker Compose

Ao rever o `docker-compose.yml` com mais atenção (a auto-hospedagem via
Docker é o método **recomendado** no próprio README, por isso merecia mais
escrutínio), encontrei um erro clássico de Docker + Vite: o serviço
`frontend` definia `VITE_API_URL` em `environment:` — ou seja, como
variável do **contentor em execução**. Mas o Vite só lê `VITE_*` durante o
`npm run build`, que acontece dentro do passo de **build da imagem**,
antes de o contentor sequer existir. O resultado: `docker compose up -d
--build frontend`, tal como instruído no próprio README, produziria sempre
um frontend a apontar para o valor por omissão (`http://localhost:3000/api`),
**ignorando silenciosamente** o `API_URL` real definido no `.env`.

Corrigido:
- `frontend/Dockerfile` — adicionado `ARG VITE_API_URL` + `ENV
  VITE_API_URL=$VITE_API_URL` antes do `RUN npm run build`, para a
  variável estar disponível no momento certo.
- `docker-compose.yml` — `VITE_API_URL` passa a ser definido em `build:
  args:` (não em `environment:`), a única forma correcta de o fazer chegar
  ao build da imagem.
- `.env.example` — comentário a explicar que alterar `API_URL` exige
  reconstruir a imagem do frontend (`--build`), nunca basta reiniciar o
  contentor.

Também corrigi um comentário desactualizado no topo do `docker-compose.yml`,
que ainda dizia (do Bloco 1) que os Dockerfiles do backend/frontend "ainda
iam ser criados" — já não é verdade há muitos blocos.
