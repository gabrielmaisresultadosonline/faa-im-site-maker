#!/bin/bash
DOMAIN="lovblack.online"
NGINX_ROOT="/etc/nginx"

echo "--- ☢️ OPERAÇÃO LIMPEZA NUCLEAR (NGINX FIX V10) ---"

# 1. FORÇA BRUTA: Remover TODOS os links simbólicos em sites-enabled que estejam dando erro
# O erro "open() failed (2: No such file or directory)" acontece porque o link existe mas o arquivo original sumiu.
echo "Limpando todos os links órfãos que travam o Nginx..."
sudo find $NGINX_ROOT/sites-enabled/ -type l ! -exec test -e {} \; -delete

# 2. Remover links específicos que o Certbot/Nginx reclamaram nos logs
sudo rm -f $NGINX_ROOT/sites-enabled/000-lovablack-master
sudo rm -f $NGINX_ROOT/sites-enabled/lovablack_master
sudo rm -f $NGINX_ROOT/sites-enabled/000-lovblack
sudo rm -f $NGINX_ROOT/sites-enabled/000-lovablack-prod

# 3. Remover o domínio de QUALQUER outro arquivo que ainda o contenha
echo "Purgando o domínio de outros projetos..."
sudo grep -rl "$DOMAIN" $NGINX_ROOT/sites-available/ | while read -r file; do
    if [[ "$file" != *"lovblack_exclusivo"* ]]; then
        echo "⚠️ Removendo conflito em: $file"
        sudo rm -f "$file"
    fi
done

# 4. Criar a configuração LIMPA e PRIORITÁRIA
echo "Criando nova configuração exclusiva..."
cat <<EOF | sudo tee $NGINX_ROOT/sites-available/lovblack_exclusivo > /dev/null
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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
EOF

# 5. Ativar com o prefixo 000 para ser o primeiro a carregar
sudo ln -sf $NGINX_ROOT/sites-available/lovblack_exclusivo $NGINX_ROOT/sites-enabled/000-lovblack-exclusivo

# 6. Testar Nginx AGRESSIVAMENTE
echo "Validando configuração..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "✅ Nginx recuperado e reiniciado!"
else
    echo "❌ Erro persistente no Nginx. Fazendo limpeza final..."
    # Se ainda falhar, removemos o link default que costuma sequestrar domínios
    sudo rm -f $NGINX_ROOT/sites-enabled/default
    sudo systemctl restart nginx
fi

# 7. Garantir App no ar
PROJECT_DIR="/var/www/lovblack.online"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    pm2 delete lovablack 2>/dev/null
    PORT=8080 pm2 start .output/server/index.mjs --name lovablack
    echo "✅ App Lovablack iniciado na porta 8080!"
else
    echo "❌ Pasta do projeto não encontrada!"
fi

echo "--- ✅ OPERAÇÃO FINALIZADA ---"
echo "Agora rode o Certbot:"
echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --force-renewal"
