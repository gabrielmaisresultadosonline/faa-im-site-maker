#!/bin/bash
DOMAIN="lovblack.online"
# Tenta localizar a pasta do projeto (ajuste se for diferente)
PROJECT_ROOT="/var/www/lovblack.online"

echo "--- 🛠️ CORREÇÃO DE AMBIENTE E NGINX ---"

# 1. Instalar Bun se não existir
if ! command -v bun &> /dev/null; then
    echo "Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    source ~/.bashrc
fi

# 2. Limpeza profunda de links quebrados no Nginx
# Remove TODOS os links em sites-enabled que apontam para arquivos que não existem
sudo find /etc/nginx/sites-enabled/ -type l ! -exec test -e {} \; -delete

# Remove links específicos que sabemos que estão dando erro
sudo rm -f /etc/nginx/sites-enabled/000-lovablack-final
sudo rm -f /etc/nginx/sites-enabled/000-lovablack-prod
sudo rm -f /etc/nginx/sites-enabled/000-lovblack

# 3. Criar a configuração Nginx
cat <<INNEREOF | sudo tee /etc/nginx/sites-available/lovablack_final > /dev/null
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
INNEREOF

# Ativa com prioridade
sudo ln -sf /etc/nginx/sites-available/lovablack_final /etc/nginx/sites-enabled/000-lovablack-final

# 4. Entrar na pasta do projeto e Buildar
if [ -d "$PROJECT_ROOT" ]; then
    cd "$PROJECT_ROOT"
    echo "Executando build em $PROJECT_ROOT..."
    ~/.bun/bin/bun install
    ~/.bun/bin/bun run build
    
    # 5. Reiniciar PM2 apontando para o caminho ABSOLUTO
    pm2 delete lovablack 2>/dev/null
    PORT=8080 pm2 start "$PROJECT_ROOT/.output/server/index.mjs" --name lovablack
else
    echo "ERRO: Pasta $PROJECT_ROOT não encontrada!"
    exit 1
fi

# 6. Testar Nginx e Reiniciar
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "--- ✅ SUCESSO! ---"
    echo "Site rodando. Agora você pode rodar o Certbot:"
    echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --force-renewal"
else
    echo "ERRO no Nginx. Verifique com 'sudo nginx -t'"
fi
