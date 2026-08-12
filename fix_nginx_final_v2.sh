#!/bin/bash
DOMAIN="lovblack.online"

# 1. Identificar o processo que está ocupando a porta 80 e 443
echo "--- 🔍 IDENTIFICANDO CONFLITOS DE PORTA ---"
if command -v lsof >/dev/null; then
    sudo lsof -i :80
    sudo lsof -i :443
fi

# 2. Criar configuração Nginx com prioridade 'default_server' temporária para capturar o tráfego
# Isso garante que mesmo que outros arquivos existam, este será o preferencial se o Host bater
sudo cat > /etc/nginx/sites-available/lovblack_exclusivo_v2 <<INNEREOF
server {
    listen 80;
    listen [::]:80;
    server_name lovblack.online www.lovblack.online;

    # Forçar redirecionamento para HTTPS se houver certificado
    # Se não houver, o certbot cuidará disso depois
    
    location / {
        proxy_pass http://127.0.0.1:8080;
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

# 3. Limpar sites-enabled de QUALQUER coisa que não seja o projeto atual para este domínio
echo "--- 🧹 LIMPANDO LINKS SIMBÓLICOS ---"
sudo find /etc/nginx/sites-enabled/ -type l -exec grep -l "$DOMAIN" {} + | xargs -I{} sudo rm -v {}

# 4. Ativar a nova configuração
sudo ln -sf /etc/nginx/sites-available/lovblack_exclusivo_v2 /etc/nginx/sites-enabled/lovblack_exclusivo_v2

# 5. Reiniciar Nginx
echo "--- 🚀 REINICIANDO NGINX ---"
sudo nginx -t && sudo systemctl restart nginx

# 6. Garantir que o PM2 está rodando na porta correta
echo "--- 📦 REINICIANDO APLICAÇÃO ---"
pm2 delete lovablack 2>/dev/null
cd /var/www/lovblack.online && PORT=8080 pm2 start .output/server/index.mjs --name lovablack

echo -e "\n--- ✅ CONFIGURAÇÃO APLICADA ---"
echo "Se o problema persistir, rode: sudo certbot --nginx -d lovblack.online -d www.lovblack.online --force-renewal"
