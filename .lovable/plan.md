# Migração total: Supabase → PostgreSQL próprio na VPS

Objetivo: remover 100% da dependência do Supabase (banco, auth, storage) e passar tudo para um PostgreSQL rodando na própria VPS, com um único comando de instalação/atualização que sobe tudo sem quebrar.

## O que muda

### 1. Banco de dados (PostgreSQL nativo na VPS)
Schema único criado por um script SQL idempotente (`db/schema.sql`), rodado automaticamente no deploy:

- `users` — email, senha (hash bcrypt/scrypt), idioma, IP de cadastro, HWID, datas
- `sessions` — tokens de sessão de longa duração (site + extensão), com `expires_at` e `last_seen_at`
- `subscriptions` — plano (`trial`, `monthly`, `semiannual`, `lifetime`), status, `expires_at`
- `user_roles` — papéis (`admin`, `user`) em tabela separada
- `app_settings` — configurações, incluindo os 3 vídeos do dashboard e o vídeo da home
- `media_assets` — imagens/arquivos (extensão .zip, thumbnails) gravados em disco na VPS, metadados no Postgres
- `transactions` — pagamentos InfinitePay/Stripe
- Índices em email, token de sessão, `user_id` e IP

Seed inicial: admin, planos, os 3 vídeos do YouTube já configurados.

### 2. Autenticação própria (fim do Supabase Auth)
- Cadastro/login por email+senha com hash forte, feito em server functions do TanStack.
- Sessão via cookie `httpOnly` + `Secure` para o site, e token Bearer de longa duração para a extensão.
- **Sessão fiel**: token da extensão com validade longa (30 dias) e renovação automática a cada chamada válida; nunca expira por diferença de relógio. Planos `lifetime` ignoram `expires_at`; demais planos usam margem de tolerância de 5 minutos.
- Bloqueio de múltiplos cadastros pelo mesmo IP (máx. 2), como hoje.
- Admin protegido por papel na tabela `user_roles` (sem credenciais no código).

### 3. Teste grátis de 20 minutos
Ativação atômica via função SQL `activate_free_trial(user_id)` que:
- cria a assinatura `trial` com `expires_at = now() + 20 minutes` só se o usuário nunca teve trial;
- é chamada tanto no cadastro "teste grátis" quanto pelo botão dentro do dashboard;
- retorna estado claro (ativado / já usado / erro) para a interface.

### 4. Mídia (vídeos e imagens)
- Os 3 vídeos do dashboard e o vídeo da home ficam como URLs do YouTube em `app_settings` (sem storage).
- Uploads (extensão .zip, thumbnails, imagens) passam a gravar em `/var/www/lovablack/uploads`, servidos por rota pública `/api/public/media/:id`, com metadados no Postgres. Fim dos signed URLs e dos erros 400 de bucket.

### 5. API da extensão
`/api/public/lovablack-api` reescrita sobre o Postgres:
- `login` → valida email/senha, cria sessão, devolve token + dados do plano
- `validate` → valida token, renova `last_seen_at`, devolve `is_active`/`expires_at`
- `logout` → invalida token
- CORS aberto para a extensão, respostas JSON estáveis, sem 500 por falta de chave.

### 6. Deploy: um único comando
Novo `deploy.sh` na raiz, idempotente, executado assim na VPS:

```bash
bash <(curl -fsSL https://lovblack.online/api/public/deploy-script) 
```

O script faz, em ordem, parando no primeiro erro real:
1. instala/valida Node, Bun, PM2, Nginx, PostgreSQL 16 e Certbot
2. cria banco `lovablack`, usuário e senha (gerada e salva em `.env` se ainda não existir)
3. clona/atualiza o repositório e instala dependências
4. aplica `db/schema.sql` (idempotente) e o seed
5. faz build de produção (`node-server`)
6. sobe/reinicia no PM2 na porta 8098 com as variáveis injetadas
7. configura Nginx + SSL para `lovblack.online`
8. health check (`/`, `/api/public/lovablack-api`) e relatório final

Rodar de novo nunca destrói dados: o schema é `CREATE TABLE IF NOT EXISTS` e as migrações são versionadas.

## Detalhes técnicos
- Driver: `postgres` (postgres.js) — leve, compatível com o runtime Node do build `node-server`.
- Todo acesso ao banco em arquivos `*.server.ts`, expostos por `*.functions.ts` e rotas `api/public/*`.
- Remoção de `@supabase/supabase-js`, `src/integrations/supabase/*`, middleware de bearer do Supabase e das configs relacionadas.
- Hash de senha com `scrypt` do `node:crypto` (sem dependência nativa, funciona no bundle).
- Variáveis novas: `DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_URL`, `UPLOAD_DIR`.

## Observação importante
Depois dessa migração o app deixa de funcionar no preview da Lovable (que não tem PostgreSQL próprio) e passa a rodar exclusivamente na VPS, que é onde ele está em produção hoje.

## Validação
- Cadastro novo → entra no dashboard com trial de 20 min ativo
- Cadastro normal → botão "ativar teste" funciona uma única vez
- Login na extensão → token válido, sem "Acesso expirado" com plano ativo
- `/admin` → lista usuários com IP de cadastro, planos e reset de HWID
- Os 3 vídeos e o vídeo da home carregando
