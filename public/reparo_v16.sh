#!/bin/bash
# ========================================================
# LOVABLACK VPS ULTIMATE RECOVERY V16 (DIRECT FILE)
# ========================================================

# 1. Limpeza de processos duplicados
pm2 delete all || true

# 2. Garantir diretório correto
TARGET_DIR="/var/www/lovablack"
mkdir -p $TARGET_DIR
cd $TARGET_DIR

# 3. Limpeza total do diretório para evitar conflitos de git
rm -rf * .git .github

# 4. Clonar repositório
git clone https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git .

# 5. Normalizar estrutura (se o git clonou dentro de uma subpasta)
if [ -d "awesome-website-creator" ]; then
    mv awesome-website-creator/* . || true
    mv awesome-website-creator/.* . || true
    rm -rf awesome-website-creator
fi

# 6. Instalar dependências e Build
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    # Tenta carregar o bun para a sessão atual
    [ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
fi

bun install
bun run build

# 7. Configuração Cirúrgica do Nginx (REMOVE HTTP2 E SSL TOTALMENTE)
NGINX_CONF="/etc/nginx/sites-available/lovablack_master"

cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    # Força desativação de HTTP2
    http2 off;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Headers para evitar HSTS
        add_header Last-Modified \$date_gmt;
        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        if_modified_since off;
        expires off;
        etag off;
    }
}
EOF

# 8. Ativação e Limpeza de Conflitos
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/000-lovblack*
rm -f /etc/nginx/sites-enabled/lovablack*
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/lovablack_master

# Remove o domínio de outros arquivos config para evitar sequestro
grep -lR "lovblack.online" /etc/nginx/sites-enabled/ | grep -v "lovablack_master" | xargs rm -f || true

# 9. Iniciar Aplicação
pm2 start "bun run start" --name "lovblack_master" -- --port 8080

# 10. Reiniciar Nginx
nginx -t && systemctl restart nginx

echo "========================================================"
echo "✅ REPARO V16 CONCLUÍDO DIRETAMENTE!"
echo "Site rodando em: http://lovblack.online (PORTA 80)"
echo "IMPORTANTE: Use ABA ANÔNIMA para evitar o cache de SSL."
echo "========================================================"
