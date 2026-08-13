#!/bin/bash

# ==============================================================================
# LOVBLACK ULTRA UPDATER V5 - MASTER RECOVERY & SYNC
# ==============================================================================
# Este script força a atualização completa do GitHub e restaura o ambiente VPS.
# ==============================================================================

set -e

# Configurações
INSTALL_DIR="/var/www/lovablack_final"
PM2_NAME="lovblack_master"
GIT_REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"

echo "🚀 Iniciando Atualização Mestra V5..."

# 1. Garantir que o diretório existe e está limpo
if [ ! -d "$INSTALL_DIR" ]; then
    echo "📁 Criando diretório de instalação..."
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    git clone "$GIT_REPO" .
else
    cd "$INSTALL_DIR"
    echo "🧹 Limpando alterações locais e sincronizando com GitHub..."
    git remote set-url origin "$GIT_REPO" || git remote add origin "$GIT_REPO"
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
fi

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
    source "$HOME/.bashrc"
fi

bun install

# 4. Build do Servidor
echo "🏗️ Compilando projeto (Build)..."
rm -rf .output
bun run build

# 5. Validação de Segurança
echo "🔍 Validando Preset do Build..."
if [ -f ".output/nitro.json" ]; then
    PRESET=$(node -e "console.log(require('./.output/nitro.json').preset)")
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
echo "  TUDO PRONTO! Se o /admin não abrir, verifique seu Nginx (proxy para 8098)."
echo "=============================================================================="
