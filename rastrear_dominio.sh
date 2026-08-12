#!/bin/bash
echo "--- INICIANDO RASTREAMENTO DO DOMÍNIO lovblack.online ---"
echo "Horário: $(date)"
echo ""

echo "[1/5] Procurando ocorrências do domínio em /etc/nginx/..."
grep -rn "lovblack.online" /etc/nginx/ 2>/dev/null | grep -v "access.log" | grep -v "error.log"
echo ""

echo "[2/5] Listando sites ativos (sites-enabled)..."
ls -l /etc/nginx/sites-enabled/ 2>/dev/null
echo ""

echo "[3/5] Verificando processos nas portas 80/443..."
if command -v lsof >/dev/null 2>&1; then
    sudo lsof -i :80 -sTCP:LISTEN
    sudo lsof -i :443 -sTCP:LISTEN
else
    sudo netstat -tunlp | grep -E ':80|:443'
fi
echo ""

echo "[4/5] Verificando configurações globais e conf.d..."
grep -rn "server_name" /etc/nginx/conf.d/ 2>/dev/null
grep -rn "server_name" /etc/nginx/nginx.conf 2>/dev/null
echo ""

echo "[5/5] Testando resolução local do domínio..."
curl -I -H "Host: lovblack.online" http://localhost 2>/dev/null | head -n 1
echo ""

echo "--- FIM DO DIAGNÓSTICO ---"
