# Plano de Correção: Bucket 'assets' e Permissões de Vídeo (v2.1.37)

O problema "Bucket not found" e "404" ao acessar vídeos diretamente (mesmo com URLs públicas) ocorre porque o bucket `assets` está configurado como **privado** (`public: false`), mas o código e os logs do usuário tentam acessá-lo via `/storage/v1/object/public/assets/...`. Além disso, a falha na assinatura pode estar ligada à ausência de políticas específicas para o bucket existir.

## Ações Técnicas

### 1. Banco de Dados (Supabase)
- Criar migração para garantir que o bucket `assets` exista e esteja explicitamente configurado.
- Adicionar políticas de RLS para `storage.buckets` permitindo leitura pública do nome do bucket (evita o erro "Bucket not found" em algumas APIs de inspeção).
- Manter o bucket privado (por segurança), mas garantir que as políticas de leitura permitam acesso via `authenticated` e `anon` no nível de objeto, o que viabiliza o uso de Signed URLs.

### 2. Backend (Server Functions)
- Corrigir `src/lib/video.functions.ts` para nunca gerar URLs com o prefixo `/public/` para o bucket `assets`, já que ele é privado.
- Reforçar o tratamento de erros e logs para facilitar o debug em caso de falha na assinatura.

### 3. Deployment
- Recomendar a execução do script de deploy no VPS para garantir que as novas variáveis de ambiente e código entrem em vigor.

## Detalhes de Segurança
- Manter RLS ativo.
- O bucket permanece privado; o acesso externo será via Signed URLs geradas no servidor ou via token de sessão do usuário no cliente.

---

### 📊 Relatório de Execução (Preview)
- **Sub-agentes:** UI, Supabase, Auditoria.
- **Arquivos:** `supabase/migrations/...`, `src/lib/video.functions.ts`.
