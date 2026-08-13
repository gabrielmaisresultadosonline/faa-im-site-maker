#!/bin/bash
# ==============================================================================
# LOVBLACK ULTRA UPDATER V7 - THE INVICTUS RECOVERY
# ==============================================================================
set -e
SCRIPT_PATH=$(readlink -f "$0")
PUBLIC_DIR=$(dirname $(dirname "$SCRIPT_PATH"))
INSTALL_DIR=$(dirname "$PUBLIC_DIR")
PM2_NAME="lovblack_master"
GIT_REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"
echo "🚀 Iniciando Atualização Invictus V7..."
cd "$INSTALL_DIR"
git config --global --add safe.directory "$INSTALL_DIR" || true
rm -f .git/index.lock
git remote set-url origin "$GIT_REPO" || git remote add origin "$GIT_REPO"
git fetch --all
git reset --hard origin/main
git clean -fd -e public/atualizar.sh
cat > vite.config.ts <<'CONFIG'
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  nitro: { preset: "node-server" },
  tanstackStart: { server: { entry: "server" } },
});
CONFIG
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi
bun install
bun run build
mkdir -p .output/public
cp -r public/* .output/public/ 2>/dev/null || true
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 delete "lovblack_v19" 2>/dev/null || true
PORT=8098 HOST=0.0.0.0 pm2 start .output/server/index.mjs --name "$PM2_NAME" --cwd "$INSTALL_DIR" --interpreter node
pm2 save
echo "=========================================="
echo "      LOVBLACK ATUALIZADO COM SUCESSO"
echo "=========================================="
