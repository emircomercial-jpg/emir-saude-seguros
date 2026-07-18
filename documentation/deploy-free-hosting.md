# Implantação Gratuita — Neon + Render + Cloudflare Pages

Este guia cobre o alojamento gratuito do EMIR SAÚDE SEGUROS usando:
- **Neon** — base de dados PostgreSQL gratuita (não expira)
- **Render** — backend NestJS (Docker)
- **Cloudflare Pages** — frontend (React/Vite)

Tempo estimado: 30–45 minutos na primeira vez.

---

## 0. Colocar o projecto no GitHub (obrigatório)

O Render e o Cloudflare Pages fazem deploy a partir de um repositório Git —
não é possível enviar o `.zip` directamente.

```bash
cd emir-saude-seguros-v2
git init
git add .
git commit -m "EMIR SAÚDE SEGUROS — versão inicial"
```

Cria um repositório novo (privado, se preferires) em https://github.com/new
e depois:

```bash
git remote add origin https://github.com/<o-teu-utilizador>/emir-saude-seguros.git
git branch -M main
git push -u origin main
```

---

## 1. Base de dados — Neon

1. Cria conta em https://neon.tech (login com GitHub é o mais rápido).
2. **New Project** → nome `emir-saude-seguros` → região mais próxima da Europa (ex: `Frankfurt` ou `Ireland`, já que Angola não tem região própria — escolher a mais próxima reduz a latência).
3. Depois de criado, vai a **Connection Details** e copia a "Connection string" (formato `postgresql://utilizador:senha@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`).
4. Guarda este valor — é o `DATABASE_URL` que vais usar no passo 2.

> O plano gratuito do Neon inclui 3 GB de armazenamento e não expira. A base de dados "adormece" após 5 minutos de inactividade e acorda automaticamente no pedido seguinte (leva 1-2 segundos a mais nesse primeiro pedido).

---

## 2. Backend — Render

1. Cria conta em https://render.com (login com GitHub).
2. **New +** → **Blueprint** → escolhe o repositório que acabaste de criar.
3. O Render detecta automaticamente o ficheiro `render.yaml` na raiz do
   repositório e propõe criar o serviço `emir-saude-backend`. Confirma.
4. Antes do primeiro deploy, preenche estas variáveis de ambiente no painel
   do serviço (**Environment**) — são as marcadas com `sync: false` no
   `render.yaml`:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string do Neon (passo 1) |
   | `CORS_ORIGIN` | por agora, coloca um valor temporário como `https://localhost` — actualizas no passo 4, depois de teres o URL real do frontend |
   | `APP_URL` | o mesmo valor que `CORS_ORIGIN` |
   | `ADMIN_EMAIL` | o e-mail do primeiro utilizador administrador, ex: `admin@emirsaude.co.ao` |
   | `ADMIN_PASSWORD` | uma senha forte — só é usada uma vez, pelo seed |
   | `ORGANIZATION_NIF` | o NIF da EMIR PHARMA JULIETA LDA (opcional) |

5. Clica **Apply** / **Create Web Service**. O primeiro deploy demora
   alguns minutos (build da imagem Docker).
6. Quando o deploy terminar, confirma que está a responder:
   `https://emir-saude-backend.onrender.com/api/health` deve devolver
   `{"success":true,...}`.
7. **Aplicar a migração e o seed** (uma única vez): no painel do Render,
   abre o separador **Shell** do serviço e corre:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
   Isto cria todas as tabelas e o utilizador administrador inicial.

> O plano gratuito do Render "adormece" o serviço após 15 minutos sem
> pedidos, e demora ~1 minuto a "acordar" no pedido seguinte. Para uso
> interno isto é normalmente aceitável; se precisares de disponibilidade
> imediata 24h, terás de mudar para um plano pago (a partir de $7/mês).

---

## 3. Frontend — Cloudflare Pages

1. Cria conta em https://pages.cloudflare.com (ou usa uma conta Cloudflare existente).
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → escolhe o repositório.
3. Configuração da build:

   | Campo | Valor |
   |---|---|
   | Framework preset | `Vite` |
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. Em **Environment variables**, adiciona:

   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | `https://emir-saude-backend.onrender.com/api` (o URL real do teu serviço Render, do passo 2) |

5. **Save and Deploy**. No fim, o Cloudflare dá-te um URL como
   `https://emir-saude-seguros.pages.dev`.

---

## 4. Ligar os dois lados (CORS)

Volta ao Render (passo 2) e actualiza a variável `CORS_ORIGIN` para o URL
real que o Cloudflare Pages te deu (ex:
`https://emir-saude-seguros.pages.dev`, **sem barra final**). Guarda — o
Render reinicia automaticamente o serviço com o novo valor.

Sem este passo, o browser bloqueia os pedidos do frontend ao backend
(erro de CORS na consola).

---

## 5. Testar

1. Abre `https://emir-saude-seguros.pages.dev` (o teu URL do Cloudflare Pages).
2. Inicia sessão com o `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos no passo 2.
3. Confirma que o Dashboard carrega com dados reais.
4. Recarrega a página numa rota interna (ex: `/users`) — deve continuar a
   funcionar (não dar 404) graças ao `_redirects` já incluído no projecto.

### Checklist se algo não funcionar

| Sintoma | Causa provável | Solução |
|---|---|---|
| Login parece funcionar mas a sessão perde-se ao recarregar | `CORS_ORIGIN` no Render não corresponde exactamente ao URL do Cloudflare Pages | Confirmar que não há barra final `/` a mais nem a menos |
| Erro de CORS na consola do browser | mesma causa acima, ou o deploy do Render ainda não reiniciou | Aguardar o deploy terminar; verificar em Render → Logs |
| `/api/health` não responde | Serviço ainda "a acordar" (plano gratuito) | Aguardar ~1 minuto e tentar novamente |
| Erro ao correr `prisma migrate deploy` | `DATABASE_URL` incorrecta ou Neon inactivo | Confirmar a connection string copiada do Neon, com `?sslmode=require` no final |
| 404 ao recarregar uma rota interna do frontend | Ficheiro `_redirects` não foi publicado | Confirmar que `frontend/public/_redirects` existe e que o "Root directory" no Cloudflare Pages é `frontend` |

---

## Actualizar o sistema depois do deploy inicial

Basta fazer `git push` para o `main` — tanto o Render como o Cloudflare
Pages voltam a fazer build e deploy automaticamente a cada push.

Se a actualização incluir alterações ao `schema.prisma`, correr de novo
(no Shell do Render):
```bash
npx prisma migrate deploy
```
