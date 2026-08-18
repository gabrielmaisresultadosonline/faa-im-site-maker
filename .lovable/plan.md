# Plano de Estabilização de Autenticação (Extensão e Dashboard)

Corrigir as falhas de login na extensão ("Credenciais inválidas") e garantir a estabilidade do build e conexão com o banco de dados no VPS Hostinger.

## Problemas Identificados
1. **Erro de Login na Extensão**: A API estava usando o `publicClient` para executar a função `login_extension_with_access_password`, o que causava erros de permissão no schema `auth_internal` ou falha ao ler senhas de acesso.
2. **Dependências de Build no VPS**: O uso de pacotes internos `@lovable.dev` pode quebrar o build em ambientes fora do sandbox.
3. **Segurança de Schema**: O schema `auth_internal` precisa de permissões explícitas para ser acessado por funções `SECURITY DEFINER`.

## Ações Realizadas / Planejadas

### 1. Hardening da API de Login (`lovablack-api.ts`)
- Mudar a execução da RPC de login para usar o `supabaseAdmin`.
- Melhorar as mensagens de erro para o usuário final, incluindo dicas sobre a configuração da chave no VPS.
- Adicionar logs detalhados (mascarados) para facilitar o debug no PM2.

### 2. Estabilização do Client Server (`client.server.ts`)
- Refatorar o `supabaseAdmin` para ser resiliente a ambientes onde as variáveis de ambiente possam ser injetadas tardiamente (PM2).
- Adicionar validações de presença da `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Ajuste de Permissões no Banco de Dados
- Criar migração para garantir `GRANT USAGE` e `GRANT ALL` no schema `auth_internal` para os roles necessários, evitando o erro "permission denied for schema auth_internal".

### 4. Interface do Usuário (`index.tsx` e `ingles.tsx`)
- Sincronizar os textos de erro conforme solicitado pelo usuário.

## Detalhes Técnicos
- **Endpoint**: `POST /api/public/lovablack-api`
- **RPC**: `public.login_extension_with_access_password`
- **Variáveis Críticas**: `SUPABASE_SERVICE_ROLE_KEY` deve estar correta no `.env` do VPS.
