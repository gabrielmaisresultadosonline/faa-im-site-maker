#!/bin/bash
DOMAIN="lovblack.online"
echo "--- ☢️ INICIANDO OPERAÇÃO DE LIMPEZA NUCLEAR ---"

# 1. Encontrar e DELETAR qualquer arquivo em sites-available e sites-enabled que mencione o domínio
# Exceto o nosso novo arquivo que vamos criar agora
echo "[1/4] Expurgando configurações conflitantes..."
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | while read -r file; do
    echo "Removendo arquivo de configuração: $file"
    sudo rm -f "$file"
done

sudo find /etc/nginx/sites-enabled/ -type l -exec grep -l "$DOMAIN" {} + | xargs -I{} sudo rm -f {}

# 2. Criar a configuração MASTER com prioridade absoluta (000-default)
echo "[2/4] Criando configuração prioritária..."
sudo cat > /etc/nginx/sites-available/lovablack_master <<INNEREOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name lovblack.online www.lovblack.online;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
INNEREOF

# 3. Ativar como o primeiro site da lista
echo "[3/4] Ativando com prioridade 000..."
sudo ln -sf /etc/nginx/sites-available/lovablack_master /etc/nginx/sites-enabled/000-lovablack-master

# 4. Reiniciar Nginx e PM2
echo "[4/4] Reiniciando serviços..."
sudo nginx -t && sudo systemctl restart nginx
pm2 delete lovablack 2>/dev/null
cd /var/www/lovblack.online && PORT=8080 pm2 start .output/server/index.mjs --name lovablack

echo "--- ✅ OPERAÇÃO CONCLUÍDA ---"
echo "⚠️ ATENÇÃO: Verifique se o site abriu. Se sim, rode o Certbot:"
echo "sudo certbot --nginx -d lovblack.online -d www.lovblack.online --force-renewal"
