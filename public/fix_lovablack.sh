#!/bin/bash
DOMAIN="lovblack.online"
INSTALL_DIR="/root/lovablack_final"

echo "🔧 Corrigindo Lovablack (Erro 'errored')..."

# 1. ENTRAR NA PASTA CORRETA
cd "$INSTALL_DIR" || { echo "❌ Pasta $INSTALL_DIR não encontrada!"; exit 1; }

# 2. LIMPAR CACHE E REINSTALAR DEPENDÊNCIAS (Pode ser causa do erro)
echo "🧹 Limpando node_modules e reinstalando..."
rm -rf node_modules
npm install
npm run build

# 3. REINICIAR PROCESSO NO PM2
echo "🚀 Reiniciando processo no PM2..."
pm2 delete lovablack 2>/dev/null
pm2 start npm --name "lovablack" -- start

# 4. SALVAR E MOSTRAR STATUS
pm2 save
echo "✅ Lovablack deve estar online agora!"
pm2 status
