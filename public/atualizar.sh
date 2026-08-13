#!/bin/bash
# Lovablack Updater V1
# Este script entra na pasta, puxa as novidades do GitHub, instala e reinicia.

INSTALL_DIR="/var/www/lovablack_master"
PM2_NAME="lovblack_master"

echo "--- INICIANDO ATUALIZAÇÃO ---"

# 1. Entrar na pasta
if [ -d "$INSTALL_DIR" ]; then
    cd $INSTALL_DIR
    echo "Pasta encontrada: $INSTALL_DIR"
else
    echo "ERRO: Pasta de instalação não encontrada em $INSTALL_DIR"
    exit 1
fi

# 2. Puxar novidades do GitHub
echo "Buscando novos arquivos no GitHub..."
git reset --hard # Garante que não haja conflitos com arquivos locais
git pull origin main

# 3. Instalar novas dependências e fazer Build
echo "Atualizando dependências e gerando novo build..."
# Garante que o Bun está no PATH caso o script rode via cron ou shell limitado
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

bun install
bun run build

# 4. Forçar cópia de assets estáticos (Garante que logos apareçam)
echo "Sincronizando imagens e logos..."
cp -r public/* .output/public/ 2>/dev/null || true

# 5. Reiniciar o processo no PM2

echo "Reiniciando aplicação..."
pm2 restart $PM2_NAME --update-env

echo "--- ATUALIZAÇÃO CONCLUÍDA COM SUCESSO! ---"
