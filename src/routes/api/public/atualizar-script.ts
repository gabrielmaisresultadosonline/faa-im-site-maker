import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/atualizar-script')({
  server: {
    handlers: {
      GET: async () => {
        const script = `#!/bin/bash
# ==============================================================================
# LOVBLACK ULTRA UPDATER V7 - THE INVICTUS RECOVERY
# ==============================================================================
set -e

# Detectar onde o script está sendo executado
SCRIPT_PATH=$(readlink -f "$0")
PUBLIC_DIR=$(dirname "$SCRIPT_PATH")
INSTALL_DIR=$(dirname "$PUBLIC_DIR")

# Configurações
PM2_NAME="lovblack_master"
GIT_REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"

echo "🚀 Iniciando Atualização Invictus V7..."
echo "📍 Diretório Detectado: $INSTALL_DIR"

cd "$INSTALL_DIR"

# 1. Recuperação do Git
echo "🧹 Reparando Git e Sincronizando..."
git config --global --add safe.directory "$INSTALL_DIR" || true
rm -f .git/index.lock

git remote set-url origin "$GIT_REPO" || git remote add origin "$GIT_REPO"
git fetch --all
git reset --hard origin/main
git clean -fd -e public/atualizar.sh

# 2. Restaurar configuração vital do Vite (Node Server)
echo "🛠️ Garantindo vite.config.ts para modo VPS..."
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
echo "📦 Verificando Bun e Instalando Dependências..."
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    echo "⚠️ Bun não encontrado. Instalando..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

bun install

# 4. Build do Servidor
echo "🏗️ Compilando projeto (Build)..."
rm -rf .output
bun run build

# 5. Validação de Segurança
echo "🔍 Validando Build..."
if [ ! -f ".output/nitro.json" ]; then
    echo "❌ ERRO: Build falhou. .output/nitro.json não existe."
    exit 1
fi

# 6. Sincronização de Assets
echo "🖼️ Sincronizando Assets para Produção..."
mkdir -p .output/public
cp -r public/* .output/public/ 2>/dev/null || true

# 7. Reinicialização PM2
echo "♻️ Reiniciando processo PM2..."
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 delete "lovblack_v19" 2>/dev/null || true

PORT=8098 HOST=0.0.0.0 pm2 start .output/server/index.mjs \\
    --name "$PM2_NAME" \\
    --cwd "$INSTALL_DIR" \\
    --interpreter node

pm2 save

# 8. Teste de Vida
echo "🌐 Verificando porta 8098..."
sleep 5
if curl -fsS --max-time 10 http://127.0.0.1:8098/ >/dev/null; then
    echo "=========================================="
    echo "      LOVBLACK ATUALIZADO COM SUCESSO"
    echo "=========================================="
    echo "Preset: node-server"
    echo "Porta: 8098"
    echo "PM2: $PM2_NAME"
    echo "Status: ONLINE"
    echo "=========================================="
else
    echo "❌ FALHA: O site não subiu na porta 8098."
    pm2 logs "$PM2_NAME" --lines 20 --nostream
    exit 1
fi`;

        return new Response(script, {
          headers: {
            'Content-Type': 'text/x-shellscript',
            'Content-Disposition': 'attachment; filename="atualizar.sh"',
          },
        });
      },
    },
  },
});
