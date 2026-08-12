#!/bin/bash
DOMAIN="lovblack.online"

echo "--- 📋 LISTANDO TODOS OS SITES ATIVOS NO NGINX ---"
ls -l /etc/nginx/sites-enabled/

echo -e "\n--- 🔍 BUSCANDO O DOMÍNIO EM TODOS OS ARQUIVOS DO NGINX ---"
sudo grep -rn "$DOMAIN" /etc/nginx/

echo -e "\n--- 🌐 TESTANDO CONEXÃO LOCAL NA PORTA 8080 (PM2) ---"
curl -I http://127.0.0.1:8080 2>/dev/null | head -n 5

echo -e "\n--- 🌍 TESTANDO CABEÇALHOS EXTERNOS (LOCALMENTE) ---"
curl -I -H "Host: $DOMAIN" http://127.0.0.1 2>/dev/null | head -n 5

echo -e "\n--- 📝 CONTEÚDO DO ARQUIVO ATIVO DO LOVABLACK ---"
ACTIVE_FILE=$(sudo grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ | head -n 1)
if [ -n "$ACTIVE_FILE" ]; then
    cat "$ACTIVE_FILE"
else
    echo "Nenhum arquivo de configuração ativo encontrado para $DOMAIN"
fi
