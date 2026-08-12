#!/bin/bash
echo "🛑 Parando apenas o site zapmro (mantendo a API)..."
pm2 stop zapmro
pm2 save
echo "✅ zapmro pausado. belezalisoperfeito, lovablack e zapmro-api continuam rodando."
pm2 status
