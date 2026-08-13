#!/bin/bash
DOMAIN="lovblack.online"
NGINX_CONF_DIR="/etc/nginx"

echo "--- 🕵️ RASTREAMENTO E ISOLAMENTO DE DOMÍNIO ---"

# 1. Localizar TODOS os arquivos que mencionam o domínio
echo "Buscando o domínio em configurações do Nginx..."
CONFLITOS=$(sudo grep -rl "$DOMAIN" $NGINX_CONF_DIR)

if [ -z "$CONFLITOS" ]; then
    echo "Nenhum arquivo encontrado mencionando $DOMAIN."
else
    echo "Arquivos encontrados:"
    echo "$CONFLITOS"
    
    echo "--- 🛠️ APLICANDO ISOLAMENTO CIRÚRGICO ---"
    for file in $CONFLITOS; do
        # Se for um arquivo em sites-available que NÃO seja o nosso master
        if [[ "$file" == *"/sites-available/"* ]] && [[ "$file" != *"lovablack_final"* ]]; then
            echo "Editando $file para remover o domínio conflitante..."
            # Remove o domínio da linha server_name sem apagar o arquivo (preserva outros sites no mesmo vhost)
            sudo sed -i "s/\b$DOMAIN\b//g" "$file"
            sudo sed -i "s/\bwww.$DOMAIN\b//g" "$file"
        fi
    done
fi

# 2. Limpar links simbólicos órfãos ou errados
echo "Limpando links de sites-enabled..."
sudo find $NGINX_CONF_DIR/sites-enabled/ -type l ! -exec test -e {} \; -delete
sudo rm -f $NGINX_CONF_DIR/sites-enabled/000-lovblack
sudo rm -f $NGINX_CONF_DIR/sites-enabled/lovablack_master

# 3. Criar o arquivo de configuração mestre EXCLUSIVO
echo "Criando configuração mestre para $DOMAIN..."
cat <<EOF | sudo tee $NGINX_CONF_DIR/sites-available/lovablack_master > /dev/null
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
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
EOF

# 4. Ativar com prioridade absoluta (000 prefix)
sudo ln -sf $NGINX_CONF_DIR/sites-available/lovablack_master $NGINX_CONF_DIR/sites-enabled/000-lovablack-master

# 5. Verificar e Reiniciar Nginx
echo "Testando Nginx..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "--- ✅ NGINX CONFIGURADO COM EXCLUSIVIDADE! ---"
else
    echo "--- ❌ ERRO NO NGINX. Verifique os logs acima. ---"
    exit 1
fi

# 6. Garantir que o processo Node está na porta 8080
echo "Verificando processo na porta 8080..."
PROJECT_ROOT="/var/www/lovblack.online"
if [ -d "$PROJECT_ROOT" ]; then
    cd "$PROJECT_ROOT"
    pm2 delete lovablack 2>/dev/null
    PORT=8080 pm2 start .output/server/index.mjs --name lovablack
    echo "--- ✅ PROCESSO REINICIADO NA PORTA 8080 ---"
else
    echo "--- ⚠️ AVISO: Pasta do projeto não encontrada em $PROJECT_ROOT ---"
fi

echo "Próximo passo: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --force-renewal"
