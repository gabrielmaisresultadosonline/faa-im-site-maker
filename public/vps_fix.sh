#!/bin/bash
DOMAIN="lovblack.online"
REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/root/lovablack_vps"

echo "🔥 [LOVABLACK] MODO DE RECUPERAÇÃO E INSTALAÇÃO FORÇADA..."

# 1. Firewall - Garantir que as portas estão abertas
echo "🔓 Abrindo portas no firewall (UFW)..."
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw reload

# 2. Limpeza Profunda de Processos e Nginx
echo "🛑 Parando serviços conflitantes..."
sudo systemctl stop nginx
sudo killall -9 node 2>/dev/null
sudo killall -9 pm2 2>/dev/null
sudo killall -9 bun 2>/dev/null

# 3. Limpar configurações do Nginx que podem causar conflito
echo "🧹 Removendo configurações fantasmas de $DOMAIN..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ 2>/dev/null | xargs -I {} sudo rm -f {} || true

# 4. Instalação do Código
echo "📦 Baixando a versão mais recente do GitHub..."
sudo rm -rf "$INSTALL_DIR"
git clone "$REPO" "$INSTALL_DIR"
cd "$INSTALL_DIR"
npm install
npm run build

# 5. Configuração do Nginx (HTTP primeiro para garantir que o SSL não trave o boot)
echo "🏗️ Configurando Nginx..."
sudo tee /etc/nginx/sites-available/lovablack > /dev/null <<INNEREOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
INNEREOF

sudo ln -sf /etc/nginx/sites-available/lovablack /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl start nginx

# 6. Iniciar Aplicação
echo "🚀 Iniciando aplicação com PM2..."
pm2 delete lovablack 2>/dev/null || true
pm2 start npm --name "lovablack" -- start

# 7. SSL - Tentar renovar/instalar se o Certbot estiver disponível
if command -v certbot &> /dev/null; then
    echo "🔐 Tentando configurar SSL automaticamente..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email mro@gmail.com || echo "⚠️ Falha ao configurar SSL, verifique o DNS."
fi

echo "✅ PROCESSO FINALIZADO!"
echo "👉 Teste agora: http://$DOMAIN"
