#!/bin/bash
DOMAIN="lovblack.online"
PROJECT_DIR="/var/www/lovblack.online"
PORT=8080

echo "--- 🛠️ RESTAURANDO MULTI-PROJETOS (COEXISTÊNCIA) ---"

# 1. Recuperar links do Nginx que foram removidos
echo "Restaurando links do Nginx..."
cd /etc/nginx/sites-available/
for file in *; do
    if [ -f "$file" ] && [ "$file" != "default" ]; then
        echo "Ativando: $file"
        sudo ln -sf "/etc/nginx/sites-available/$file" "/etc/nginx/sites-enabled/"
    fi
done

# 2. Criar configuração específica para Lovblack sem conflitos
echo "Configurando $DOMAIN..."
cat <<EOT | sudo tee /etc/nginx/sites-available/lovblack_coexistence > /dev/null
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
EOT

sudo ln -sf /etc/nginx/sites-available/lovblack_coexistence /etc/nginx/sites-enabled/000-lovblack-priority

# 3. Remover links fantasmas que travam o Nginx
sudo find /etc/nginx/sites-enabled/ -type l ! -exec test -e {} \; -delete

# 4. Validar e Reiniciar Nginx
sudo nginx -t && sudo systemctl restart nginx

# 5. Restaurar Processos PM2 (incluindo os outros)
echo "Iniciando todos os apps no PM2..."
# O PM2 deve ter salvo o dump anterior, mas vamos garantir que o Lovblack rode
pm2 start "$PROJECT_DIR/.output/server/index.mjs" --name "lovblack" 2>/dev/null || pm2 restart lovblack
pm2 start all # Tenta subir os outros que foram parados

pm2 save --force

echo "--- ✅ TUDO RESTAURADO! ---"
echo "O Lovblack e os outros sites devem estar online agora."
