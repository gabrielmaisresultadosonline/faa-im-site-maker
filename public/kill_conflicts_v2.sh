#!/bin/bash
# Script Definitivo para Reivindicar lovblack.online
# Este script remove QUALQUER configuração do Nginx que mencione o domínio,
# exceto a configuração que nós mesmos criarmos agora.

DOMAIN="lovblack.online"
NGINX_ROOT="/etc/nginx"

echo "=== INICIANDO LIMPEZA TOTAL DE CONFLITOS PARA $DOMAIN ==="

# 1. Parar o Nginx para evitar erros de arquivo em uso
sudo systemctl stop nginx

# 2. Procurar e REMOVER qualquer arquivo que contenha o domínio lovblack.online
# Ignora a pasta lovablack onde o projeto reside
echo "Limpando configurações antigas..."
grep -rl "$DOMAIN" "$NGINX_ROOT" 2>/dev/null | xargs -I {} sudo rm -f {} || true

# 3. Remover o default do Nginx que pode estar capturando o tráfego
sudo rm -f "$NGINX_ROOT/sites-enabled/default"
sudo rm -f "$NGINX_ROOT/sites-available/default"

# 4. Limpar links simbólicos quebrados
sudo find "$NGINX_ROOT/sites-enabled/" -xtype l -delete

# 5. Criar a nova configuração LIMPA e PRIORITÁRIA
echo "Criando nova configuração prioritária..."
sudo tee "$NGINX_ROOT/sites-available/lovablack" > /dev/null <<INNEREOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN;

    # Log para debug
    access_log /var/log/nginx/lovablack_access.log;
    error_log /var/log/nginx/lovablack_error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
INNEREOF

# 6. Ativar a configuração
sudo ln -sf "$NGINX_ROOT/sites-available/lovablack" "$NGINX_ROOT/sites-enabled/lovablack"

# 7. Forçar a morte de qualquer processo teimoso
sudo killall -9 nginx 2>/dev/null || true

# 8. Testar e reiniciar
echo "Testando configuração..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Sucesso! Reiniciando Nginx..."
    sudo systemctl start nginx
    echo "=== O DOMÍNIO $DOMAIN AGORA DEVE APONTAR PARA LOVABLACK ==="
else
    echo "ERRO: A configuração do Nginx falhou. Verifique os logs."
    sudo systemctl start nginx # Tenta subir o que der
fi
