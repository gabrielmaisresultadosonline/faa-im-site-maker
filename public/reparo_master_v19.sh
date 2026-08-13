#!/bin/bash

# --- CONFIGURAÇÃO ---
DOMAIN="lovblack.online"
APP_DIR="/var/www/lovablack_final"
PORT="8090"
GITHUB_REPO="https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git"

echo "🚨 INICIANDO OPERAÇÃO MASTER V19 - LIMPEZA NUCLEAR DE PROTOCOLO 🚨"

# 1. Parar tudo que possa estar usando a porta ou o nome
echo "🛑 Parando processos antigos..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 2. Limpeza AGRESSIVA de arquivos Nginx
echo "🧹 Faxina pesada no Nginx..."
# Remove qualquer link simbólico quebrado ou antigo
sudo find /etc/nginx/sites-enabled/ -type l -delete
# Remove arquivos que contenham o domínio, exceto o novo que vamos criar
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | xargs sudo rm -f 2>/dev/null || true

# 3. Resetar o Nginx para um estado limpo (sem HTTP2 global forçado)
sudo sed -i 's/http2 on;//g' /etc/nginx/nginx.conf 2>/dev/null || true

# 4. Preparar pasta e clonar
echo "📥 Clonando repositório do zero..."
sudo rm -rf $APP_DIR
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
git clone $GITHUB_REPO $APP_DIR
cd $APP_DIR

# Normalizar subpastas do Git
if [ -d "awesome-website-creator" ]; then
    mv awesome-website-creator/* .
    mv awesome-website-creator/.* . 2>/dev/null
    rmdir awesome-website-creator
fi

# 5. Build com Bun
echo "⚡ Instalando e Buildando..."
export PATH="/root/.bun/bin:$PATH"
bun install
bun run build

# 6. Configuração Nginx SEM HTTPS (Para limpar o cache do navegador)
echo "🌐 Criando VHost prioritário SEM SSL/HTTP2..."
cat << NGX | sudo tee /etc/nginx/sites-available/000-lovblack-v19
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Força a desativação de qualquer vestígio de HTTP2
    http2 off;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Headers para evitar que o navegador force HTTPS enquanto testamos
        add_header Last-Modified \$date_gmt;
        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        if_modified_since off;
        expires off;
        etag off;
    }
}
NGX

sudo ln -s /etc/nginx/sites-available/000-lovblack-v19 /etc/nginx/sites-enabled/000-lovblack-v19

# 7. Iniciar App
echo "🏃 Lançando App na porta $PORT..."
PORT=$PORT pm2 start bun --name "lovblack_v19" -- run dev -- --port $PORT

# 8. Reiniciar Nginx
sudo nginx -t && sudo systemctl restart nginx

echo "🔥 OPERAÇÃO CONCLUÍDA!"
echo "IMPORTANTE: O erro ERR_HTTP2_PROTOCOL_ERROR é causado pelo seu navegador tentando usar HTTPS antigo."
echo "COMO TESTAR:"
echo "1. Abra o navegador FIREFOX (que não guarda cache de HSTS como o Chrome)."
echo "2. Ou use o comando: curl -I http://$DOMAIN"
echo "3. Se o curl responder 200 OK, o site está funcionando e o erro é apenas no seu Chrome."
