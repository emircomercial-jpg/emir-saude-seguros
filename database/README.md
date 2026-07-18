# Base de Dados — PostgreSQL

Este projecto utiliza **PostgreSQL 16** como base de dados relacional, gerida
através do **Prisma ORM** (o schema, as migrações e o seed ficam em
`backend/prisma/`, criados no Bloco 2).

## Configuração local (sem Docker)

1. Instalar o PostgreSQL 16 (ou usar um serviço já existente).
2. Criar a base de dados e o utilizador:

```sql
CREATE USER emir WITH PASSWORD 'a_sua_senha';
CREATE DATABASE emir_saude_seguros OWNER emir;
```

3. Preencher `DATABASE_URL` no `.env` (ver `.env.example` na raiz do projecto):

```
DATABASE_URL="postgresql://emir:a_sua_senha@localhost:5432/emir_saude_seguros?schema=public"
```

## Configuração via Docker Compose

O serviço `postgres` no `docker-compose.yml` da raiz já cria a base de dados
e o utilizador automaticamente a partir das variáveis `POSTGRES_USER`,
`POSTGRES_PASSWORD` e `POSTGRES_DB` do `.env`. Basta:

```bash
docker compose up -d postgres
```

A porta `5432` fica exposta ao anfitrião apenas para desenvolvimento local.
**Em produção, essa exposição deve ser removida** do `docker-compose.yml`
(o backend acede à base de dados apenas através da rede interna `emir_internal`).

## Administração visual (opcional)

O serviço `adminer` (perfil `tools`) permite gerir a base de dados através do
browser, sem custos:

```bash
docker compose --profile tools up -d adminer
```

Aceder em `http://localhost:8081` com:
- Sistema: PostgreSQL
- Servidor: `postgres`
- Utilizador / Senha / Base de dados: os definidos no `.env`

## Próximos passos (Bloco 2)

O schema Prisma (`backend/prisma/schema.prisma`), a primeira migração e o
seed de dados iniciais (organização, utilizador administrador e perfis) serão
criados no Bloco 2, conforme o plano de entrega aprovado.
