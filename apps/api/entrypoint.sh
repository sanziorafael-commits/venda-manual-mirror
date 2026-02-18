#!/bin/sh
set -e

# Se vier credencial do GCS em base64, cria o arquivo dentro do container
if [ -n "\" ]; then
  echo "\" | base64 -d > "\"
fi

# Start padrão (usa o package.json)
exec npm run start:prod