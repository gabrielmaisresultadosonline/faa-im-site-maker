#!/bin/bash
# Script de deploy seguro e isolado para lovblack.online no VPS Hostinger
# Versão: 18/08/2026 - Correção CRÍTICA 502/Porta/Environment

set -e

# Configurações do ambiente
APP_DIR="/var/www/lovablack_final"
DOMAIN="lovblack.online"
PORT=8098
PM2_NAME="lovblack_master"

echo "========== 1. ATUALIZANDO GITHUB =========="
cd $APP_DIR
git fetch origin
git reset --hard origin/main

echo "========== 2. INSTALANDO DEPENDÊNCIAS =========="
# Usamos clean-install para garantir integridade
npm ci || npm install

echo "========== 3. CONFIGURANDO VPS (Vite/Nitro) =========="
# Criando arquivo de config robusto para VPS
cat <<EOF > vite.config.vps.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
  vite: {
    ssr: {
      noExternal: true,
    },
    build: {
      chunkSizeWarningLimit: 2000,
    }
  }
});
EOF

echo "========== 4. BUILD DO PROJETO =========="
rm -rf .output .vinxi
npx vite build --config vite.config.vps.ts

echo "========== 5. REINICIANDO PROCESSO ISOLADO (PM2) =========="
# Paramos e deletamos para garantir limpeza total de portas e memória
pm2 delete $PM2_NAME || true

# Inicia o processo definindo a porta via variável de ambiente do processo PM2
# O Nitro/H3 respeita a variável PORT
pm2 start .output/server/index.mjs --name $PM2_NAME --node-args="--enable-source-maps" --env PORT=$PORT

# Injeção agressiva de variáveis do .env no PM2
if [ -f .env ]; then
    echo "Injetando variáveis do .env no processo PM2..."
    while read -r line || [ -n "$line" ]; do
        if [[ ! $line =~ ^# ]] && [[ $line == *"="* ]]; then
            key=$(echo $line | cut -d '=' -f 1)
            value=$(echo $line | cut -d '=' -f 2- | sed 's/^"//;s/"$//')
            # Setamos no ecossistema do PM2 para o processo
            pm2 set $PM2_NAME:$key "$value"
        fi
    done < .env
    
    # Reinicia com as novas variáveis aplicadas e garante a porta novamente
    pm2 restart $PM2_NAME --update-env --env PORT=$PORT
fi

pm2 save

echo "========== 6. VERIFICANDO STATUS E SAÚDE =========="
sleep 5
pm2 status $PM2_NAME

# Teste local na porta correta
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/ || echo "Failed")

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "302" ] || [ "$RESPONSE" == "404" ]; then
    echo "✅ Deploy concluído com sucesso! Site respondendo na porta $PORT."
else
    echo "⚠️ Erro: O servidor não está respondendo na porta $PORT (Status: $RESPONSE)."
    echo "Logs recentes:"
    pm2 logs $PM2_NAME --lines 20 --no-colors
    exit 1
fi

echo "🚀 Deploy isolado finalizado para $DOMAIN."
