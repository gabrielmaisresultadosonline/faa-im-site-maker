# Planejamento - Correção de Build e Alinhamento de Porta (Porta 8098)

O site está enfrentando um erro **502 Bad Gateway** no VPS Hostinger. A investigação técnica revelou que o processo Node.js está escutando na porta **3000**, enquanto o Nginx espera a porta **8098**. Além disso, há um erro de "TypeError" no bundle SSR gerado que causa falhas internas (HTTP 500).

Este plano visa corrigir o erro de build e forçar a aplicação a usar a porta correta.

## Alterações Propostas

### 1. Correção do Script de Deploy (`deploy-vps.sh`)
- Garantir que as variáveis `PORT` e `NITROPACK_PORT` sejam injetadas corretamente no PM2.
- Adicionar logs de depuração mais claros para capturar falhas no boot do servidor.
- Forçar a limpeza de caches de build antes de cada nova tentativa.

### 2. Configuração de Build (`vite.config.vps.ts`)
- Revisar a configuração do Nitro para garantir que as dependências do TanStack Start sejam incluídas corretamente no bundle (evitando o erro `__toESM(...).default is undefined`).
- Usar `inlineDynamicImports: true` para simplificar a carga de módulos no ambiente de produção do VPS.

### 3. Ponto de Entrada do Servidor (`src/server.ts`)
- Adicionar logs explícitos de inicialização para confirmar em qual porta o servidor está realmente subindo.

## Detalhes Técnicos
- O erro `__extends` sugere uma falha na transpilação de classes ou módulos ESM/CJS mistos no Nitro.
- Forçaremos o bind em `0.0.0.0` para garantir que o Nginx consiga se comunicar com o processo Node.

## Validação
- Executar o script de deploy e verificar se o build completa sem `PARSE_ERROR`.
- Verificar logs do PM2: `pm2 logs lovablack_master`.
- Testar conectividade local: `curl -I http://127.0.0.1:8098`.