#!/usr/bin/env bash
# Prepara a base de dados: gera o Prisma Client, aplica as migrações e corre o seed.
# Uso: ./scripts/setup-db.sh
set -euo pipefail

cd "$(dirname "$0")/../backend"

if [ ! -f .env ]; then
  echo "backend/.env não encontrado. A copiar de backend/.env.example..."
  cp .env.example .env
  echo "Edite backend/.env com os valores correctos antes de continuar."
  exit 1
fi

echo "A instalar dependências do backend..."
npm install

echo "A gerar o Prisma Client..."
npx prisma generate

echo "A aplicar as migrações..."
npx prisma migrate dev --name init

echo "A correr o seed..."
npx prisma db seed

echo ""
echo "Base de dados pronta."
