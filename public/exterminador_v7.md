#!/bin/bash
DOMAIN="lovblack.online"
PROJECT_DIR="/var/www/lovblack.online"
PORT=8080

echo "--- 🚨 OPERAÇÃO EXTERMINADORA (DOMÍNIO SEQUESTRADO) ---"

# 1. Parar PM2
echo "Limpando processos PM2..."
pm2 delete all 2>/dev/null
pm2 save --force

# 2. LIMPEZA TOTAL DE NGINX (O segredo está aqui)
echo "Limpando configurações conflitantes do Nginx..."

# Desativar TUDO no sites-enabled para começar do zero
sudo rm -f /etc/nginx/sites-enabled/*

# Remover qualquer arquivo em sites-available que mencione o domínio (exceto o nosso que criaremos)
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | xargs sudo rm -f

# 3. Remover a pasta do projeto e recriar
echo "Limpando diretórios..."
sudo rm -rf "$PROJECT_DIR"
sudo mkdir -p "$PROJECT_DIR"
sudo chown -R $USER:$USER "$PROJECT_DIR"

# 4. CRIAR O VHOST MESTRE (Prioridade Absoluta)
echo "Criando VHost Master para $DOMAIN..."
cat <<EOF | sudo tee /etc/nginx/sites-available/lovblack_master > /dev/null
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Ativar como ÚNICO site (por enquanto) para forçar o domínio a vir para cá
sudo ln -sf /etc/nginx/sites-available/lovblack_master /etc/nginx/sites-enabled/000-lovblack-master

# 5. RESTART NGINX
sudo nginx -t && sudo systemctl restart nginx

# 6. INSTALAÇÃO DO APP (BUILD)
echo "Baixando e instalando o app..."
cd "$PROJECT_DIR"
# Clonar ou baixar build aqui - Usando o comando que o usuário tem do GitHub
git clone https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git .

# Instalar dependências e Build
export PATH=$PATH:/root/.bun/bin
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    source /root/.bashrc
fi

/root/.bun/bin/bun install
/root/.bun/bin/bun run build

# 7. RODAR COM PM2
echo "Iniciando com PM2..."
# Usando o node-server gerado pelo build do TanStack Start/Vite
pm2 start ".output/server/index.mjs" --name "lovblack" --env PORT=$PORT
pm2 save --force

echo "--- ✅ PROCESSO FINALIZADO ---"
echo "O site de engajamento/cabeleireira foi removido e o Lovablack foi instalado de forma isolada."
echo "Se o domínio ainda mostrar o site antigo, limpe o cache do seu navegador (CTRL + F5)."
