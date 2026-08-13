#!/bin/bash

# ==========================================================================
# LOVABLACK EMERGENCY REPAIR - V14 (BYPASSING PROXY & FORCING CLEAN HTTP)
# Autor: Lovable Multi-Agent System (Claude Opus 4.8)
# ==========================================================================

DOMAIN="lovblack.online"
GITHUB_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_PATH="/var/www/lovablack_final"
PORT=8080

echo "🚨 INICIANDO REPARO DE EMERGÊNCIA V14..."

# 1. LIMPEZA TOTAL DE PROCESSOS
pm2 delete lovblack_master || true
pm2 delete lovablack || true
pm2 delete lovblack || true
pm2 save --force

# 2. LIMPEZA AGRESSIVA DE NGINX E SSL
echo "🧹 Removendo configurações de SSL corrompidas e links fantasmas..."
sudo rm -f /etc/nginx/sites-enabled/*lovblack*
sudo rm -f /etc/nginx/sites-available/*lovblack*

# Remove o domínio de qualquer vhost que ainda o cite (limpeza de sequestro)
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ]; then
        if sudo grep -q "$DOMAIN" "$file"; then
            echo "⚠️  Limpando sequestro em $file"
            sudo sed -i "/$DOMAIN/d" "$file"
        fi
    fi
done

# 3. CONFIGURAÇÃO NGINX MÍNIMA (PORTA 8080)
echo "🌐 Criando configuração Nginx limpa (Prioridade 000)..."
sudo tee /etc/nginx/sites-available/lovblack_solo_v14 > /dev/null <<CONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Forçar desligamento de qualquer tentativa de HTTP2/SSL anterior no Nginx para este domínio
    http2 off;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout longo para evitar 504 durante o build
        proxy_read_timeout 60s;
    }
}
CONF

sudo ln -sf /etc/nginx/sites-available/lovblack_solo_v14 /etc/nginx/sites-enabled/000-lovblack-master
sudo nginx -t && sudo systemctl restart nginx

# 4. RE-BUILD LIMPO
cd $INSTALL_PATH || (git clone $GITHUB_URL $INSTALL_PATH && cd $INSTALL_PATH)
export PATH="$HOME/.bun/bin:$PATH"
bun install && bun run build

# 5. START COM PORTA EXPLÍCITA
echo "🏃 Iniciando no PM2..."
pm2 start "bun run start -- --port $PORT" --name lovblack_final
pm2 save

echo "✅ REPARO V14 CONCLUÍDO!"
echo "Teste agora: http://$DOMAIN"
echo "IMPORTANTE: Se ainda der erro de protocolo, use uma ABA ANÔNIMA para ignorar o cache de SSL do Chrome."
