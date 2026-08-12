#!/bin/bash
DOMAIN="lovblack.online"

# Cores para o terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- 🚀 INICIANDO SUPER INSTALAÇÃO ISOLADA (LOVABLACK) ---${NC}"

# 1. IDENTIFICAR DIRETÓRIO DO PROJETO
# Vamos assumir que o usuário está rodando este script dentro da pasta onde quer o projeto
PROJECT_DIR=$(pwd)
echo -e "Diretório de instalação: ${GREEN}$PROJECT_DIR${NC}"

# 2. LIMPEZA RADICAL DE CONFLITOS NO NGINX
echo -e "${RED}Limpando sequestros de domínio no Nginx...${NC}"

# Remove links simbólicos quebrados que travam o Nginx
sudo find /etc/nginx/sites-enabled/ -type l ! -exec test -e {} \; -delete

# Remove especificamente o link que o log indicou estar quebrado
sudo rm -f /etc/nginx/sites-enabled/000-lovblack
sudo rm -f /etc/nginx/sites-enabled/000-lovablack-prod
sudo rm -f /etc/nginx/sites-enabled/lovablack_master
sudo rm -f /etc/nginx/sites-enabled/lovablack_final

# Procura em TODOS os arquivos do Nginx por 'lovblack.online' e avisa o que encontrou
# Se encontrar em arquivos que não são deste projeto, removemos a configuração de servidor inteira ou o arquivo
sudo grep -rl "$DOMAIN" /etc/nginx/sites-available/ | while read -r file; do
    echo "Removendo configuração sequestradora em: $file"
    sudo rm -f "$file"
done

# 3. CRIAR CONFIGURAÇÃO NGINX EXCLUSIVA E PRIORITÁRIA
echo "Criando host virtual exclusivo..."
cat <<INNEREOF | sudo tee /etc/nginx/sites-available/lovablack_exclusivo > /dev/null
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
INNEREOF

# Link simbólico com prefixo 000 para garantir que seja lido primeiro
sudo ln -sf /etc/nginx/sites-available/lovablack_exclusivo /etc/nginx/sites-enabled/000-lovablack-exclusivo

# 4. INSTALAÇÃO DO PROJETO (BUN)
echo "Instalando dependências e gerando build..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERRO: package.json não encontrado em $PROJECT_DIR${NC}"
    exit 1
fi

bun install
bun run build

# 5. GERENCIAMENTO DE PROCESSO (PM2)
echo "Iniciando processo PM2 na porta 8080..."
pm2 delete lovablack 2>/dev/null
PORT=8080 pm2 start .output/server/index.mjs --name lovablack
pm2 save

# 6. REINICIAR NGINX E CERTBOT
echo "Validando e reiniciando Nginx..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo -e "${GREEN}Nginx configurado com sucesso!${NC}"
else
    echo -e "${RED}Falha no teste do Nginx. Verifique 'sudo nginx -t'${NC}"
fi

echo -e "${GREEN}--- ✅ TUDO PRONTO! ---${NC}"
echo "Execute o comando abaixo para ativar o SSL (HTTPS):"
echo -e "${GREEN}sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --force-renewal${NC}"
