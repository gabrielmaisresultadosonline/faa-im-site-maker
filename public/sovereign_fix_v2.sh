#!/bin/bash
DOMAIN="lovblack.online"
REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/root/lovablack_final"

echo "💣 [LOVABLACK] EXTERMINADOR DE CONFLITOS E INSTALAÇÃO FINAL V2..."

# 1. PARADA SELETIVA (Preserva outros processos do PM2)
sudo systemctl stop nginx
sudo pm2 stop lovablack 2>/dev/null
# O killall node ainda é necessário se o build travar, mas o PM2 deve gerenciar o resto.
# Removido: sudo killall -9 pm2


# 2. LIMPEZA RADICAL DO NGINX
echo "🧹 Faxina pesada no Nginx..."
sudo grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ 2>/dev/null | xargs -I {} sudo rm -f {}
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ 2>/dev/null | xargs -I {} sudo rm -f {}
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/lovablack
sudo rm -f /etc/nginx/sites-enabled/lovablack_clean

# 3. DOWNLOAD E BUILD LIMPO
echo "📦 Preparando nova pasta..."
cd /root
sudo rm -rf "$INSTALL_DIR"
git clone "$REPO" "$INSTALL_DIR"
cd "$INSTALL_DIR" || { echo "❌ Erro ao entrar na pasta!"; exit 1; }
npm install
npm run build

# 4. CONFIGURAÇÃO NGINX SOBERANA
echo "🏗️ Criando configuração Nginx Soberana..."
sudo tee /etc/nginx/sites-available/lovablack_soberano > /dev/null <<INNEREOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
INNEREOF

sudo ln -sf /etc/nginx/sites-available/lovablack_soberano /etc/nginx/sites-enabled/lovablack_soberano
sudo nginx -t && sudo systemctl start nginx

# 5. START COM PM2
echo "🚀 Iniciando aplicação..."
pm2 delete lovablack 2>/dev/null
pm2 start npm --name "lovablack" -- start

echo "✅ [CONCLUÍDO] Lovablack agora é soberano!"
echo "🚀 Acesse: https://lovblack.online"
