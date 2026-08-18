#!/bin/bash
# Script de deploy seguro e isolado para lovblack.online no VPS Hostinger
# Versão: 18/08/2026 - Correção 502/SSR

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
# Garante que as dependências de build estejam presentes
npm install

echo "========== 3. CONFIGURANDO VPS (Vite/Nitro) =========="
# Criando arquivo de config robusto para VPS
cat <<EOF > vite.config.vps.ts
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
  vite: {
    ssr: {
      noExternal: true,
    }
  }
});
EOF

echo "========== 4. BUILD DO PROJETO =========="
# Remove build anterior para evitar cache sujo
rm -rf .output .vinxi
# O build gera a pasta .output/ com o servidor Nitro
npx vite build --config vite.config.vps.ts

echo "========== 5. REINICIANDO PROCESSO ISOLADO (PM2) =========="
# Garante que o PM2 enxergue o node correto e limpe ambiente anterior
pm2 delete $PM2_NAME || true

# Inicia o processo lendo o .env local
# Usamos --env explicitamente e garantimos que o diretório de trabalho está correto
pm2 start .output/server/index.mjs --name $PM2_NAME --node-args="--enable-source-maps" --env PORT=$PORT --update-env

# Espera um pouco e injeta as variáveis do .env no PM2
if [ -f .env ]; then
    echo "Injetando variáveis do .env no processo PM2..."
    while read -r line || [ -n "$line" ]; do
        if [[ ! $line =~ ^# ]] && [[ $line == *"="* ]]; then
            key=$(echo $line | cut -d '=' -f 1)
            value=$(echo $line | cut -d '=' -f 2- | sed 's/^"//;s/"$//')
            pm2 set $PM2_NAME:$key "$value"
        fi
    done < .env
    pm2 restart $PM2_NAME --update-env
fi

pm2 save

echo "========== 6. VERIFICANDO STATUS E SAÚDE =========="
sleep 5
pm2 status $PM2_NAME

# Teste local para garantir que o Nitro subiu
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/ || echo "Failed")
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "302" ]; then
    echo "✅ Deploy concluído com sucesso! Site respondendo na porta $PORT."
else
    echo "⚠️ Alerta: O servidor subiu mas retornou status $RESPONSE."
    echo "Dica: Verifique os logs com 'pm2 logs $PM2_NAME'"
fi

echo "🚀 Deploy isolado finalizado."
