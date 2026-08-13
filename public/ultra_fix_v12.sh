#!/bin/bash

# ==========================================================================
# LOVABLACK VPS ULTRA FIX - V12 (FORCE PURGE & RE-CLONE)
# Autor: Lovable Multi-Agent System (Claude Opus 4.8)
# ==========================================================================

DOMAIN="lovblack.online"
GITHUB_URL="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_PATH="/var/www/lovablack_master_v12"
PORT=8080

echo "🚀 INICIANDO ULTRA FIX V12 (PURGA TOTAL)..."

# 1. PARAR PROCESSOS ANTIGOS
pm2 stop lovablack || true
pm2 delete lovablack || true

# 2. LIMPEZA AGRESSIVA DE NGINX (DOMÍNIO SEQUESTRADO)
echo "🧹 Expulsando outros sites do domínio $DOMAIN..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-enabled/lovblack*
sudo rm -f /etc/nginx/sites-available/lovblack*

# Remove o domínio de qualquer arquivo que ainda o contenha (acessar.clique, etc)
grep -lR "$DOMAIN" /etc/nginx/sites-enabled/ | xargs -r sudo sed -i "/$DOMAIN/d"

# 3. PURGA DA PASTA DE INSTALAÇÃO (EVITAR ERRO DE DESTINATION EXISTS)
echo "📂 Purgando pasta de instalação antiga..."
sudo rm -rf /var/www/lovablack_final
sudo rm -rf $INSTALL_PATH
sudo mkdir -p $INSTALL_PATH
sudo chown -R $USER:$USER $INSTALL_PATH

# 4. CLONE LIMPO DIRETAMENTE NA RAIZ
echo "📥 Clonando repositório GitHub..."
git clone $GITHUB_URL $INSTALL_PATH
cd $INSTALL_PATH

# Se clonou dentro de uma subpasta, move tudo para a raiz
if [ ! -f "package.json" ]; then
    echo "📁 Corrigindo estrutura de pastas..."
    # Acha a primeira subpasta e move o conteúdo
    SUBDIR=$(ls -d */ | head -n 1)
    if [ -n "$SUBDIR" ]; then
        mv $SUBDIR* . 2>/dev/null
        mv $SUBDIR.* . 2>/dev/null
        rmdir $SUBDIR
    fi
fi

# 5. INSTALAÇÃO E BUILD
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "🛠️ Rodando bun install..."
bun install
echo "🛠️ Rodando bun run build..."
bun run build

# 6. CONFIGURAÇÃO NGINX MESTRE (PORTA 8080)
echo "🌐 Configurando Nginx Prioridade Total..."
sudo tee /etc/nginx/sites-available/lovblack_v12 > /dev/null <<CONF
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

sudo ln -sf /etc/nginx/sites-available/lovblack_v12 /etc/nginx/sites-enabled/000-lovblack-priority
sudo nginx -t && sudo systemctl restart nginx

# 7. PM2 START FORÇADO
echo "🏃 Iniciando aplicação no PM2..."
pm2 start "bun run start -- --port $PORT" --name lovablack
pm2 save

echo "✅ ULTRA FIX V12 CONCLUÍDO!"
echo "Teste agora (HTTP): http://$DOMAIN"
echo "Após abrir, rode: sudo certbot --nginx -d $DOMAIN"
