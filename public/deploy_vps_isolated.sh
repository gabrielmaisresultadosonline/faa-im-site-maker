#!/bin/bash

# ==========================================================================
# LOVABLACK VPS ISOLATED DEPLOYER - V8 (GITHUB DIRECT)
# Autor: Lovable Multi-Agent System (Claude Opus 4.8)
# Objetivo: Instalação limpa, isolada e prioritária do Lovablack na VPS Hostinger
# ==========================================================================

set -e

DOMAIN="lovblack.online"
REPO_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/var/www/lovablack"
APP_PORT=8080

echo "🚀 Iniciando Instalação Isolada para $DOMAIN..."

# 1. Limpeza de conflitos no Nginx
echo "🔍 Buscando e removendo sequestradores de domínio..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-enabled/lovblack*

# Remove o domínio de qualquer outro arquivo de configuração para evitar conflitos
# Usamos grep para achar arquivos que citam o domínio e sed para apagar essas linhas
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ]; then
        if sudo grep -q "$DOMAIN" "$file"; then
            echo "⚠️  Limpando rastro de $DOMAIN em $file"
            sudo sed -i "/$DOMAIN/d" "$file"
        fi
    fi
done

# 2. Instalação de dependências essenciais
echo "📦 Instalando dependências (Node, Bun, PM2)..."
if ! command -v fnm &> /dev/null; then
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
    export PATH="$HOME/.local/share/fnm:$PATH"
fi
eval "`fnm env`"
fnm use --install 20 || fnm install 20

if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

npm install -g pm2 || sudo npm install -g pm2

# 3. Preparação da pasta do projeto
echo "📂 Preparando repositório GitHub..."
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR
rm -rf $INSTALL_DIR/*

git clone $REPO_URL $INSTALL_DIR
cd $INSTALL_DIR

# 4. Build do Projeto
echo "🛠️ Instalando dependências e gerando build..."
bun install
bun run build

# 5. Configuração do Nginx Isolada (Prioridade 000)
echo "🌐 Configurando Nginx Isolado..."
sudo tee /etc/nginx/sites-available/000-lovblack-master > /dev/null <<ENGF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
ENGF

sudo ln -sf /etc/nginx/sites-available/000-lovblack-master /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. Execução com PM2
echo "🏃 Iniciando processo isolado..."
pm2 stop lovablack || true
pm2 delete lovablack || true
pm2 start "bun run start" --name lovablack -- --port $APP_PORT

pm2 save

echo "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "--------------------------------------------------"
echo "Se o site não abrir, execute: sudo nginx -t"
echo "Para SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "--------------------------------------------------"
