#!/bin/bash

# ==========================================================================
# LOVABLACK VPS CLEANUP & CONSOLIDATION - V13 (SOLVING DUPLICATES & SSL)
# ==========================================================================

DOMAIN="lovblack.online"
GITHUB_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_PATH="/var/www/lovablack_final"
PORT=8080

echo "🚀 INICIANDO LIMPEZA E CONSOLIDAÇÃO V13..."

# 1. MATAR PROCESSOS DUPLICADOS NO PM2
echo "🧹 Removendo processos duplicados do PM2..."
pm2 delete lovblack || true
pm2 delete lovablack || true
pm2 delete setup_vps || true
pm2 save --force

# 2. LIMPEZA TOTAL DE CONFIGURAÇÕES NGINX
echo "🧹 Purgando configurações antigas do Nginx..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-enabled/lovblack*
sudo rm -f /etc/nginx/sites-available/lovblack*

# Limpa qualquer arquivo que ainda tenha o domínio (prevenção de sequestro)
grep -lR "$DOMAIN" /etc/nginx/sites-enabled/ | xargs -r sudo sed -i "/$DOMAIN/d"

# 3. PURGA DA PASTA E RE-INSTALAÇÃO LIMPA
echo "📂 Preparando pasta de instalação única..."
sudo rm -rf /var/www/lovablack_master
sudo rm -rf /var/www/lovablack_v12
sudo rm -rf $INSTALL_PATH
sudo mkdir -p $INSTALL_PATH
sudo chown -R $USER:$USER $INSTALL_PATH

# 4. CLONE E BUILD
git clone $GITHUB_URL $INSTALL_PATH
cd $INSTALL_PATH

# Normalização de diretório
if [ ! -f "package.json" ]; then
    SUBDIR=$(ls -d */ | head -n 1)
    if [ -n "$SUBDIR" ]; then
        mv $SUBDIR* . 2>/dev/null
        mv $SUBDIR.* . 2>/dev/null
    fi
fi

export PATH="$HOME/.bun/bin:$PATH"
bun install && bun run build

# 5. CONFIGURAÇÃO NGINX MESTRE (HTTP APENAS PARA EVITAR ERR_HTTP2)
echo "🌐 Configurando Nginx Master (HTTP Priorities)..."
sudo tee /etc/nginx/sites-available/lovblack_v13 > /dev/null <<CONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
CONF

sudo ln -sf /etc/nginx/sites-available/lovblack_v13 /etc/nginx/sites-enabled/000-lovblack-master
sudo nginx -t && sudo systemctl restart nginx

# 6. PM2 START (NOME ÚNICO: lovblack_master)
echo "🏃 Iniciando processo único no PM2..."
pm2 start "bun run start -- --port $PORT" --name lovblack_master
pm2 save

echo "✅ LIMPEZA V13 CONCLUÍDA!"
echo "Teste agora (HTTP): http://$DOMAIN"
echo "--------------------------------------------------"
echo "Se ainda der erro de protocolo, limpe o cache do Chrome (CTRL+F5)"
echo "--------------------------------------------------"
