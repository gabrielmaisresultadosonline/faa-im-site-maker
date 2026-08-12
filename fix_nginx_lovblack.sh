#!/bin/bash
# Script Cirúrgico para Consertar lovblack.online sem quebrar outros sites

echo "--- 🛠️ INICIANDO REPARAÇÃO CIRÚRGICA ---"

# 1. Desativar VirtualHosts conflitantes (apenas os que apontam para lovblack)
echo "[1/4] Desativando links simbólicos antigos..."
rm -f /etc/nginx/sites-enabled/lovablack
# Mantemos o lovablack_exclusivo pois ele é o que queremos

# 2. Criar configuração definitiva (Porta 80 e Redirecionamento HTTPS se existir)
echo "[2/4] Refinando configuração exclusiva..."
cat > /etc/nginx/sites-available/lovablack_exclusivo <<'INNEREOF'
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    # Logs para debug
    access_log /var/log/nginx/lovablack.access.log;
    error_log /var/log/nginx/lovablack.error.log;

    location / {
        proxy_pass http://127.0.0.1:8080; # Porta padrão do TanStack Start
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
INNEREOF

# 3. Garantir que o link simbólico esteja correto
ln -sf /etc/nginx/sites-available/lovablack_exclusivo /etc/nginx/sites-enabled/lovablack_exclusivo

# 4. Testar e Reiniciar
echo "[3/4] Validando sintaxe do Nginx..."
sudo nginx -t

echo "[4/4] Reiniciando Nginx..."
sudo systemctl restart nginx || sudo service nginx restart

echo "--- ✅ REPARAÇÃO CONCLUÍDA ---"
echo "Acesse agora: http://lovblack.online"
