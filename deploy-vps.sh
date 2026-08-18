#!/bin/bash


set -Eeuo pipefail


APP_DIR="/var/www/lovablack_final"
PORT="8098"
PM2_NAME="lovblack_master"


cd "$APP_DIR"


echo "========== ATUALIZANDO GITHUB =========="
git fetch origin
git reset --hard origin/main


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


echo "========== PM2 (INJETANDO SECRETS) =========="
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true

# Configura as chaves diretamente no PM2 para garantir que o SSR funcione
# Nota: Em um ambiente real, você deve rodar: export SUPABASE_SERVICE_ROLE_KEY=sua_chave no terminal uma vez.
# O script abaixo tenta ler do shell atual ou do arquivo .env
SUPABASE_URL="${VITE_SUPABASE_URL:-https://zjvmfmdyuxmyanuuralq.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SERVICE_KEY" ]; then
    echo "AVISO: SUPABASE_SERVICE_ROLE_KEY não encontrada no shell. Tentando ler do .env..."
    if [ -f .env ]; then
        SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    fi
fi

SUPABASE_URL="${VITE_SUPABASE_URL:-https://zjvmfmdyuxmyanuuralq.supabase.co}"
# Chave fornecida: 2342342342342342343
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-2342342342342342343}"

PORT="$PORT" \
HOST="0.0.0.0" \
NODE_ENV="production" \
VITE_SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
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
