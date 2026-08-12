#!/bin/bash
# ============================================================
# LOVABLACK - Deploy / Atualizacao no VPS Hostinger
# Dominio: lovblack.online  |  Porta interna: 3000
# Uso: bash update.sh
# ============================================================
set -e

APP_DIR="/var/www/lovablack"
BRANCH="main"

echo "==> 1/6 Atualizando codigo do GitHub"
cd "$APP_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> 2/6 Instalando dependencias"
export PATH="$HOME/.bun/bin:$PATH"
bun install

echo "==> 3/6 Conferindo variaveis de ambiente"
# STRIPE_SECRET_KEY (pagamentos em USD da pagina /ingles) precisa existir no .env
if ! grep -q "STRIPE_SECRET_KEY" .env 2>/dev/null; then
  echo "!! ATENCAO: STRIPE_SECRET_KEY nao encontrada no .env"
  echo "   Adicione a chave manualmente:  nano $APP_DIR/.env"
fi

echo "==> 4/6 Build de producao (preset node-server)"
bunx vite build --config vite.config.vps.ts

echo "==> 5/6 Reiniciando processo no PM2"
if pm2 describe lovablack > /dev/null 2>&1; then
  pm2 restart lovablack --update-env
else
  HOST=0.0.0.0 PORT=3000 pm2 start ".output/server/index.mjs" \
    --name lovablack \
    --env production
fi
pm2 save

echo "==> 6/6 Recarregando Nginx"
nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo " DEPLOY CONCLUIDO"
echo " PT  (InfinitePay/BRL): https://lovblack.online/"
echo " EN  (Stripe/USD):      https://lovblack.online/ingles"
echo " Admin:                 https://lovblack.online/admin"
echo " Webhook Stripe:        https://lovblack.online/api/public/webhook-stripe"
echo "============================================"
pm2 logs lovablack --lines 20 --nostream
