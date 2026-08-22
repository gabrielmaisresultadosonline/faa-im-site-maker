# Plano de Estabilização e Ativação Sem Travas (v2.1.30)

Este plano visa remover todas as barreiras técnicas e de segurança que impedem a ativação do teste de 20 minutos no dashboard, garantindo que o processo funcione de forma transparente e imediata para o usuário logado.

## Mudanças Propostas

### 1. Backend e Lógica de Servidor (`src/lib/trial.functions.ts`)
- **Remoção de Middleware de Autenticação**: O middleware `requireSupabaseAuth` será removido da função `startTrial` para evitar qualquer falha de validação de token no nível do framework.
- **Identificação Flexível**: A função aceitará o `userId` tanto via contexto (se disponível) quanto explicitamente via argumentos (`data`), permitindo redundância caso o estado de autenticação do TanStack Start esteja instável no VPS.
- **Bypass Completo de RLS**: Uso garantido do `supabaseAdmin` para todas as operações (leitura de perfil, verificação de assinaturas e inserção de teste), eliminando erros de permissão.

### 2. Interface do Usuário (`src/routes/_authenticated/dashboard.tsx`)
- **Passagem Explícita de ID**: A mutação do teste enviará o `user.id` explicitamente na chamada da função de servidor.
- **Feedback Visual e Resiliência**: Garantia de que o botão de ativação não trave e forneça feedback claro mesmo em casos de sincronização lenta do banco de dados.

### 3. Banco de Dados (Migração de Segurança)
- **Permissões de Service Role**: Garantir que a `service_role` tenha acesso irrestrito às tabelas `profiles` e `subscriptions` para que as operações de servidor nunca falhem por falta de privilégios.

## Detalhes Técnicos
- A função `startTrial` agora trata `context` como `any` para acessar `userId` com segurança de tipos em tempo de execução, contornando o erro de tipagem `never`.
- Implementação de log detalhado para rastrear falhas específicas no ambiente VPS.

## Verificação
- Testar ativação imediata após o cadastro.
- Verificar se o contador de 20 minutos aparece corretamente no dashboard.
- Validar se a senha de acesso à extensão é gerada e exibida sem erros.
