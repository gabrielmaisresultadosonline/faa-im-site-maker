#!/bin/bash
DOMAIN="lovblack.online"
REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/root/lovablack_final"

echo "💣 [LOVABLACK] EXTERMINADOR DE CONFLITOS E INSTALAÇÃO FINAL..."

# 1. PARADA TOTAL
sudo systemctl stop nginx
sudo killall -9 node 2>/dev/null
sudo killall -9 pm2 2>/dev/null

# 2. LIMPEZA RADICAL DO NGINX
# O problema é que o domínio está definido em outros arquivos. Vamos remover TODAS as menções.
echo "🧹 Faxina pesada no Nginx..."
sudo grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ | xargs -I {} sudo rm -f {}
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | xargs -I {} sudo rm -f {}

# Remover o default server que pode estar sequestrando a requisição
sudo rm -f /etc/nginx/sites-enabled/default

# 3. DOWNLOAD E BUILD
echo "📦 Clonando repositório..."
sudo rm -rf "$INSTALL_DIR"
git clone "$REPO" "$INSTALL_DIR"
cd "$INSTALL_DIR"
npm install
npm run build

# 4. CONFIGURAÇÃO ÚNICA E SOBERANA (COM SSL FORÇADO)
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

    # Otimizações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
INNEREOF

sudo ln -sf /etc/nginx/sites-available/lovablack_soberano /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl start nginx

# 5. START COM PM2
echo "🚀 Iniciando com PM2..."
pm2 delete lovablack 2>/dev/null || true
pm2 start npm --name "lovablack" -- start

echo "✅ [EXTERMINADO] O ZAPMRO foi removido do domínio $DOMAIN."
echo "👉 IMPORTANTE: Limpe o cache do seu navegador ou use Janela Anônima!"
echo "🚀 Acesse agora: https://$DOMAIN"
