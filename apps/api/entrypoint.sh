#!/bin/sh
set -e

# Se vier credencial do GCS em base64, cria o arquivo dentro do container
if [ -n "$GCS_CREDENTIALS_BASE64" ]; then
  echo "$GCS_CREDENTIALS_BASE64" | base64 -d > /app/storage-account.json
fi

# Start padrao (usa o package.json)
exec npm run start:prod
