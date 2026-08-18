#!/bin/bash


set -Eeuo pipefail


APP_DIR="$(pwd)"
PORT="8098"
PM2_NAME="lovblack_master"
# A Service Role Key deve ser passada como variável de ambiente ao rodar o script ou estar definida aqui
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"


cd "$APP_DIR"


echo "========== ATUALIZAÇÃO MANUAL =========="
# Git reset ignorado localmente conforme políticas de segurança do ambiente



echo "========== DEPENDÊNCIAS =========="
npm install --prefer-offline


echo "========== LIMPEZA =========="
rm -rf .output .vinxi node_modules/.vite .nitro


echo "========== BUILD =========="
npx vite build


echo "========== TESTE DO SSR =========="
node --input-type=module -e "
import('./.output/server/index.mjs')
  .then(() => console.log('SSR OK'))
  .catch(err => {
    console.error(err?.stack || err);
    process.exit(1);
  })
"


echo "========== PM2 =========="
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true

# Injeta as variáveis de ambiente necessárias para o Supabase Admin e Public Client
# O PM2 salvará essas variáveis no processo
PORT="$PORT" \
HOST="0.0.0.0" \
NODE_ENV="production" \
SUPABASE_URL="https://zjvmfmdyuxmyanuuralq.supabase.co" \
VITE_SUPABASE_URL="https://zjvmfmdyuxmyanuuralq.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7" \
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
VITE_SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
pm2 start .output/server/index.mjs \
  --name "$PM2_NAME" \
  --node-args="--enable-source-maps" \
  --update-env

pm2 save --force


sleep 5


echo "========== HEALTH CHECK =========="


if ! ss -lntp | grep -q ":$PORT"; then
    echo "ERRO: aplicação não abriu a porta $PORT"
    pm2 logs "$PM2_NAME" --lines 100 --nostream
    exit 1
fi


HTTP_CODE=$(curl -sS -o /tmp/lovblack-health.html \
  -w "%{http_code}" \
  --max-time 20 \
  "http://127.0.0.1:$PORT/" || true)


echo "HTTP: $HTTP_CODE"


if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "302" && "$HTTP_CODE" != "404" ]]; then
    echo "ERRO: aplicação respondeu HTTP $HTTP_CODE"
    pm2 logs "$PM2_NAME" --lines 100 --nostream
    exit 1
fi


echo ""
echo "======================================"
echo "DEPLOY LOVBLACK CONCLUIDO"
echo "PORTA: $PORT"
echo "PM2: $PM2_NAME"
echo "HTTP: $HTTP_CODE"
echo "======================================"
