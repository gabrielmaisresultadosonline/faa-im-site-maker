#!/bin/bash
# Lovablack Ultra Updater V3 (Correção de Path e Imagens)
# Este script detecta automaticamente se a pasta é lovablack_master ou lovablack_final

echo "--- INICIANDO ATUALIZAÇÃO INTELIGENTE (V3) ---"

# Detecta a pasta atual ou as pastas possíveis
if [ -d "/var/www/lovablack_final" ]; then
    INSTALL_DIR="/var/www/lovablack_final"
elif [ -d "/var/www/lovablack_master" ]; then
    INSTALL_DIR="/var/www/lovablack_master"
else
    # Se rodar dentro da pasta, usa a atual
    INSTALL_DIR=$(pwd)
fi

echo "Pasta de instalação detectada: $INSTALL_DIR"
cd $INSTALL_DIR

# Tenta detectar o nome do processo PM2 (lovblack_master ou lovablack)
PM2_NAME=$(pm2 list | grep -E "lovblack_master|lovablack" | awk '{print $4}' | head -n 1)
if [ -z "$PM2_NAME" ]; then
    PM2_NAME="lovblack_master"
fi
echo "Processo PM2 detectado: $PM2_NAME"

echo "Puxando novos arquivos do GitHub..."
git reset --hard
git pull origin main

# Garante que o Bun está no PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    echo "Bun não encontrado, tentando carregar perfil..."
    [ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc"
    [ -s "$HOME/.profile" ] && source "$HOME/.profile"
fi

echo "Instalando dependências e gerando build..."
bun install
bun run build

# CORREÇÃO CRÍTICA: Sincronização de Assets para o diretório de saída do TanStack Start
echo "Sincronizando logos e imagens estáticas para .output/public..."
mkdir -p .output/public
cp -r public/* .output/public/ 2>/dev/null || true

# Reinicia o processo
echo "Reiniciando aplicação no PM2 ($PM2_NAME)..."
pm2 restart $PM2_NAME --update-env || pm2 start bun --name "$PM2_NAME" -- run start

echo "--- ATUALIZAÇÃO CONCLUÍDA COM SUCESSO! ---"
