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
# Usamos a config otimizada para VPS para evitar erros de build e dependências ausentes
npx vite build --config vite.config.vps.ts


echo "========== TESTE DO SSR =========="
# Tentamos rodar o index.mjs para garantir que o bundle está íntegro
node --input-type=module -e "
import('./.output/server/index.mjs')
  .then(() => {
    console.log('SSR OK');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERRO CRITICO NO SSR:');
    console.error(err);
    process.exit(1);
  })
"


echo "========== PM2 (INJETANDO VARIAVEIS) =========="
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true

# Carrega o .env de forma segura, removendo possíveis quebras de linha ou espaços extras
if [ -f .env ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ $key =~ ^#.* ]] && continue
    [[ -z $key ]] && continue
    # Remove quotes se houver
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    export "$key=$value"
  done < .env
fi

SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ]; then
  echo "ERRO: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY ausentes no .env"
  exit 1
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "AVISO: SUPABASE_SERVICE_ROLE_KEY nao definida (opcional; usada apenas em rotinas administrativas)."
fi

PORT="$PORT" \
HOST="0.0.0.0" \
NODE_ENV="production" \
VITE_SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_URL="$SUPABASE_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY" \
SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY" \
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
