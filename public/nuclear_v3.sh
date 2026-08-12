#!/bin/bash
DOMAIN="lovblack.online"
NGINX_ROOT="/etc/nginx"

echo "☢️ [LOVABLACK] MODO NUCLEAR ATIVADO: LIMPANDO TUDO..."

# 1. Parar Nginx
sudo systemctl stop nginx

# 2. Deletar QUALQUER arquivo que cite o domínio em sites-enabled e sites-available
# Exceto o nosso novo arquivo que vamos criar
echo "🧹 Faxina completa em /etc/nginx/sites-..."
sudo find "$NGINX_ROOT/sites-enabled/" -type l -exec grep -l "$DOMAIN" {} + | xargs -I {} sudo rm -f {} || true
sudo find "$NGINX_ROOT/sites-available/" -type f -exec grep -l "$DOMAIN" {} + | xargs -I {} sudo rm -f {} || true

# 3. Remover o default_server global para que possamos assumir o controle total
sudo sed -i 's/default_server//g' "$NGINX_ROOT/sites-enabled/"* 2>/dev/null || true

# 4. Criar a configuração COMPLETA (HTTP e HTTPS manual)
# Nota: Usamos 443 com default_server para GARANTIR que ele pegue qualquer requisição SSL
echo "🏗️ Construindo nova configuração soberana..."
sudo tee "$NGINX_ROOT/sites-available/lovablack" > /dev/null <<INNEREOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
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

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
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

# 5. Ativar
sudo ln -sf "$NGINX_ROOT/sites-available/lovablack" "$NGINX_ROOT/sites-enabled/lovablack"

# 6. Forçar reinicialização do Nginx
sudo killall -9 nginx 2>/dev/null || true
sudo nginx -t && sudo systemctl start nginx

echo "✅ OPERAÇÃO CONCLUÍDA!"
echo "🔥 O domínio $DOMAIN agora está SOB NOSSO CONTROLE TOTAL."
echo "🚀 Acesse: https://$DOMAIN"
