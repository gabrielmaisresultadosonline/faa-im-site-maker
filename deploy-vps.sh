#!/bin/bash
# Script de deploy seguro e isolado para lovblack.online no VPS Hostinger
# Versão: 18/08/2026

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
# Usando npm para consistência com o ambiente Node instalado
npm install --production=false

echo "========== 3. CONFIGURANDO VPS (Vite/Nitro) =========="
# Criando arquivo de config se não existir
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
# O build gera a pasta .output/ com o servidor Nitro
npx vite build --config vite.config.vps.ts

echo "========== 5. REINICIANDO PROCESSO ISOLADO (PM2) =========="
# Carrega as variáveis de ambiente do .env para o processo PM2
# O uso de --update-env garante que as novas variáveis de fallback da extensão sejam carregadas
set -a && source .env && set +a

# Verifica se o processo já existe
if pm2 show $PM2_NAME > /dev/null; then
    HOST=127.0.0.1 PORT=$PORT pm2 restart $PM2_NAME --update-env
else
    HOST=127.0.0.1 PORT=$PORT pm2 start .output/server/index.mjs --name $PM2_NAME --env PORT=$PORT
fi

pm2 save

echo "========== 6. VERIFICANDO STATUS E SAÚDE =========="
sleep 5
pm2 status $PM2_NAME

# Teste local para garantir que o Nitro subiu na porta correta
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/ || echo "Failed")
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "302" ]; then
    echo "✅ Deploy concluído com sucesso! Site respondendo na porta $PORT."
else
    echo "⚠️ Alerta: O servidor subiu mas retornou status $RESPONSE. Verifique 'pm2 logs $PM2_NAME'."
fi

echo "🚀 Deploy isolado finalizado. Outros sites no VPS não foram afetados."
