#!/bin/bash
# Script de deploy robusto e isolado para lovblack.online no VPS Hostinger
# Versão: 18/08/2026 - Correção de Build, Porta e SSR-Integridade v5

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
# Usamos --prefer-offline para velocidade e npm ci para integridade
npm ci || npm install --prefer-offline

echo "========== 3. CONFIGURANDO VPS (Vite/Nitro) =========="
# Refinamento da configuração para evitar TypeError: Cannot destructure property '__extends'
cat <<'EOF' > vite.config.vps.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "node-server",
    inlineDynamicImports: true,
    // Garantir que o bundling não quebre referências de herança CJS/ESM
    esbuild: {
      options: {
        target: 'node20',
        format: 'esm'
      }
    }
  },
  tanstackStart: {
    server: {
      entry: "src/server.ts",
    },
  },
  vite: {
    ssr: {
      noExternal: true, // Bundling total para evitar erros de resolução no Node do VPS
      external: ['url', 'path', 'fs', 'crypto', 'stream', 'buffer', 'util', 'events', 'http', 'https', 'zlib', 'os'],
    },
    build: {
      chunkSizeWarningLimit: 2000,
      minify: false, // Desativar minificação temporariamente para logs de erro legíveis
      ssr: true,
      rollupOptions: {
        output: {
          format: 'esm'
        }
      }
    }
  }
});
EOF

echo "========== 4. LIMPEZA PROFUNDA E BUILD =========="
# Removemos caches que podem causar o erro de destructuring inválido
rm -rf .output .vinxi node_modules/.vite
npx vite build --config vite.config.vps.ts

echo "========== 5. REINICIANDO PROCESSO COM INJEÇÃO DE PORTA =========="
pm2 delete $PM2_NAME || true

# Injeção manual de variáveis para garantir prioridade sobre defaults do Nitro
# O PM2 às vezes falha com --env se não estiver bem formatado, então construímos a string
ENV_CMD=""
if [ -f .env ]; then
    echo "Injetando variáveis do arquivo .env..."
    # Filtramos comentários e linhas vazias
    while read -r line || [ -n "$line" ]; do
        [[ $line =~ ^#.* ]] && continue
        [[ -z "$line" ]] && continue
        ENV_CMD="$ENV_CMD --env \"$line\""
    done < .env
fi

# Comando PM2 com override de porta explícito e bind universal
# A porta 8098 é CRÍTICA para o Nginx
pm2 start .output/server/index.mjs --name $PM2_NAME \
    --node-args="--enable-source-maps" \
    --env PORT=$PORT \
    --env NITROPACK_PORT=$PORT \
    --env HOST=0.0.0.0 \
    --env NITROPACK_HOST=0.0.0.0 \
    --env NODE_ENV=production \
    --env VITE_SSR=true \
    $ENV_CMD

pm2 save --force

echo "========== 6. VERIFICANDO STATUS E SAÚDE NA PORTA $PORT =========="
sleep 12 # Aumentado para dar tempo ao SSR boot
pm2 status $PM2_NAME

# Teste de conectividade local com timeout generoso
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/ --max-time 20 || echo "Failed")

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "302" ] || [ "$RESPONSE" == "404" ]; then
    echo "✅ SUCESSO! A aplicação está ativa e respondendo na porta $PORT."
else
    echo "⚠️ FALHA: A aplicação não respondeu na porta $PORT (Status: $RESPONSE)."
    echo "Dica: Se status for 000 ou 500, o erro 'Cannot destructure property' pode persistir."
    echo "=== LOGS DO PM2 (Últimas 50 linhas) ==="
    pm2 logs $PM2_NAME --lines 50 --no-colors --err --out | tail -n 50
fi

echo "🚀 Processo de deploy para $DOMAIN finalizado."

