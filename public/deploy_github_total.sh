#!/bin/bash

# ==========================================================================
# LOVABLACK - TOTAL GITHUB ISOLATION & DEPLOYMENT
# Target: Ubuntu 24.04+ | Nginx | PM2 | Bun
# Repo: https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git
# ==========================================================================

DOMAIN="lovblack.online"
PROJECT_DIR="/var/www/lovblack.online"
REPO_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
PORT=8080

echo "🚀 Iniciando Deployment Total via GitHub para $DOMAIN..."

# 1. Instalação de Dependências e Setup de Ambiente
sudo apt-get update
sudo apt-get install -y git curl nginx certbot python3-certbot-nginx

# Instalar Bun se não existir
if ! command -v bun &> /dev/null; then
    echo "📦 Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    source ~/.bashrc
fi

# Instalar PM2 se não existir
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# 2. Limpeza Agressiva de Conflitos
echo "🧹 Purgando instalações anteriores e conflitos de porta..."
pm2 delete $DOMAIN 2>/dev/null || true
sudo rm -rf $PROJECT_DIR
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 3. Clonagem e Instalação do Projeto
echo "📥 Clonando repositório..."
git clone $REPO_URL $PROJECT_DIR
cd $PROJECT_DIR

echo "📦 Instalando dependências do projeto..."
bun install
echo "🏗️ Gerando build de produção..."
bun run build

# 4. Configuração Cirúrgica do Nginx (Prioridade Máxima)
echo "🛠️ Criando VHost exclusivo para $DOMAIN..."
sudo tee /etc/nginx/sites-available/lovblack_master > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
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
EOF

# Ativar e limpar links órfãos
sudo find /etc/nginx/sites-enabled/ -xtype l -delete
sudo ln -sf /etc/nginx/sites-available/lovblack_master /etc/nginx/sites-enabled/000-lovblack-master

# 5. Iniciar Aplicação
echo "♻️ Iniciando servidor via PM2..."
PORT=$PORT pm2 start "bun run start" --name $DOMAIN
pm2 save

# 6. Reiniciar Nginx e Validar
sudo nginx -t && sudo systemctl restart nginx

echo "----------------------------------------------------------------"
echo "✅ PROJETO LOVABLACK NO AR DIRETAMENTE DO GITHUB!"
echo "🌐 Domínio: http://$DOMAIN"
echo "🔐 Rode agora: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "----------------------------------------------------------------"
