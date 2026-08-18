#!/bin/bash
# Script de deploy seguro e isolado para lovblack.online no VPS Hostinger
# Versão: 18/08/2026 - Correção DEFINITIVA 502/Porta/Environment/Host/Isolation/SSR-EntryFix-v4

set -e

# Configurações do ambiente
APP_DIR="/var/www/lovablack_final"
DOMAIN="lovblack.online"
PORT=8098
PM2_NAME="lovblack_master"

echo "========== 1. ATUALIZANDO GITHUB =========="
cd $APP_DIR
git fetch origin
git reset --hard origin/main

echo "========== 2. INSTALANDO DEPENDÊNCIAS =========="
npm ci || npm install

echo "========== 3. CONFIGURANDO VPS (Vite/Nitro) =========="
cat <<'EOF' > vite.config.vps.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "node-server",
    inlineDynamicImports: true,
  },
  tanstackStart: {
    server: {
      entry: "src/server.ts",
    },
  },
  vite: {
    ssr: {
      noExternal: true,
    },
    build: {
      chunkSizeWarningLimit: 2000,
    }
  }
});
EOF

echo "========== 4. BUILD DO PROJETO =========="
rm -rf .output .vinxi
npx vite build --config vite.config.vps.ts

echo "========== 5. REINICIANDO PROCESSO ISOLADO (PM2) =========="
pm2 delete $PM2_NAME || true

ENV_VARS=""
if [ -f .env ]; then
    echo "Preparando variáveis do .env para o PM2..."
    while read -r line || [ -n "$line" ]; do
        if [[ ! $line =~ ^# ]] && [[ $line == *"="* ]]; then
            clean_line=$(echo "$line" | sed 's/"/\\"/g')
            ENV_VARS="$ENV_VARS --env $clean_line"
        fi
    done < .env
fi

# Forçamos as variáveis de porta para que o Nitro não use o padrão 3000
pm2 start .output/server/index.mjs --name $PM2_NAME \
    --node-args="--enable-source-maps" \
    --env PORT=$PORT \
    --env NITROPACK_PORT=$PORT \
    --env HOST=0.0.0.0 \
    --env NITROPACK_HOST=0.0.0.0 \
    --env NODE_ENV=production \
    --env VITE_SSR=true \
    $ENV_VARS

pm2 save --force

echo "========== 6. VERIFICANDO STATUS E SAÚDE =========="
sleep 8
pm2 status $PM2_NAME

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/ --max-time 15 || echo "Failed")

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "302" ] || [ "$RESPONSE" == "404" ]; then
    echo "✅ Deploy concluído com sucesso! Site respondendo na porta $PORT."
else
    echo "⚠️ Erro: O servidor não está respondendo corretamente na porta $PORT (Status: $RESPONSE)."
    echo "Logs recentes:"
    pm2 logs $PM2_NAME --lines 30
fi

echo "🚀 Deploy isolado finalizado para $DOMAIN."
