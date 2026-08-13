#!/bin/bash
DOMAIN="lovblack.online"
NGINX_ROOT="/etc/nginx"

echo "--- 🚀 OPERAÇÃO DOMÍNIO EXCLUSIVO (NGINX DEEP PURGE) ---"

# 1. Identificar e Deletar TODO arquivo que menciona o domínio
# Não vamos apenas editar, vamos remover para garantir que nenhum 'default_server' antigo pegue o domínio
echo "Buscando e destruindo configurações conflitantes..."
sudo grep -rl "$DOMAIN" $NGINX_ROOT/sites-available/ | while read -r file; do
    echo "⚠️ Deletando arquivo conflitante: $file"
    sudo rm -f "$file"
done

# 2. Limpar links em sites-enabled
echo "Limpando links em sites-enabled..."
sudo find $NGINX_ROOT/sites-enabled/ -type l -name "*$DOMAIN*" -delete
sudo rm -f $NGINX_ROOT/sites-enabled/000-lovblack
sudo rm -f $NGINX_ROOT/sites-enabled/lovablack_master
sudo rm -f $NGINX_ROOT/sites-enabled/000-lovablack-master
sudo rm -f $NGINX_ROOT/sites-enabled/default

# 3. Criar a ÚNICA configuração válida para este domínio
echo "Gerando nova configuração master..."
cat <<EOF | sudo tee $NGINX_ROOT/sites-available/lovblack_exclusivo > /dev/null
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Proteção contra sequestro: se o domínio vier aqui, ele VAI para o nosso app
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

# 4. Ativar com a prioridade mais alta possível (000-z-...)
sudo ln -sf $NGINX_ROOT/sites-available/lovblack_exclusivo $NGINX_ROOT/sites-enabled/000-lovblack-exclusivo

# 5. Reiniciar Nginx forçadamente
echo "Testando e reiniciando Nginx..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "✅ Nginx configurado!"
else
    echo "❌ Erro no Nginx. Tentando corrigir links órfãos..."
    sudo find $NGINX_ROOT/sites-enabled/ -type l ! -exec test -e {} \; -delete
    sudo systemctl restart nginx
fi

# 6. Forçar PM2 a rodar o app na porta 8080
echo "Configurando PM2..."
PROJECT_DIR="/var/www/lovblack.online"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    pm2 delete lovablack 2>/dev/null
    PORT=8080 pm2 start .output/server/index.mjs --name lovablack
    pm2 save
    echo "✅ App reiniciado na porta 8080!"
else
    echo "❌ ERRO: Pasta $PROJECT_DIR não encontrada!"
fi

echo "--- ✅ PROCESSO CONCLUÍDO! ---"
echo "Agora rode o comando final para o SSL:"
echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --force-renewal"
