#!/bin/bash
# SCRIPT NUCLEAR - LIMPEZA TOTAL DE CONFLITOS LOVBLACK.ONLINE
# Este script remove TODA e QUALQUER referência ao domínio em arquivos de outros sites.

DOMAIN="lovblack.online"
W_DOMAIN="www.lovblack.online"

echo "--- ☢️ INICIANDO LIMPEZA NUCLEAR ---"

# 1. Backup de segurança da pasta sites-available
echo "[1/6] Criando backup de /etc/nginx/sites-available..."
tar -czf /root/nginx_backup_$(date +%F).tar.gz /etc/nginx/sites-available

# 2. Desativar ABSOLUTAMENTE TUDO que não seja lovblack_final
echo "[2/6] Desativando links simbólicos conflitantes em sites-enabled..."
# Remove links que contêm o domínio
find /etc/nginx/sites-enabled/ -type l -exec grep -l "$DOMAIN" {} + | xargs -I{} rm -f {}

# 3. Remover o domínio de DENTRO de arquivos de outros sites (Cirurgia em sites-available)
echo "[3/6] Removendo menções de $DOMAIN em outros VirtualHosts para evitar sequestro..."
find /etc/nginx/sites-available/ -type f ! -name "lovblack_final" -exec grep -l "$DOMAIN" {} + | while read -r file; do
    echo "   Removendo de: $file"
    # Remove linhas que contêm o domínio ou o www dele
    sed -i "/$DOMAIN/d" "$file"
    sed -i "/$W_DOMAIN/d" "$file"
done

# 4. Criar a configuração Limpa e definitiva (HTTP e HTTPS placeholder)
echo "[4/6] Criando configuração exclusiva e definitiva..."
cat > /etc/nginx/sites-available/lovblack_final <<'INNEREOF'
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    # Logs exclusivos para monitoramento
    access_log /var/log/nginx/lovblack_access.log;
    error_log /var/log/nginx/lovblack_error.log;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
INNEREOF

ln -sf /etc/nginx/sites-available/lovblack_final /etc/nginx/sites-enabled/lovblack_final

# 5. Forçar a aplicação a rodar na 8080
echo "[5/6] Forçando reinicialização da aplicação..."
pm2 delete lovablack 2>/dev/null
cd /var/www/lovblack.online && PORT=8080 pm2 start .output/server/index.mjs --name lovablack

# 6. Reiniciar Nginx e validar
echo "[6/6] Reiniciando Nginx e testando..."
sudo nginx -t && sudo systemctl restart nginx

echo "--- ✅ LIMPEZA CONCLUÍDA ---"
echo "Acesse: http://lovblack.online"
echo "Se o HTTPS ainda abrir o site antigo, rode: sudo certbot --nginx -d lovblack.online --force-renewal"
