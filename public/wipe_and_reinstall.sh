#!/bin/bash
DOMAIN="lovblack.online"
PROJECT_DIR="/var/www/lovblack.online"

echo "--- 🚮 DESINSTALANDO TUDO (CLEAN SLATE) ---"

# 1. Parar e remover processos PM2
echo "Parando processos..."
pm2 stop lovablack 2>/dev/null
pm2 delete lovablack 2>/dev/null
pm2 save --force

# 2. Limpar Nginx de forma agressiva
echo "Limpando Nginx..."
# Remove TODOS os arquivos que citam o domínio em available e enabled
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | xargs sudo rm -f
sudo find /etc/nginx/sites-enabled/ -name "*$DOMAIN*" -delete
# Remove links quebrados
sudo find /etc/nginx/sites-enabled/ -type l ! -exec test -e {} \; -delete

# 3. Remover a pasta do projeto para começar do zero
echo "Removendo arquivos do projeto..."
sudo rm -rf "$PROJECT_DIR"

# 4. Criar a pasta limpa
sudo mkdir -p "$PROJECT_DIR"
sudo chown -R $USER:$USER "$PROJECT_DIR"

echo "--- 🏗️ INSTALANDO DO ZERO ---"

# 5. Clonar o projeto (ou copiar se já estiver no servidor, aqui vamos baixar o build se disponível)
# Nota: Como o ambiente Lovable gera o código, vamos assumir que o usuário vai rodar o deploy_v4.sh ou similar após este wipe.
# Mas para garantir, vamos criar o VHost mestre agora.

cat <<EOF | sudo tee /etc/nginx/sites-available/lovblack_exclusivo > /dev/null
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

sudo ln -sf /etc/nginx/sites-available/lovblack_exclusivo /etc/nginx/sites-enabled/000-lovblack-final
sudo systemctl restart nginx

echo "--- ✅ LIMPEZA TOTAL CONCLUÍDA! ---"
echo "A VPS está limpa. Agora você pode rodar o seu comando de instalação principal:"
echo "curl -O https://lovblack.online/deploy_v4.sh && chmod +x deploy_v4.sh && ./deploy_v4.sh"
