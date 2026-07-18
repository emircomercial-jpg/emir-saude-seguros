# Implantação em Produção — EMIR SAÚDE SEGUROS

## Checklist antes de implantar

- [ ] `.env` de produção preenchido com segredos fortes e únicos
      (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`,
      `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`) — nunca reutilizar os valores
      de desenvolvimento.
- [ ] `NODE_ENV=production`
- [ ] `SWAGGER_ENABLED=false` (a documentação interactiva não deve ficar
      pública em produção)
- [ ] `CORS_ORIGIN` a apontar apenas para o domínio real do frontend
- [ ] Base de dados com backups automáticos configurados (ver abaixo)
- [ ] HTTPS activo (ver secção Nginx/TLS)
- [ ] Porta `5432` do PostgreSQL **não exposta publicamente** — remover o
      bloco `ports` do serviço `postgres` no `docker-compose.yml`

## Subir o stack completo

```bash
cp .env.example .env
# preencher todos os valores de produção

docker compose up -d --build
```

Isto sobe: PostgreSQL, backend (NestJS) e frontend (Nginx a servir os
ficheiros estáticos da build do Vite). O Adminer (`--profile tools`) deve
ficar **desligado** em produção, ou protegido atrás de autenticação adicional.

## HTTPS / Nginx

Este projecto não inclui certificados TLS por defeito. Recomenda-se colocar
um proxy reverso (ex: Nginx, Caddy, ou um Load Balancer gerido) à frente do
serviço `frontend`, terminando HTTPS e encaminhando:
- `/` → serviço `frontend` (porta 80 interna)
- `/api` → serviço `backend` (porta 3000 interna)

Isto evita expor directamente os contentores e permite renovação automática
de certificados (ex: via Let's Encrypt/Certbot).

## Cópias de segurança da base de dados

```bash
# Backup manual
docker compose exec postgres pg_dump -U emir emir_saude_seguros | gzip > backup_$(date +%Y%m%d).sql.gz

# Restauro
gunzip -c backup_20260101.sql.gz | docker compose exec -T postgres psql -U emir emir_saude_seguros
```

Para produção, agende este comando via `cron` (ou equivalente) com rotação
das cópias mais antigas, e guarde as cópias fora do próprio servidor (ex:
armazenamento externo/object storage).

## Migrações em produção

Nunca usar `prisma migrate dev` em produção (pode pedir para recriar a base
de dados em certos cenários). Usar sempre:

```bash
npx prisma migrate deploy
```

## Monitorização mínima recomendada

- `GET /api/health` — verificação de saúde do backend e da ligação à base de
  dados; ligar a um serviço de monitorização externo (ex: uptime checks).
- Logs do backend (`docker compose logs -f backend`) — nunca registam
  senhas, tokens ou corpos de pedidos sensíveis (ver `LoggerMiddleware`).
- Alertas para falhas de sincronização recorrentes reportadas pelos
  utilizadores (indicador "Servidor inacessível" no cabeçalho).

## Actualização da aplicação

```bash
git pull
docker compose build backend frontend
docker compose up -d backend frontend
docker compose exec backend npx prisma migrate deploy
```

## Variáveis de ambiente específicas de produção

Para além das listadas no `.env.example`, considere:
- `RATE_LIMIT_MAX` mais baixo em produção, se o tráfego esperado for reduzido.
- `LOGIN_LOCK_MINUTES` ajustado conforme a política de segurança da
  organização.
