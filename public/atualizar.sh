#!/bin/bash

set -e

INSTALL_DIR="/var/www/lovablack_final"
PM2_NAME="lovblack_master"

echo "=========================================="
echo "      LOVBLACK ULTRA UPDATER V4"
echo "=========================================="

echo "--- DIRETÓRIO ---"
echo "$INSTALL_DIR"

cd "$INSTALL_DIR"

echo "--- ATUALIZANDO GIT ---"
git reset --hard
git pull origin main

echo "--- RESTAURANDO CONFIGURAÇÃO VPS ---"

cat > vite.config.ts <<'CONFIG'
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
});
CONFIG

echo "--- BUN ---"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

bun install

echo "--- BUILD NODE SERVER ---"

rm -rf .output

bun run build

echo "--- VALIDANDO BUILD ---"

PRESET=$(node -e "console.log(require('./.output/nitro.json').preset)")

echo "Preset detectado: $PRESET"

if [ "$PRESET" != "node-server" ]; then
    echo "ERRO: build não é node-server!"
    echo "Build cancelado para não derrubar o site."
    exit 1
fi

echo "--- COPIANDO PUBLIC ---"

mkdir -p .output/public
cp -r public/* .output/public/ 2>/dev/null || true

echo "--- REINICIANDO LOVBLACK ---"

pm2 delete "$PM2_NAME" 2>/dev/null || true

PORT=8098 HOST=127.0.0.1 pm2 start .output/server/index.mjs \
    --name "$PM2_NAME" \
    --cwd "$INSTALL_DIR" \
    --interpreter node

pm2 save

echo "--- TESTANDO PORTA 8098 ---"

sleep 3

if ! curl -fsS --max-time 10 http://127.0.0.1:8098/ >/dev/null; then
    echo "ERRO: LovBlack não respondeu na porta 8098."
    pm2 logs "$PM2_NAME" --lines 50 --nostream
    exit 1
fi

echo
echo "=========================================="
echo "      LOVBLACK ATUALIZADO COM SUCESSO"
echo "=========================================="
echo "Preset: node-server"
echo "Porta: 8098"
echo "PM2: $PM2_NAME"
echo "Status: OK"
echo "=========================================="
