#!/bin/bash
# Lovablack Clean Install V20
# Este script instala o projeto do zero de forma isolada no domínio lovblack.online

DOMAIN="lovblack.online"
REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
INSTALL_DIR="/var/www/lovablack_master"
PORT=8095

echo "--- INICIANDO INSTALAÇÃO DO ZERO (V20) ---"

# 1. Preparar ambiente
mkdir -p /var/www
rm -rf $INSTALL_DIR
git clone $REPO $INSTALL_DIR

cd $INSTALL_DIR

# 2. Instalar Bun se não existir
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# 3. Build do projeto
echo "Instalando dependências e gerando build..."
bun install
bun run build

# 3.1 Sincronizar Assets (Correção para imagens quebradas)
echo "Garantindo que logos e imagens foram copiados..."
cp -r public/* .output/public/ 2>/dev/null || true


# 4. Configurar Nginx (Isolado, sem SSL para limpar cache de protocolo)
echo "Configurando Nginx na porta $PORT..."
cat <<EOF > /etc/nginx/sites-available/000-lovblack-priority
server {
    listen 80;
    server_name $DOMAIN;

    # Desativa HTTP2 explicitamente para evitar o erro de protocolo
    http2 off;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/000-lovblack-priority /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 5. Iniciar no PM2
echo "Iniciando aplicação no PM2..."
pm2 delete lovblack_master 2>/dev/null
PORT=$PORT pm2 start bun --name "lovblack_master" -- run start
pm2 save --force

echo "--- INSTALAÇÃO CONCLUÍDA! ---"
echo "Acesse: http://$DOMAIN"
echo "IMPORTANTE: Use uma ABA ANÔNIMA para testar."
