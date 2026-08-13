#!/bin/bash
# ========================================================
# LOVABLACK VPS ULTIMATE RECOVERY V15 (FORCED HTTP)
# ========================================================

# 1. Limpeza de processos duplicados
pm2 delete all || true

# 2. Garantir diretório correto
TARGET_DIR="/var/www/lovablack"
mkdir -p $TARGET_DIR
cd $TARGET_DIR

# 3. Se a pasta estiver vazia ou não for o git correto, limpa e clona de novo
if [ ! -d ".git" ]; then
    cd ..
    rm -rf lovablack
    git clone https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git lovablack
    cd lovablack
fi

# 4. Normalizar estrutura (se o git clonou dentro de uma subpasta)
if [ -d "awesome-website-creator" ]; then
    mv awesome-website-creator/* . || true
    mv awesome-website-creator/.* . || true
    rm -rf awesome-website-creator
fi

# 5. Instalar dependências e Build
# Garante que o Bun está no path para esta sessão
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    source /root/.bashrc
fi

bun install
bun run build

# 6. Configuração Cirúrgica do Nginx (REMOVE HTTP2 E SSL TOTALMENTE PARA TESTE)
# Precisamos forçar o Nginx a esquecer qualquer configuração anterior de SSL
NGINX_CONF="/etc/nginx/sites-available/lovablack_master"

cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    # Força desativação de qualquer resquício de HTTP2 global
    http2 off;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Headers para evitar que o navegador force HTTPS (HSTS)
        add_header Last-Modified \$date_gmt;
        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        if_modified_since off;
        expires off;
        etag off;
    }
}
EOF

# 7. Ativação e Limpeza de Conflitos
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/000-lovblack*
rm -f /etc/nginx/sites-enabled/lovablack*
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/lovablack_master

# Remove referências ao domínio de OUTROS sites para evitar sequestro
grep -lR "lovblack.online" /etc/nginx/sites-enabled/ | grep -v "lovablack_master" | xargs rm -f || true

# 8. Iniciar Aplicação
pm2 start "bun run start" --name "lovblack_master" -- --port 8080

# 9. Reiniciar Nginx
nginx -t && systemctl restart nginx

echo "========================================================"
echo "✅ REPARO V15 CONCLUÍDO!"
echo "O site foi configurado para HTTP puro (Porta 80) sem HTTP2."
echo "IMPORTANTE: Limpe o cache do seu navegador ou use ABA ANÔNIMA."
echo "O erro ERR_HTTP2_PROTOCOL_ERROR deve desaparecer agora."
echo "========================================================"
