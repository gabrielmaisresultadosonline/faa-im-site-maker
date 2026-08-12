#!/bin/bash
DOMAIN="lovblack.online"
REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/root/lovablack_final"

echo "🚀 [LOVABLACK] INICIANDO RECUPERAÇÃO MANTENDO OUTROS SITES..."

# 1. PARADA ESPECÍFICA
echo "⏹️ Parando apenas o Lovablack no PM2..."
pm2 stop lovablack 2>/dev/null
pm2 delete lovablack 2>/dev/null

# 2. LIMPEZA DE CONFLITOS NGINX
echo "🧹 Limpando configurações conflitantes..."
sudo systemctl stop nginx
sudo rm -f /etc/nginx/sites-enabled/lovablack*
sudo rm -f /etc/nginx/sites-available/lovablack*
sudo rm -f /etc/nginx/sites-enabled/default

# 3. ATUALIZAÇÃO DO CÓDIGO
echo "📦 Atualizando código..."
cd /root
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull
else
    git clone "$REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

npm install
npm run build

# 4. CONFIGURAÇÃO NGINX
echo "🏗️ Configurando Nginx..."
sudo tee /etc/nginx/sites-available/lovablack > /dev/null <<INNEREOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
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

sudo ln -sf /etc/nginx/sites-available/lovablack /etc/nginx/sites-enabled/lovablack
sudo nginx -t && sudo systemctl start nginx

# 5. REINICIAR TUDO NO PM2
echo "♻️ Reiniciando serviços..."
pm2 start npm --name "lovablack" -- start
pm2 restart all

echo "✅ [PRONTO] O Lovablack foi instalado e os outros sites (belezalisoperfeito, zapmro) foram religados!"
pm2 status
