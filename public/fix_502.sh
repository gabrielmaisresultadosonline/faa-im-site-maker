#!/bin/bash
DOMAIN="lovblack.online"
INSTALL_DIR="/root/lovablack_final"

echo "🛠️ Resolvendo 502 Bad Gateway (Porta 3000)..."

# 1. VERIFICAR SE O APP ESTÁ RODANDO NA PORTA 3000
# Às vezes o PM2 diz 'online' mas o Node travou ou está em outra porta.
cd "$INSTALL_DIR" || exit

# 2. FORÇAR A PORTA 3000 NO PM2
echo "🚀 Reiniciando aplicação forçando a porta 3000..."
pm2 delete lovablack 2>/dev/null
PORT=3000 pm2 start npm --name "lovablack" -- start

# 3. AGUARDAR INICIALIZAÇÃO E TESTAR LOCALMENTE
echo "⏳ Aguardando 10 segundos para o servidor subir..."
sleep 10

if curl -s http://127.0.0.1:3000 > /dev/null; then
    echo "✅ Aplicação respondendo internamente na porta 3000!"
else
    echo "❌ Aplicação AINDA NÃO responde na porta 3000. Tentando rebuild..."
    npm run build
    PORT=3000 pm2 restart lovablack
    sleep 5
fi

# 4. RECARREGAR NGINX
echo "🔄 Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ [FIM] Tente acessar agora: https://$DOMAIN"
pm2 status
