#!/bin/bash
# Script de reparo agressivo para Nginx 502 Bad Gateway no VPS Hostinger
# Focado em lovblack.online isolado na porta 8098

DOMAIN="lovblack.online"
APP_PORT=8098

echo "========== REPARANDO CONFIGURAÇÃO NGINX PARA $DOMAIN =========="

# Backup da config atual
if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
    sudo cp "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-available/$DOMAIN.bak"
fi

# Criação da configuração de Proxy Reverso otimizada para Nitro/SSR
sudo cat <<EON > /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts aumentados para evitar 504/502 durante boot de SSR
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EON

# Garante link simbólico
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Testa e reinicia Nginx
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Nginx reiniciado. Verificando porta interna $APP_PORT..."
netstat -tulpn | grep $APP_PORT || echo "⚠️ AVISO: Nada rodando na porta $APP_PORT. Certifique-se de rodar ./deploy-vps.sh primeiro."

echo "🚀 Pronto! Tente acessar https://$DOMAIN"
