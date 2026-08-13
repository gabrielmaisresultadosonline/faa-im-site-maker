#!/bin/bash

# ==========================================================================
# LOVABLACK VPS FINAL REPAIR - V11 (SOLVING CLONE & PORT ISSUES)
# ==========================================================================

DOMAIN="lovblack.online"
GITHUB_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_PATH="/var/www/lovablack_isolated"
PORT=8080

echo "🚀 INICIANDO REPARO MESTRE V11..."

# 1. Limpeza total de links antigos do Nginx
echo "🧹 Removendo configurações conflitantes..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-enabled/lovblack*
sudo rm -f /etc/nginx/sites-available/lovblack*

# 2. Garantir ferramentas no PATH
export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:$PATH"

# 3. Preparação do Código do GitHub com verificação de pasta
echo "📥 Clonando e preparando repositório..."
sudo mkdir -p $INSTALL_PATH
sudo chown -R $USER:$USER $INSTALL_PATH
rm -rf $INSTALL_PATH/*
git clone $REPO_URL $INSTALL_PATH
cd $INSTALL_PATH

# VERIFICAÇÃO CRÍTICA: Se o clone criou uma subpasta (ex: awesome-website-creator)
if [ ! -f "package.json" ]; then
    echo "📂 Ajustando diretório do projeto..."
    SUBDIR=$(ls -d */ | head -n 1)
    if [ -n "$SUBDIR" ]; then
        mv $SUBDIR/* .
        mv $SUBDIR/.* . 2>/dev/null
        rmdir $SUBDIR
    fi
fi

# 4. Build
echo "🛠️ Instalando e Gerando Build..."
bun install
bun run build

# 5. Nginx Master Priority (Força o domínio a vir para cá)
echo "🌐 Configurando Nginx Master..."
sudo tee /etc/nginx/sites-available/lovblack_solo_v11 > /dev/null <<CONF
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

sudo ln -sf /etc/nginx/sites-available/lovblack_solo_v11 /etc/nginx/sites-enabled/000-lovblack-priority
sudo nginx -t && sudo systemctl restart nginx

# 6. PM2 - Reiniciar forçando porta e diretório correto
echo "🏃 Subindo aplicação no PM2..."
pm2 delete lovablack || true
pm2 start "bun run start -- --port $PORT" --name lovablack
pm2 save

echo "✅ REPARO CONCLUÍDO!"
echo "Teste agora: http://$DOMAIN"
