#!/bin/bash

# ==========================================================================
# LOVABLACK - GITHUB DIRECT INSTALLER (ISOLATED)
# Target: Ubuntu 24.04+ | Nginx | PM2 | Bun
# Repo: https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git
# ==========================================================================

DOMAIN="lovblack.online"
PROJECT_DIR="/var/www/lovblack.online"
REPO_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
PORT=8080

echo "🚀 Iniciando Instalação Direta via GitHub para $DOMAIN..."

# 1. Instalação de Dependências Essenciais
sudo apt-get update
sudo apt-get install -y git curl nginx certbot python3-certbot-nginx

if ! command -v bun &> /dev/null; then
    echo "📦 Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# 2. Limpeza de Instalações Antigas
echo "🧹 Limpando diretório antigo..."
sudo rm -rf $PROJECT_DIR
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 3. Clonar Repositório
echo "📥 Clonando código do GitHub..."
git clone $REPO_URL $PROJECT_DIR
cd $PROJECT_DIR

# 4. Instalar e Buildar
echo "📦 Instalando dependências..."
bun install
echo "🏗️ Gerando build de produção..."
bun run build

# 5. Configuração Cirúrgica do Nginx
echo "🛠️ Configurando Nginx isolado..."
sudo tee /etc/nginx/sites-available/lovblack_exclusivo > /dev/null <<EOF
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

# Remover links quebrados e ativar novo site
sudo find /etc/nginx/sites-enabled/ -xtype l -delete
sudo ln -sf /etc/nginx/sites-available/lovblack_exclusivo /etc/nginx/sites-enabled/000-lovblack

# 6. Gerenciamento de Processos (PM2)
pm2 delete $DOMAIN 2>/dev/null || true
PORT=$PORT pm2 start "bun run start" --name $DOMAIN
pm2 save

# 7. Finalização e SSL
sudo nginx -t && sudo systemctl restart nginx

echo "----------------------------------------------------------------"
echo "✅ INSTALAÇÃO CONCLUÍDA DIRETAMENTE DO GITHUB!"
echo "🌐 Acesse: http://$DOMAIN"
echo "🔐 AGORA RODE ESTE COMANDO PARA O SSL (HTTPS):"
echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "----------------------------------------------------------------"
