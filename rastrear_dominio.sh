#!/bin/bash

# ==============================================================================
# SCRIPT DE DIAGNÓSTICO PROFUNDO - LOVBLACK.ONLINE
# Objetivo: Rastrear qual arquivo do Nginx está "sequestrando" o domínio.
# ==============================================================================

echo "--- INICIANDO RASTREAMENTO DO DOMÍNIO lovblack.online ---"
echo ""

# 1. Verificar onde o domínio aparece em TODA a configuração do Nginx
echo "[1/4] Procurando ocorrências do domínio em /etc/nginx/..."
grep -rn "lovblack.online" /etc/nginx/ | grep -v "access.log" | grep -v "error.log"
echo ""

# 2. Listar todos os links simbólicos ativos
echo "[2/4] Listando sites ativos (sites-enabled)..."
ls -l /etc/nginx/sites-enabled/
echo ""

# 3. Identificar o processo que está ouvindo a porta 80 e 443
echo "[3/4] Verificando processos nas portas 80/443..."
if command -v lsof >/dev/null 2>&1; then
    lsof -i :80
    lsof -i :443
else
    netstat -tunlp | grep -E ':80|:443'
fi
echo ""

# 4. Verificar arquivos de configuração globais (onde sites costumam se esconder)
echo "[4/4] Verificando configurações globais..."
grep -rn "server_name" /etc/nginx/conf.d/
grep -rn "server_name" /etc/nginx/nginx.conf
echo ""

echo "--- FIM DO DIAGNÓSTICO ---"
echo "Copie e cole TODO o resultado acima de volta no chat para que eu organize os arquivos corretamente para você."
