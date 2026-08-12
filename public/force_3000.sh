#!/bin/bash
DOMAIN="lovblack.online"
INSTALL_DIR="/root/lovablack_final"

echo "🚨 [FORÇA TOTAL] Corrigindo 502 Bad Gateway e Porta..."

cd "$INSTALL_DIR" || exit

# 1. PARAR TUDO QUE PODE ESTAR USANDO A PORTA 3000
echo "🧹 Liberando a porta 3000..."
pm2 delete lovablack 2>/dev/null
sudo fuser -k 3000/tcp 2>/dev/null

# 2. CONFIGURAR O START PARA USAR A PORTA 3000 EXPLICITAMENTE
# Criando um arquivo ecossistema para garantir a porta
cat << 'ECO' > ecosystem.config.cjs
module.exports = {
  apps : [{
    name: 'lovablack',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    }
  }]
}
ECO

# 3. INICIAR VIA ECOSSISTEMA
echo "🚀 Iniciando via PM2 Ecosystem (Porta 3000)..."
pm2 start ecosystem.config.cjs
pm2 save

# 4. VERIFICAÇÃO DE SAÚDE
echo "⏳ Aguardando subida do servidor..."
sleep 8

if curl -sI http://127.0.0.1:3000 | grep -q "HTTP/1.1 200\|HTTP/1.1 30"; then
    echo "✅ SUCESSO: O servidor está respondendo na porta 3000!"
else
    echo "⚠️ O servidor não respondeu na 3000. Tentando rodar o build novamente..."
    npm run build
    pm2 restart lovablack
    sleep 5
fi

# 5. REINICIAR NGINX
sudo systemctl restart nginx

echo "✅ [FINALIZADO] Verifique agora: https://$DOMAIN"
pm2 status
