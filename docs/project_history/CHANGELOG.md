# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.0.2] - 2026-04-07

### Corrigido

- **Loop infinito causando excesso de reads do Firebase**
  - Causa: useEffect de sincronização com `checks` no array de dependências
  - Solução: Removido useEffect redundante
  - Adicionado verificação de mudança real no onSnapshot
  - Redução estimada de 95%+ em reads do Firebase
  - Console mais limpo e debugável
- **Otimização de logs**
  - Removido logs desnecessários de localStorage
  - Mantido apenas logs importantes para debug
  - Melhor performance geral

### Alterado

- `src/hooks/useCalendar.ts` (261 → 245 linhas)
  - Removido useEffect de sincronização redundante
  - Adicionado `lastFirebaseData` ref para comparação
  - Otimizado onSnapshot para ignorar atualizações desnecessárias
  - Reduzido overhead de logging

### Documentação

- `CORRECAO_LOOP_INFINITO.md` - Documentação completa da correção
- Atualizado `DEBUG_CHECKBOX.md` com notas de otimização

## [2.0.1] - 2026-04-07

### Corrigido

- **Bug crítico de checklist**: Checkbox marcava e desmarcava automaticamente
  - Causa raiz: Cota do Firestore excedida
  - Solução: Implementado localStorage como fallback
  - Sistema agora funciona mesmo com cota excedida
  - Estado persiste localmente e sincroniza automaticamente quando cota retorna
- **Sincronização automática**: Retry automático a cada 30 segundos
  - Sistema tenta sincronizar com Firebase continuamente
  - Quando cota retorna, sincroniza automaticamente todos os dados
  - Não requer intervenção manual do usuário
- **Proteção contra sobrescrita**: onSnapshot ignora atualizações recentes
  - Estado local tem prioridade sobre Firebase
  - pendingSync previne conflitos de sincronização
- **Alertas visuais**: Mensagens amigáveis para usuários
  - Alerta quando cota está excedida
  - Indicação de tentativa de sincronização
  - Feedback claro sobre status do sistema

### Alterado

- `src/hooks/useCalendar.ts` (85 → 261 linhas)
  - Adicionado localStorage como fonte primária de estado
  - Implementado retry automático com timer
  - Adicionado tratamento de erros de cota excedida
  - Adicionado syncError para alertar usuários
- `src/components/ExpenseCalendar.tsx`
  - Adicionado alerta visual de sincronização
  - Recebe syncError prop
- `src/App.tsx`
  - Extrai syncError do useCalendar
  - Passa syncError para ExpenseCalendar

### Documentação

- `DEBUG_CHECKBOX.md` - Atualizado com status resolvido
- `DIAGNOSTICO_INTENSO.md` - Diagnóstico completo do problema
- `IMPLEMENTACAO_CONCLUIDA.md` - Implementação detalhada da solução
- `SINCRONIZACAO_AUTOMATICA.md` - Documentação do retry automático

## [2.0.0] - 2026-01-01

### Adicionado

- Dashboard analítico com gráficos mensais e anuais
- Ranking de lojas por valor de despesas
- Distribuição por categoria com percentuais
- Top 5 maiores despesas do período
- Evolução mensal no modo anual
- Comparação com mês anterior (tendência)
- Sistema de backup em JSON e CSV
- Restauração de backup para Firebase
- Calendário de pagamentos fixos
- Filtros por dia de vencimento
- Zoom no calendário (3 níveis)
- Notificações sonoras para pagamentos pendentes
- Ícones 3D personalizados
- Design glass morphism

### Alterado

- Refatoração completa dos hooks
- Otimização com useMemo e useCallback
- Melhoria na performance de renderização
- Interface responsiva para mobile
- Animações suaves com transições CSS

### Corrigido

- Sincronização de checkbox com Firebase
- Cálculo de divisão de despesas
- Formatação de datas para localização BR
- Memory leaks em listeners do Firebase

## [1.5.0] - 2025-06-15

### Adicionado

- Sistema de autenticação anônima
- Proteção de exclusão com senha admin
- Limite de 24h para exclusão
- Validação de dados antes de salvar

### Corrigido

- Erro ao sincronizar offline
- Problemas de timezone em datas

## [1.0.0] - 2025-01-01

### Adicionado

- Lançamento inicial do sistema
- CRUD de despesas
- Multi-lojas com divisão automática
- Firebase Firestore como backend
- React 18 com TypeScript
- Tailwind CSS para estilização
- Vite como build tool

---

## Tipos de Mudanças

- **Adicionado**: Novas funcionalidades
- **Alterado**: Mudanças em funcionalidades existentes
- **Descontinuado**: Funcionalidades que serão removidas
- **Removido**: Funcionalidades removidas
- **Corrigido**: Correções de bugs
- **Segurança**: Correções de vulnerabilidades
