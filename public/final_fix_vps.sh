#!/bin/bash

# ==========================================================================
# LOVABLACK VPS FINAL ISOLATION & PORT FIX
# Autor: Lovable Multi-Agent System (Claude Opus 4.8)
# ==========================================================================

DOMAIN="lovblack.online"
GITHUB_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_PATH="/var/www/lovablack_final"
PORT=8080

echo "🚀 INICIANDO REPARO FINAL E ISOLAMENTO DE PORTA..."

# 1. Limpeza de conflitos no Nginx
echo "🧹 Limpando links órfãos e arquivos conflitantes..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-enabled/lovblack*
sudo rm -f /etc/nginx/sites-available/lovblack*

# 2. Garantir que as ferramentas estejam prontas
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

# 3. Preparação e Build do Código do GitHub
echo "📥 Atualizando código do GitHub..."
sudo mkdir -p $INSTALL_PATH
sudo chown -R $USER:$USER $INSTALL_PATH
rm -rf $INSTALL_PATH/*
git clone $GITHUB_URL $INSTALL_PATH
cd $INSTALL_PATH
bun install && bun run build

# 4. Configuração Nginx com Prioridade Total e Porta Correta
echo "🌐 Configurando Nginx Master para Porta $PORT..."
sudo tee /etc/nginx/sites-available/lovblack_solo_v9 > /dev/null <<CONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
CONF

sudo ln -sf /etc/nginx/sites-available/lovblack_solo_v9 /etc/nginx/sites-enabled/000-lovblack-master
sudo nginx -t && sudo systemctl restart nginx

# 5. Reinicialização do PM2 com a Porta Certa
echo "🏃 Subindo aplicação no PM2..."
pm2 delete lovablack || true
pm2 start "bun run start -- --port $PORT" --name lovablack
pm2 save

echo "✅ PROCESSO FINALIZADO!"
echo "Acesse http://$DOMAIN"
echo "Para SSL: sudo certbot --nginx -d $DOMAIN"
