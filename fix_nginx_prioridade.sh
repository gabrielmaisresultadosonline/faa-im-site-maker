#!/bin/bash
DOMAIN="lovblack.online"

echo "--- 🛠️ INICIANDO CORREÇÃO DE PRIORIDADE ---"

# 1. Identificar e remover QUALQUER arquivo que não seja o lovblack_final_v3 que mencione o domínio
echo "[1/4] Removendo configurações conflitantes..."
sudo grep -rl "$DOMAIN" /etc/nginx/sites-enabled/ | grep -v "lovblack_final_v3" | xargs -I{} sudo rm -v {}

# 2. Garantir que o arquivo lovblack_final_v3 seja o 'default_server' para evitar que outros sites capturem o tráfego
echo "[2/4] Ajustando prioridade no arquivo de configuração..."
sudo cat > /etc/nginx/sites-available/lovblack_final_v3 <<INNEREOF
server {
    listen 80;
    listen [::]:80;
    server_name lovblack.online www.lovblack.online;

    # Forçar o Nginx a priorizar este bloco para este domínio específico
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
INNEREOF

# 3. Reativar e testar
echo "[3/4] Reiniciando Nginx..."
sudo ln -sf /etc/nginx/sites-available/lovblack_final_v3 /etc/nginx/sites-enabled/lovblack_final_v3
sudo nginx -t && sudo systemctl restart nginx

# 4. Verificar se o PM2 está respondendo na porta 8080 com o conteúdo certo
echo "[4/4] Verificando aplicação..."
curl -s -H "Host: $DOMAIN" http://127.0.0.1:8080 | grep -i "lovablack" || echo "⚠️ Aviso: O conteúdo retornado pelo PM2 na porta 8080 parece não ser do projeto Lovablack. Verifique a pasta /var/www/lovblack.online"

echo "--- ✅ PROCESSO CONCLUÍDO ---"
echo "Agora rode: sudo certbot --nginx -d lovblack.online -d www.lovblack.online --force-renewal"
