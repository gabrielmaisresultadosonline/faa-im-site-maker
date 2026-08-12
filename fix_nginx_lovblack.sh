#!/bin/bash
# Script de Reparo Cirúrgico para lovblack.online
# Este script resolve conflitos de VirtualHost e ajusta a porta do proxy.

echo "--- 🛠️ INICIANDO REPARAÇÃO NA VPS ---"

# 1. Identificação e Limpeza de Lixo
echo "[1/4] Removendo links simbólicos conflitantes..."
# Removemos o link antigo que está causando o "sequestro" do domínio
sudo rm -f /etc/nginx/sites-enabled/lovablack

# 2. Configuração do VirtualHost Exclusivo
echo "[2/4] Atualizando configuração exclusiva para lovblack.online..."
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

cat > /tmp/lovablack_exclusivo <<'INNEREOF'
server {
    listen 80;
    server_name lovblack.online www.lovblack.online;

    access_log /var/log/nginx/lovablack.access.log;
    error_log /var/log/nginx/lovablack.error.log;

    location / {
        proxy_pass http://127.0.0.1:8080;
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

sudo mv /tmp/lovablack_exclusivo /etc/nginx/sites-available/lovablack_exclusivo
sudo ln -sf /etc/nginx/sites-available/lovablack_exclusivo /etc/nginx/sites-enabled/lovablack_exclusivo

# 3. Teste de Sintaxe
echo "[3/4] Validando sintaxe do Nginx..."
sudo nginx -t

# 4. Reinicialização
echo "[4/4] Aplicando mudanças..."
sudo systemctl restart nginx || sudo service nginx restart

echo "--- ✅ REPARAÇÃO CONCLUÍDA ---"
echo "URL: http://lovblack.online"
echo "DICA: Se o site abrir em branco, verifique se o processo Bun está rodando na porta 8080."
