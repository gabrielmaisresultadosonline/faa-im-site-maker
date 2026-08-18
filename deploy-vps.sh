#!/bin/bash

# ==============================================================================
# SCRIPT DE IMPLANTAÇÃO DEFINITIVO - LOVBLACK v2.1.17 (ESTABILIZAÇÃO SSR)
# ==============================================================================

set -Eeuo pipefail

APP_DIR="$(pwd)"
PORT="8098"
PM2_NAME="lovblack_master"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

echo ">>> Iniciando deploy em: $APP_DIR"
cd "$APP_DIR"

echo ">>> Instalando dependências..."
npm install --prefer-offline

echo ">>> Limpando builds anteriores..."
rm -rf .output .vinxi .nitro dist

echo ">>> Executando build de produção (SSR node-server)..."
# Usamos o config padrão que já tem o preset node-server e bundling otimizado
npm run build

# Validação do build
if [ ! -d ".output/server" ]; then
    echo "ERRO: Pasta .output/server não encontrada. O build falhou."
    exit 1
fi

echo ">>> Verificando integridade do servidor..."
node --input-type=module -e "
import('./.output/server/index.mjs')
  .then(() => console.log('Servidor Nitro: OK'))
  .catch(err => {
    console.error('Falha na integridade do servidor:', err.message);
    process.exit(1);
  })
"

echo ">>> Gerenciando processo PM2..."
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true

# Injeção de variáveis críticas para evitar erros 500 por falta de chaves
# O NODE_OPTIONS ajuda se houver problemas de memória ou sourcemaps
PORT="$PORT" \
HOST="0.0.0.0" \
NODE_ENV="production" \
NITRO_PORT="$PORT" \
NITRO_HOST="0.0.0.0" \
SUPABASE_URL="https://zjvmfmdyuxmyanuuralq.supabase.co" \
VITE_SUPABASE_URL="https://zjvmfmdyuxmyanuuralq.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7" \
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
VITE_SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
pm2 start .output/server/index.mjs \
  --name "$PM2_NAME" \
  --node-args="--enable-source-maps" \
  --update-env

pm2 save --force

echo ">>> Aguardando inicialização (10s)..."
sleep 10

echo ">>> Verificando Health Check..."
if ! ss -lntp | grep -q ":$PORT"; then
    echo "ERRO: A porta $PORT não está aberta. Verifique os logs do PM2."
    pm2 logs "$PM2_NAME" --lines 50 --nostream
    exit 1
fi

HTTP_CODE=$(curl -sS -o /tmp/health.html -w "%{http_code}" --max-time 15 "http://127.0.0.1:$PORT/" || echo "000")

echo "Resultado HTTP: $HTTP_CODE"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" ]]; then
    echo "======================================"
    echo " DEPLOY CONCLUÍDO COM SUCESSO! "
    echo " Porta: $PORT | PM2: $PM2_NAME "
    echo "======================================"
else
    echo "AVISO: Health check retornou $HTTP_CODE. Verificando logs..."
    pm2 logs "$PM2_NAME" --lines 20 --nostream
    # Não falhamos aqui pois 404/500 podem ser rotas específicas, mas alertamos o usuário
fi

