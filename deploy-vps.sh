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
npx vite build --config vite.config.vps.ts


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


export $(grep -v '^#' .env | xargs)

PORT="$PORT" \
NITROPACK_PORT="$PORT" \
HOST="0.0.0.0" \
NODE_ENV="production" \
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
