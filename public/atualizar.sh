#!/bin/bash

# ==============================================================================
# LOVBLACK ULTRA UPDATER V6 - AUTO-PATH RECOVERY
# ==============================================================================
# Este script detecta automaticamente o diretório de instalação e corrige o path.
# ==============================================================================

set -e

# Detectar onde o script está sendo executado
SCRIPT_PATH=$(readlink -f "$0")
PUBLIC_DIR=$(dirname "$SCRIPT_PATH")
CURRENT_INSTALL_DIR=$(dirname "$PUBLIC_DIR")

# Configurações
INSTALL_DIR="$CURRENT_INSTALL_DIR"
PM2_NAME="lovblack_master"
GIT_REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"

echo "🚀 Iniciando Atualização Mestra V6..."
echo "📍 Diretório Detectado: $INSTALL_DIR"

cd "$INSTALL_DIR"

# 1. Sincronização com GitHub
echo "🧹 Limpando alterações locais e sincronizando com GitHub..."
git remote set-url origin "$GIT_REPO" || git remote add origin "$GIT_REPO"
git fetch origin main
git reset --hard origin/main
git clean -fd

# 2. Restaurar configuração vital do Vite (Node Server)
echo "🛠️ Restaurando vite.config.ts para modo VPS..."
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

# 3. Preparar ambiente Bun
echo "📦 Instalando dependências..."
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    echo "⚠️ Bun não encontrado. Instalando..."
    curl -fsSL https://bun.sh/install | bash
    source "$HOME/.bashrc" || true
fi

bun install

# 4. Build do Servidor
echo "🏗️ Compilando projeto (Build)..."
rm -rf .output
bun run build

# 5. Validação de Segurança
echo "🔍 Validando Preset do Build..."
if [ -f ".output/nitro.json" ]; then
    PRESET=$(node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('.output/nitro.json', 'utf8')); console.log(data.preset);")
    echo "Preset: $PRESET"
    if [ "$PRESET" != "node-server" ]; then
        echo "❌ ERRO: Build gerado como '$PRESET'. Precisa ser 'node-server'."
        exit 1
    fi
else
    echo "❌ ERRO: Arquivo .output/nitro.json não encontrado."
    exit 1
fi

# 6. Gestão de Assets (Imagens/Documentos)
echo "🖼️ Sincronizando Assets..."
mkdir -p .output/public
cp -r public/* .output/public/ 2>/dev/null || true

# 7. Reinicialização PM2
echo "♻️ Reiniciando processo PM2..."
pm2 delete "$PM2_NAME" 2>/dev/null || true
PORT=8098 HOST=127.0.0.1 pm2 start .output/server/index.mjs \
    --name "$PM2_NAME" \
    --cwd "$INSTALL_DIR" \
    --interpreter node

pm2 save

# 8. Teste de Vida
echo "🌐 Verificando se o site está online..."
sleep 5
if curl -fsS --max-time 10 http://127.0.0.1:8098/ >/dev/null; then
    echo "✅ SUCESSO! Site atualizado e rodando na porta 8098."
else
    echo "❌ FALHA: O site não respondeu na porta 8098 após o build."
    pm2 logs "$PM2_NAME" --lines 50 --nostream
    exit 1
fi

echo "=============================================================================="
echo "  TUDO PRONTO! O script agora é auto-localizável."
echo "  Use sempre: bash public/atualizar.sh dentro da pasta do projeto."
echo "=============================================================================="
