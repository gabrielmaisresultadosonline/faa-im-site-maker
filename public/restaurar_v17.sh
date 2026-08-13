#!/bin/bash
# ========================================================
# LOVABLACK VPS RESTORE & ISOLATE V17 (SAFETY FIRST)
# ========================================================

# 1. Restaurar o site Beleza Liso Perfeito
echo "Restaurando outros sites..."
if [ -f "/etc/nginx/sites-available/belezalisoperfeito" ]; then
    ln -sf /etc/nginx/sites-available/belezalisoperfeito /etc/nginx/sites-enabled/belezalisoperfeito
fi
if [ -f "/etc/nginx/sites-available/zapmro" ]; then
    ln -sf /etc/nginx/sites-available/zapmro /etc/nginx/sites-enabled/zapmro
fi

# 2. Identificar e Reiniciar Processos PM2 que podem ter caído (502)
echo "Verificando processos PM2..."
pm2 list
# Tenta reiniciar tudo que estiver 'errored' ou 'stopped'
pm2 restart all || true

# 3. Configuração Cirúrgica para LOVBLACK (SEM AFETAR OS OUTROS)
echo "Configurando Lovablack..."
NGINX_LOVBLACK="/etc/nginx/sites-available/lovablack_master"
cat <<EOF > $NGINX_LOVBLACK
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    # Desativa HTTP2 para este domínio específico para resolver ERR_HTTP2_PROTOCOL_ERROR
    http2 off;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Previne cache de SSL antigo
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

ln -sf $NGINX_LOVBLACK /etc/nginx/sites-enabled/lovablack_master

# 4. Remover APENAS o domínio lovblack de outros arquivos (Surgical Cleaning)
# Isso evita que o lovblack seja "sequestrado" sem deletar os arquivos dos outros sites
echo "Limpando conflitos de domínio..."
find /etc/nginx/sites-enabled/ -type f -not -name "lovablack_master" -exec sed -i 's/lovblack.online//g' {} +
find /etc/nginx/sites-enabled/ -type f -not -name "lovablack_master" -exec sed -i 's/www.lovblack.online//g' {} +

# 5. Aplicar e Verificar
echo "Reiniciando serviços..."
nginx -t && systemctl restart nginx

echo "========================================================"
echo "✅ RESTAURAÇÃO V17 CONCLUÍDA!"
echo "1. Outros sites (Beleza Liso) foram reativados no Nginx."
echo "2. O domínio lovblack.online foi isolado."
echo "3. O suporte a HTTP2 foi desativado para evitar erros de protocolo."
echo "IMPORTANTE: Se o Beleza Liso continuar em 502, verifique o PM2 dele."
echo "========================================================"
