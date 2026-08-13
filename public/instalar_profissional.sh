#!/bin/bash

# ==========================================================================
# LOVABLACK - VPS INSTALLER PRO (ISOLATED & SECURE)
# Target: Ubuntu 24.04+ | Nginx | PM2 | Bun
# ==========================================================================

# 1. Configurações Iniciais
DOMAIN="lovblack.online"
PROJECT_DIR="/var/www/lovblack.online"
PORT=8080 # Porta isolada para este projeto

echo "🚀 Iniciando Instalação Profissional Isolada para $DOMAIN..."

# 2. Instalação de Dependências (Bun & PM2)
if ! command -v bun &> /dev/null; then
    echo "📦 Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# 3. Preparação do Diretório
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR
cd $PROJECT_DIR

# 4. Limpeza Cirúrgica do Nginx (Remover sequestradores do domínio)
echo "🧹 Limpando conflitos de Nginx para $DOMAIN..."
NGINX_CONF="/etc/nginx"

# Remove qualquer menção ao domínio em outros arquivos de configuração
sudo grep -rl "$DOMAIN" $NGINX_CONF/sites-enabled/ | while read -r file; do
    if [[ "$file" != *"lovblack"* ]]; then
        echo "⚠️ Removendo conflito em $file"
        sudo rm "$file"
    fi
done

# Remove links órfãos que travam o Nginx
sudo find $NGINX_CONF/sites-enabled/ -xtype l -delete

# 5. Configuração Exclusiva do Nginx
echo "🛠️ Criando configuração mestre do Nginx..."
sudo tee $NGINX_CONF/sites-available/lovblack_v7 > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
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

sudo ln -sf $NGINX_CONF/sites-available/lovblack_v7 $NGINX_CONF/sites-enabled/000-lovblack

# 6. Build do Projeto (Simulado aqui, assumindo que os arquivos já estão na pasta)
# Se você estiver rodando isso pela primeira vez, certifique-se de ter feito o upload dos arquivos ou git clone
if [ -f "package.json" ]; then
    echo "📦 Instalando dependências do projeto..."
    bun install
    echo "🏗️ Gerando build..."
    bun run build
fi

# 7. Iniciar com PM2 (Modo Isolado)
echo "♻️ Reiniciando processo PM2..."
pm2 delete $DOMAIN 2>/dev/null || true
# Usamos a porta definida para evitar conflitos
PORT=$PORT pm2 start "bun run start" --name $DOMAIN

# 8. Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
sudo nginx -t && sudo systemctl restart nginx

echo "----------------------------------------------------------------"
echo "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "🌐 Acesse: http://$DOMAIN"
echo "🔐 Após validar o acesso, rode: sudo certbot --nginx -d $DOMAIN"
echo "----------------------------------------------------------------"
