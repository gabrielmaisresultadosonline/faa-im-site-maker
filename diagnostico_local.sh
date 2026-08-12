#!/bin/bash
DOMAIN="lovblack.online"

echo "--- 🔍 BUSCA POR CONFIGURAÇÕES ---"
if [ -d /etc/nginx ]; then
    grep -ril "$DOMAIN" /etc/nginx/ 2>/dev/null
else
    echo "Diretório /etc/nginx não encontrado. Verificando Apache..."
    [ -d /etc/apache2 ] && grep -ril "$DOMAIN" /etc/apache2/ 2>/dev/null
fi

echo -e "\n--- 📂 CONTEÚDO DE sites-enabled ---"
[ -d /etc/nginx/sites-enabled ] && ls -l /etc/nginx/sites-enabled/

echo -e "\n--- 🌐 TESTE DE CABEÇALHOS ---"
curl -I -H "Host: $DOMAIN" http://127.0.0.1 2>/dev/null | head -n 5

echo -e "\n--- 📦 PM2 ---"
pm2 list 2>/dev/null | grep -E "id|lovablack" || echo "PM2 não encontrado ou sem processos."
