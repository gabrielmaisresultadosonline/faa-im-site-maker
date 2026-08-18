#!/bin/bash
# Script de Reversão e Estabilização para Porta 3000 (Padrão Original)
# Data: 18/08/2026 - Resolvendo 502 Bad Gateway

set -e

# Configurações
APP_DIR="/var/www/lovablack_final"
DOMAIN="lovblack.online"
PORT=3000
PM2_NAME="lovablack"

echo "========== 1. LIMPANDO CONFIGURAÇÕES ANTERIORES =========="
pm2 delete lovblack_master || true
pm2 delete $PM2_NAME || true

echo "========== 2. RESTAURANDO NGINX PARA PORTA 3000 =========="
sudo cat <<EON > /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EON

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

echo "========== 3. RECONSTRUINDO BUILD PADRÃO =========="
cd $APP_DIR
# Remover configs customizadas que podem estar causando o erro de destructuring
rm -f vite.config.vps.ts
rm -rf .output .vinxi node_modules/.vite

echo "Instalando dependências..."
npm install

echo "Executando Build padrão (Vite)..."
npm run build

echo "========== 4. INICIANDO PM2 NA PORTA 3000 =========="
# Usamos o comando padrão que você usava antes
PORT=$PORT pm2 start npm --name "$PM2_NAME" -- start

pm2 save --force

echo "========== 5. VERIFICAÇÃO FINAL =========="
sleep 5
pm2 status $PM2_NAME

echo "🚀 Voltamos para a configuração original na porta 3000."
echo "Se o erro 502 persistir, rode: pm2 logs $PM2_NAME"
