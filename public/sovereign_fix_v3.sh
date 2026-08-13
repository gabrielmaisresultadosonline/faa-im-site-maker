#!/bin/bash
DOMAIN="lovblack.online"
BELEZA_DOMAIN="belezalisoperfeito.online"
PROJECT_DIR="/var/www/lovblack.online"

echo "--- 🚑 RESGATE DE EMERGÊNCIA (FIX MULTI-SITE) ---"

# 1. Identificar onde o "acessar.clique" está sequestrando o domínio
echo "Removendo sequestros de domínio..."
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | while read -r file; do
    if [[ "$file" != *"lovblack"* ]]; then
        echo "⚠️  Limpando $DOMAIN de configuração alheia: $file"
        # Comenta as linhas que mencionam o domínio em outros arquivos para não quebrar o Nginx
        sudo sed -i "s/$DOMAIN//g" "$file"
        sudo sed -i "s/www.$DOMAIN//g" "$file"
    fi
done

# 2. Configuração CIRÚRGICA para o Lovblack
cat <<EOT | sudo tee /etc/nginx/sites-available/lovblack_final > /dev/null
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
    }
}
EOT

# 3. Configuração CIRÚRGICA para o BelezaLiso (Resolvendo 502)
# Nota: Assumindo porta 3000 ou similar, ajuste conforme necessário
# Se o usuário não souber a porta, tentaremos detectar processos node rodando
PORT_BELEZA=$(pm2 jlist | jq -r '.[] | select(.name=="belezalisoperfeito") | .pm2_env.PORT' 2>/dev/null)
if [ -z "$PORT_BELEZA" ] || [ "$PORT_BELEZA" == "null" ]; then PORT_BELEZA=3000; fi

cat <<EOT | sudo tee /etc/nginx/sites-available/belezalisoperfeito > /dev/null
server {
    listen 80;
    server_name $BELEZA_DOMAIN www.$BELEZA_DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT_BELEZA;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
}
EOT

# 4. Ativar e Limpar Links Fantasmas
sudo ln -sf /etc/nginx/sites-available/lovblack_final /etc/nginx/sites-enabled/000-lovblack
sudo ln -sf /etc/nginx/sites-available/belezalisoperfeito /etc/nginx/sites-enabled/belezalisoperfeito
sudo find /etc/nginx/sites-enabled/ -type l ! -exec test -e {} \; -delete

# 5. Reiniciar Nginx e PM2
echo "Reiniciando serviços..."
sudo nginx -t && sudo systemctl restart nginx
pm2 restart all

echo "--- ✅ SITES RECUPERADOS! ---"
echo "Verifique Lovblack.online e BelezaLisoPerfeito.online"
