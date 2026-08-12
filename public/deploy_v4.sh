#!/bin/bash
DOMAIN="lovblack.online"
NGINX_CONF="/etc/nginx/nginx.conf"

echo "--- ☢️ INICIANDO CORREÇÃO DEFINITIVA (V4) ---"

# 1. Remove qualquer link quebrado ou antigo que impeça o teste do nginx
echo "Limpando configurações problemáticas..."
sudo rm -f /etc/nginx/sites-enabled/lovblack_exclusivo
sudo rm -f /etc/nginx/sites-enabled/lovblack_final
sudo rm -f /etc/nginx/sites-enabled/lovblack_final_v3
sudo rm -f /etc/nginx/sites-enabled/000-lovblack
sudo rm -f /etc/nginx/sites-enabled/000-lovablack-master

# 2. Varre e apaga arquivos em sites-available que citam o domínio (Exceto o novo)
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | while read -r file; do
    echo "Expurgando arquivo conflitante: $file"
    sudo rm -f "$file"
done

# 3. Cria a configuração MASTER com nome seguro e prioridade 000
cat <<INNEREOF | sudo tee /etc/nginx/sites-available/lovablack_prod > /dev/null
server {
    listen 80;
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

# 4. Ativa a nova configuração
sudo ln -sf /etc/nginx/sites-available/lovablack_prod /etc/nginx/sites-enabled/000-lovablack-prod

# 5. Reinicia serviços
echo "Validando Nginx..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "Nginx reiniciado com sucesso."
else
    echo "ERRO: Configuração do Nginx ainda inválida. Verifique os logs."
fi

# 6. Garante que o PM2 está rodando na porta correta
pm2 delete lovablack 2>/dev/null
cd /var/www/lovblack.online
PORT=8080 pm2 start .output/server/index.mjs --name lovablack

echo "--- ✅ PROCESSO CONCLUÍDO ---"
echo "Agora rode o Certbot para HTTPS:"
echo "sudo certbot --nginx -d lovblack.online -d www.lovblack.online --force-renewal"
