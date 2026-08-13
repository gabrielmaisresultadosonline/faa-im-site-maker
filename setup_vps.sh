#!/bin/bash

# CORES PARA STATUS
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="lovblack.online"
GITHUB_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_PATH="/var/www/lovablack_github"

echo -e "${GREEN}🚀 INICIANDO INSTALAÇÃO DIRETA VIA GITHUB...${NC}"

# 1. LIMPEZA RADICAL DE CONFLITOS
echo "🧹 Removendo configurações antigas e links quebrados..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-enabled/lovblack*
sudo rm -f /etc/nginx/sites-available/lovblack*

# 2. DEPENDÊNCIAS
echo "📦 Verificando dependências..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 3. CLONE E BUILD
echo "📥 Clonando repositório: $GITHUB_URL"
sudo mkdir -p $INSTALL_PATH
sudo chown -R $USER:$USER $INSTALL_PATH
rm -rf $INSTALL_PATH/*

git clone $GITHUB_URL $INSTALL_PATH
cd $INSTALL_PATH

echo "🛠️ Instalando dependências do projeto..."
bun install
bun run build

# 4. NGINX ISOLADO (PRIORIDADE TOTAL)
echo "🌐 Configurando Nginx Isolado..."
sudo tee /etc/nginx/sites-available/lovblack_solo > /dev/null <<CONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
CONF

sudo ln -sf /etc/nginx/sites-available/lovblack_solo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 5. PM2 START
echo "🏃 Subindo aplicação no PM2..."
pm2 delete lovablack-github || true
pm2 start "bun run start -- --port 8080" --name lovablack-github

pm2 save

echo -e "${GREEN}✅ INSTALAÇÃO CONCLUÍDA!${NC}"
echo "Acesse: http://$DOMAIN"
echo "Para SSL: sudo certbot --nginx -d $DOMAIN"
