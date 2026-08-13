#!/bin/bash
# Nuke & Clean: Lovablack Total Removal Script
# Este script remove todos os vestígios do domínio lovblack.online para permitir uma instalação do zero.

echo "--- INICIANDO REMOÇÃO TOTAL DE LOVBLACK.ONLINE ---"

# 1. Parar e remover processos no PM2
echo "Limpando processos PM2..."
pm2 delete lovblack_master 2>/dev/null
pm2 delete lovablack 2>/dev/null
pm2 delete lovablack-master 2>/dev/null
pm2 save --force

# 2. Remover configurações do Nginx
echo "Removendo arquivos do Nginx..."
rm -f /etc/nginx/sites-available/000-lovblack*
rm -f /etc/nginx/sites-enabled/000-lovblack*
rm -f /etc/nginx/sites-available/lovablack*
rm -f /etc/nginx/sites-enabled/lovablack*

# 3. Limpar menções ao domínio em OUTROS arquivos do Nginx (Surgical Clean)
echo "Limpando menções em outros arquivos de configuração..."
grep -l "lovblack.online" /etc/nginx/sites-available/* 2>/dev/null | xargs -I {} sed -i '/lovblack.online/d' {}

# 4. Remover pastas de instalação
echo "Removendo pastas do projeto..."
rm -rf /var/www/lovablack
rm -rf /var/www/lovablack_new
rm -rf /root/lovablack

# 5. Remover certificados SSL (Certbot)
echo "Limpando certificados SSL..."
certbot delete --cert-name lovblack.online 2>/dev/null

# 6. Testar e reiniciar Nginx
echo "Reiniciando Nginx..."
nginx -t && systemctl restart nginx

echo "--- LIMPEZA CONCLUÍDA! O domínio lovblack.online está limpo na VPS. ---"
echo "Agora você pode rodar o comando de instalação novamente."
