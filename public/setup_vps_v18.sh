#!/bin/bash

# --- CONFIGURAÇÃO ---
DOMAIN="lovblack.online"
APP_DIR="/var/www/lovablack_final"
PORT="8085"
GITHUB_REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"

echo "🚀 INICIANDO DEPLOY ISOLADO V18 (Surgical Port Strategy)"

# 1. Limpeza de conflitos anteriores
echo "🧹 Removendo instalações anteriores e limpando portas..."
pm2 stop lovblack_master 2>/dev/null || true
pm2 delete lovblack_master 2>/dev/null || true
sudo rm -rf $APP_DIR

# 2. Expulsar domínio de outros arquivos Nginx
echo "🔍 Removendo menções de $DOMAIN em outros sites Nginx..."
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ]; then
        if grep -q "$DOMAIN" "$file"; then
            echo "⚠️ Removendo conflito em $file"
            sudo sed -i "/$DOMAIN/d" "$file"
        fi
    fi
done

# 3. Criar diretório e clonar
echo "📥 Clonando repositório..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
git clone $GITHUB_REPO $APP_DIR

# Entrar na pasta
cd $APP_DIR

# Ajustar estrutura se houver subpasta
if [ -d "awesome-website-creator" ]; then
    mv awesome-website-creator/* .
    mv awesome-website-creator/.* . 2>/dev/null
    rmdir awesome-website-creator
fi

# 4. Instalar Bun se não existir
if ! command -v bun &> /dev/null; then
    echo "⚡ Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    source /root/.bashrc
    export PATH="/root/.bun/bin:$PATH"
fi

# 5. Build do Projeto
echo "🏗️ Instalando dependências e gerando build..."
bun install
bun run build

# 6. Configuração Nginx (Porta Isolada 8085)
echo "🌐 Configurando Nginx prioritário..."
sudo rm -f /etc/nginx/sites-enabled/000-lovblack*
sudo rm -f /etc/nginx/sites-available/000-lovblack*

cat << NGX | sudo tee /etc/nginx/sites-available/000-lovblack-priority
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Desativa HTTP2 explicitamente para evitar o erro de protocolo
        http2 off;
    }
}
NGX

sudo ln -s /etc/nginx/sites-available/000-lovblack-priority /etc/nginx/sites-enabled/000-lovblack-priority

# 7. Iniciar no PM2
echo "🏃 Iniciando aplicação na porta $PORT..."
PORT=$PORT pm2 start bun --name "lovblack_master" -- run dev -- --port $PORT

# 8. Reiniciar Nginx
sudo nginx -t && sudo systemctl restart nginx

echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "Acesse: http://$DOMAIN"
echo "Nota: O Nginx agora aponta para a porta interna $PORT e o HTTP2 está desativado."
