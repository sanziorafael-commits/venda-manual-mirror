#!/bin/sh
set -e

# Se vier credencial do GCS em base64, cria o arquivo dentro do container
if [ -n "$GCS_CREDENTIALS_BASE64" ]; then
  echo "$GCS_CREDENTIALS_BASE64" | base64 -d > /app/storage-account.json
fi

# Gerar Prisma Client e iniciar
npx prisma generate
exec npm run start
