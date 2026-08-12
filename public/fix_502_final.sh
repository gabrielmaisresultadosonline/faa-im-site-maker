#!/bin/bash
DOMAIN="lovblack.online"
INSTALL_DIR="/root/lovablack_final"

echo "🔍 [DIAGNÓSTICO PROFUNDO] Por que o site não abre?"

cd "$INSTALL_DIR" || exit

# 1. VERIFICAR SE HÁ ERROS NO LOG DO PM2
echo "📝 Vendo logs de erro do PM2..."
pm2 logs lovablack --lines 50 --no-colors --err | tail -n 50

# 2. TESTAR PORTAS ATIVAS NO SISTEMA
echo "🌐 Portas em escuta (LISTENING):"
sudo netstat -tulpn | grep LISTEN

# 3. TESTAR RESPOSTA LOCAL DO NITRO (Servidor do TanStack)
echo "⚡ Testando resposta local na porta 3000..."
curl -I http://127.0.0.1:3000

# 4. CORREÇÃO DE CONFIGURAÇÃO NGINX (Pode ser o endereço upstream)
echo "🏗️ Revisando configuração do Nginx..."
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
        # Usamos 127.0.0.1 em vez de localhost para evitar problemas de IPv6
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

sudo nginx -t && sudo systemctl restart nginx

# 5. REINÍCIO LIMPO DA APLICAÇÃO
echo "🚀 Reiniciando aplicação PM2..."
pm2 delete lovablack 2>/dev/null
PORT=3000 pm2 start .output/server/index.mjs --name "lovablack"
pm2 save

echo "✅ [FIM] Verifique o site agora."
pm2 status
