import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/atualizar-script')({
  server: {
    handlers: {
      GET: async () => {
        const script = `#!/bin/bash
# ==============================================================================
# LOVBLACK MASTER UPDATER V12 - REACT ERROR #310 HOTFIX
# ==============================================================================
set -e

# Detectar onde o script está sendo executado
SCRIPT_PATH=$(readlink -f "$0")
PUBLIC_DIR=$(dirname "$SCRIPT_PATH")
INSTALL_DIR=$(dirname "$PUBLIC_DIR")

# Configurações
PM2_NAME="lovblack_master"
GIT_REPO="https://github.com/gabrielmaisresultadosonline/faa-im-site-maker.git"

echo "🚀 Iniciando Atualizador Mestre V12 (React #310 Fix)..."
echo "📍 Pasta: $INSTALL_DIR"

cd "$INSTALL_DIR"

# 1. Recuperação e Sincronização do Git
echo "🧹 Sincronizando com GitHub..."
git config --global --add safe.directory "$INSTALL_DIR" || true
rm -f .git/index.lock

git remote set-url origin "$GIT_REPO" || git remote add origin "$GIT_REPO"

git fetch --all
git reset --hard origin/main
git clean -fd -e public/atualizar.sh -e .env

# 2. Configuração do Servidor (Node)
echo "🛠️ Aplicando Preset VPS..."
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

# 3. Ambiente Bun
echo "📦 Instalando dependências..."
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

bun install

# 4. Build de Produção
echo "🏗️ Criando Build (Deep Cache Clean contra Erro React #310)..."
# Limpeza agressiva para garantir que nenhum artefato antigo cause erro de hidratação ou hooks
rm -rf .output .vite .nitro .tanstack dist
rm -rf node_modules/.cache
# Garantir que as dependências estejam frescas
bun install --frozen-lockfile
bun run build

# 5. Sincronização de Imagens/Assets
echo "🖼️ Sincronizando Imagens para o Site..."
mkdir -p .output/public
cp -r public/* .output/public/ 2>/dev/null || true

# 6. Gestão do Processo PM2
echo "♻️ Reiniciando no PM2..."
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 delete "lovblack_v19" 2>/dev/null || true

PORT=8098 HOST=0.0.0.0 pm2 start .output/server/index.mjs \\
    --name "$PM2_NAME" \\
    --cwd "$INSTALL_DIR" \\
    --interpreter node

pm2 save

# 7. Verificação Final
echo "🌐 Verificando Status..."
sleep 5
if curl -fsS --max-time 10 http://127.0.0.1:8098/ >/dev/null; then
    echo "=================================================="
    echo "     ✅ ATUALIZADO COM SUCESSO - V12 MASTER"
    echo "=================================================="
else
    echo "❌ FALHA NA INICIALIZAÇÃO"
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