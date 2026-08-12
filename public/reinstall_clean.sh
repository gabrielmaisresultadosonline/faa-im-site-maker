#!/bin/bash
DOMAIN="lovblack.online"
REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/root/lovablack_new"

echo "🚀 [LOVABLACK] INICIANDO INSTALAÇÃO LIMPA E REIVINDICAÇÃO TOTAL..."

# 1. Limpeza do Nginx para evitar qualquer conflito
sudo systemctl stop nginx
echo "🧹 Removendo configurações antigas de $DOMAIN..."
sudo grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ 2>/dev/null | xargs -I {} sudo rm -f {} || true
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ 2>/dev/null | xargs -I {} sudo rm -f {} || true

# 2. Preparar nova pasta (sem conflito com a anterior)
sudo rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. Clonar e Instalar
echo "📦 Clonando repositório..."
git clone "$REPO" .
npm install
npm run build

# 4. Configuração Soberana do Nginx
echo "🏗️ Criando configuração do Nginx..."
sudo tee /etc/nginx/sites-available/lovablack_final > /dev/null <<INNEREOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
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

sudo ln -sf /etc/nginx/sites-available/lovablack_final /etc/nginx/sites-enabled/lovablack_final
sudo killall -9 nginx 2>/dev/null || true
sudo nginx -t && sudo systemctl start nginx

# 5. Rodar com PM2
pm2 delete lovablack 2>/dev/null || true
pm2 start npm --name "lovablack" -- start

echo "✅ [CONCLUÍDO] PROJETO REINSTALADO E DOMÍNIO REIVINDICADO!"
echo "🚀 Acesse: https://$DOMAIN"
