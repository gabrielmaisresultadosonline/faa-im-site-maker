# Plano de Estabilização de Assinaturas e Expiração (v2.1.38)

O objetivo é eliminar o erro "Acesso expirado" falso na extensão para usuários com planos ativos, sincronizando a lógica de margem de segurança (grace period) entre o Banco de Dados e a API.

## Alterações Técnicas

### 1. Banco de Dados (PostgreSQL)
- Atualizar a função `internal_get_extension_user_data` na migração para incluir um `GRACE_PERIOD` de 5 minutos na verificação de `expires_at`.
- Garantir que planos `lifetime` (vitalícios) ignorem completamente a data de expiração na lógica do banco.

### 2. API do Servidor (TypeScript)
- Reforçar a lógica em `lovablack-api.ts` para garantir que a propriedade `is_expired` e `is_active` sejam calculadas de forma idêntica à do banco de dados.

## Detalhes de Implementação

### Database Migration
```sql
-- Na função internal_get_extension_user_data
_now timestamptz := clock_timestamp();
_grace_period interval := interval '5 minutes';

-- Lógica de is_active
'is_active', _subscription.id IS NOT NULL 
  AND _subscription.status = 'active' 
  AND (
    _subscription.type = 'lifetime' 
    OR _subscription.expires_at + _grace_period > _now
  )
```

### API Refinement
- Sincronizar `GRACE_MS` com a lógica SQL.
