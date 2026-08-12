#!/bin/bash
DOMAIN="lovblack.online"

echo "--- 🔍 BUSCA POR CONFIGURAÇÕES OCULTAS ---"
# Procura o domínio em TODO o diretório /etc/nginx (incluindo subpastas e backups do certbot)
sudo grep -ril "$DOMAIN" /etc/nginx/

echo -e "\n--- 📂 CONTEÚDO DE sites-enabled ---"
ls -l /etc/nginx/sites-enabled/

echo -e "\n--- 🌐 TESTE DE CABEÇALHOS (LOCAL) ---"
# Verifica quem está respondendo localmente quando pedimos o domínio
curl -I -H "Host: $DOMAIN" http://127.0.0.1 2>/dev/null | grep -E "Server|Location|HTTP/"

echo -e "\n--- 📦 PROCESSOS ATIVOS ---"
sudo pm2 list | grep -E "id|lovablack"

echo -e "\n--- 🛡️ VERIFICANDO DEFAULT SERVER ---"
# Verifica se existe um "default_server" que está capturando o tráfego do domínio
grep -r "default_server" /etc/nginx/sites-enabled/
