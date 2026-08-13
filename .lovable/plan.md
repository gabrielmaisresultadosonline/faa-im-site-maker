# Plano de Correção: Hotfix Hydration e Erro React #310

O erro **React #310** (Objects are not valid as a React child) geralmente ocorre durante a hidratação (SSR vs Client) quando um objeto ou um `Promise` é renderizado acidentalmente como um filho React, ou quando há uma incompatibilidade severa entre o HTML gerado no servidor e o renderizado no cliente.

## Diagnóstico
O usuário reportou um erro de hidratação minificado. Analisando o código de `dashboard.tsx`, identifiquei que a variável `profile` e `sub` são tratadas como objetos, mas em alguns pontos do JSX (especialmente no modal de pagamento e nos badges), pode haver uma tentativa de renderizar o objeto inteiro ou um valor `null`/`undefined` de forma inadequada durante a transição de estados.

## Ações

### 1. Hardening do Dashboard
- Adicionar verificações explícitas em `src/routes/_authenticated/dashboard.tsx` para garantir que objetos não sejam passados como filhos.
- Refinar o `useEffect` de polling de pagamento para evitar loops infinitos ou renderizações desnecessárias durante a hidratação.
- Garantir que `timeLeft` e outros estados derivados sejam seguros para SSR.

### 2. Sincronização de Tipos
- Garantir que `profile` e `subscription` tenham fallbacks seguros (`?? null`) para evitar erros de "undefined" que o React às vezes interpreta mal em contextos de hidratação profunda.

### 3. Verificação de Scripts de Deploy
- Atualizar o `atualizar-script.ts` para a versão **V10**, garantindo que o comando `bun run build` limpe corretamente o cache antes de gerar o novo bundle, evitando que versões antigas do JS (com bugs de hidratação) persistam no VPS.

## Detalhes Técnicos
- **Arquivo:** `src/routes/_authenticated/dashboard.tsx`
- **Problema:** Possível renderização de `selectedPlan` ou `sub` antes da hidratação completa.
- **Solução:** Uso de guards `isActive && ...` e garantir que strings sejam o único output em áreas de texto.
