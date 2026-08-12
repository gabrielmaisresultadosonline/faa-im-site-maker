#!/bin/bash
DOMAIN="lovblack.online"
W_DOMAIN="www.lovblack.online"

echo "--- 🛠️ INICIANDO SUPER ISOLAMENTO ---"

# 1. Matar qualquer configuração que tenha o domínio em outros arquivos
echo "[1/4] Expurgando $DOMAIN de todos os outros VirtualHosts..."
grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ | grep -v "lovblack_final" | xargs -I{} rm -f {}
grep -rl "$DOMAIN" /etc/nginx/sites-available/ | grep -v "lovblack_final" | while read -r file; do
    echo "Limpando $file"
    sed -i "/$DOMAIN/d" "$file"
    sed -i "/$W_DOMAIN/d" "$file"
done

# 2. Criar configuração Nginx com prioridade absoluta e porta correta
echo "[2/4] Criando VirtualHost isolado (Porta 8080)..."
cat > /etc/nginx/sites-available/lovblack_final <<INNEREOF
server {
    listen 80;
    server_name $DOMAIN $W_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
INNEREOF

ln -sf /etc/nginx/sites-available/lovblack_final /etc/nginx/sites-enabled/lovblack_final

# 3. Garantir que o PM2 está rodando na porta 8080
echo "[3/4] Reiniciando aplicação no PM2 na porta 8080..."
pm2 delete lovablack 2>/dev/null
cd /var/www/lovblack.online
PORT=8080 pm2 start .output/server/index.mjs --name lovablack

# 4. Forçar renovação do SSL para garantir que aponte para o lugar certo
echo "[4/4] Reiniciando Nginx e sugerindo SSL..."
sudo nginx -t && sudo systemctl restart nginx

echo "--- ✅ ISOLAMENTO CONCLUÍDO ---"
echo "Para HTTPS funcionar 100%, rode agora: sudo certbot --nginx -d $DOMAIN -d $W_DOMAIN --force-renewal"
