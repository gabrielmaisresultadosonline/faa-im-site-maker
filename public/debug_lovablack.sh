#!/bin/bash
DOMAIN="lovblack.online"
INSTALL_DIR="/root/lovablack_final"

echo "🧪 [DIAGNÓSTICO] Investigando erro no Lovablack..."

cd "$INSTALL_DIR" || exit

# 1. VERIFICAR LOGS DO PM2 PARA ENTENDER O ERRO
echo "📝 Últimas 20 linhas de log do Lovablack:"
pm2 logs lovablack --lines 20 --no-colors --err | tail -n 20

# 2. TENTAR RODAR MANUALMENTE PARA VER O ERRO REAL
echo "▶️ Tentando rodar manualmente na porta 3000..."
PORT=3000 npm start &
PID=$!
sleep 5

if ps -p $PID > /dev/null; then
    echo "✅ O servidor rodou manualmente! O problema é no PM2."
    kill $PID
else
    echo "❌ O servidor falhou ao iniciar manualmente também."
    echo "🔨 Tentando reconstruir do absoluto zero..."
    rm -rf .output .nitro .wrangler node_modules package-lock.json
    npm install
    npm run build
fi

# 3. REINICIAR PM2 COM CONFIGURAÇÃO LIMPA
echo "🚀 Reiniciando PM2..."
pm2 delete lovablack 2>/dev/null
PORT=3000 pm2 start npm --name "lovablack" -- start
pm2 save

echo "✅ Verifique o status abaixo:"
pm2 status
