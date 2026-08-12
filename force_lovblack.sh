#!/bin/bash
# Script de Resgate Total - lovblack.online
# Este script força o Nginx a entregar o site correto e mata processos fantasmas.

echo "--- 🚀 INICIANDO RESGATE DO DOMÍNIO lovblack.online ---"

# 1. Limpeza Radical de Nginx
echo "[1/4] Removendo qualquer VirtualHost que cite o domínio..."
# Desativa tudo que tenha o domínio e não seja o nosso oficial
find /etc/nginx/sites-enabled/ -type l -print0 | xargs -0 grep -l "lovblack.online" | xargs -I{} rm -f {}

# 2. Configuração Prioritária
echo "[2/4] Criando configuração exclusiva e prioritária..."
cat > /etc/nginx/sites-available/lovblack_prioridade <<'INNEREOF'
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    # Impede que outros sites 'sequestrem' o tráfego via default_server
    if ($host !~* ^(lovblack\.online|www\.lovblack\.online)$ ) {
        return 444;
    }

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

ln -sf /etc/nginx/sites-available/lovblack_prioridade /etc/nginx/sites-enabled/lovblack_prioridade

# 3. Verificar Processo da Aplicação
echo "[3/4] Reiniciando processo da aplicação no PM2..."
pm2 delete lovablack 2>/dev/null
cd /var/www/lovblack.online
pm2 start .output/server/index.mjs --name "lovablack" --env PORT=8080

# 4. Aplicar e Validar
echo "[4/4] Reiniciando Nginx..."
sudo nginx -t && sudo systemctl restart nginx

echo "--- ✅ RESGATE CONCLUÍDO ---"
echo "Verifique em: http://lovblack.online"
