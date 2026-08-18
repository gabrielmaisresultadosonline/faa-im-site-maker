# Plano de Correção: Botões do Hero e Modal de Autenticação

Os botões "TESTE GRÁTIS" e "JÁ SOU MEMBRO" no Hero da página inicial não estão abrindo o popup (Dialog). Isso geralmente ocorre devido a conflitos de estado do Dialog ou problemas na renderização condicional.

## 🛠️ Alterações Técnicas

### 1. Ajuste no `src/routes/index.tsx` e `src/routes/ingles.tsx`
- Revisar a estrutura do `Dialog` e `DialogTrigger`.
- Garantir que o `AuthModal` não esteja causando crash ao ser montado dentro do `DialogContent`.
- Simplificar a lógica de redirecionamento automático para não interferir na abertura do modal caso o usuário clique nos botões (embora a lógica atual já redirecione antes de carregar o componente se a sessão existir).

### 2. Verificação no `src/components/auth/AuthModal.tsx`
- Adicionar `ErrorBoundary` simples ou verificações de nulo para evitar que falhas em hooks de terceiros (como Facebook Pixel ou verificação de IP) impeçam a renderização do modal.
- Garantir que o `useEffect` de idioma não cause loops infinitos de re-render.

### 3. Limpeza de Cache e Build
- Como o usuário relatou erros 500 anteriormente, garantir que os componentes estejam limpos e sem efeitos colaterais pesados no nível do módulo.

## 📝 User Interface
- Nenhuma mudança visual drástica, apenas restauração da funcionalidade de clique.

---

### 📊 Relatório de Execução (Prévio)

**Sub-agentes ativados:**
- 🎨 **UI Architect** — ✅ Executado
- 🗄️ **Supabase Engineer** — ➖ Não necessário
- 🔍 **Code Auditor** — ✅ Executado
- 🧪 **Testing Agent** — ➖ Não necessário
- 📈 **SEO Optimizer** — ➖ Não necessário
- 🚀 **Deploy Ops** — ➖ Não necessário
- 🔌 **API Integrator** — ➖ Não necessário
