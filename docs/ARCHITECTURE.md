# Arquitetura do Sistema Despesas-Odoo

## Visão Geral

O sistema Despesas-Odoo é uma aplicação web de gestão de despesas para a Miplace, desenvolvida com React 18, TypeScript e Firebase. O sistema permite o gerenciamento de despesas, pagamentos fixos, analytics e backup de dados.

## Stack Tecnológico

### Frontend
- **React 18.3.1** - Framework UI
- **TypeScript 5.3.3** - Tipagem estática
- **Vite 5.0.8** - Build tool e dev server
- **Tailwind CSS 3.4.0** - Estilização

### Backend
- **Firebase 10.7.1** - Backend as a Service
  - Firestore - Banco de dados NoSQL
  - Auth - Autenticação anônima

### Testes
- **Vitest 1.1.0** - Framework de testes

## Estrutura de Diretórios

```
src/
├── components/          # Componentes React
│   ├── icons/          # Ícones customizados
│   ├── ui/             # Componentes UI reutilizáveis
│   ├── analytics/      # Componentes de analytics (futuro)
│   ├── fixed-payments/ # Componentes de pagamentos fixos (futuro)
│   └── calendar/       # Componentes de calendário (futuro)
├── config/             # Configurações
├── hooks/              # Hooks customizados
├── types/              # Definições de tipos TypeScript
├── utils/              # Funções utilitárias
└── test/               # Setup de testes
```

## Arquitetura de Componentes

### Componentes Principais

#### App.tsx
- **Responsabilidade:** Componente raiz da aplicação
- **Estado:** Gerencia todos os estados globais
- **Tamanho:** 1003 linhas (a ser refatorado)
- **Dependências:** Todos os hooks e componentes

#### ExpenseAnalytics.tsx
- **Responsabilidade:** Dashboard com gráficos e analytics
- **Funcionalidades:**
  - Gráficos mensais e anuais
  - Cálculos de totais e médias
  - Filtros por loja e categoria
- **Tamanho:** 583 linhas (a ser refatorado)

#### FixedPaymentsManager.tsx
- **Responsabilidade:** Gerenciamento de pagamentos fixos
- **Funcionalidades:**
  - CRUD de pagamentos fixos
  - Persistência em localStorage
  - Alertas de pagamentos pendentes
- **Tamanho:** 496 linhas (a ser refatorado)

#### ExpenseCalendar.tsx
- **Responsabilidade:** Calendário interativo de pagamentos
- **Funcionalidades:**
  - Visualização mensal
  - Navegação entre meses
  - Destaque de dias com pagamentos
- **Tamanho:** 478 linhas (a ser refatorado)

### Componentes UI

#### DateInput.tsx
- Input de data com validação
- Formatação automática

#### ToastContainer.tsx
- Container de notificações toast
- Animações de entrada/saída

#### PendingPaymentsAlert.tsx
- Alerta de pagamentos pendentes
- Contagem de pagamentos do dia

#### LoadingSpinner.tsx
- Spinner de carregamento
- Estados de loading

## Arquitetura de Hooks

### useAuth
- **Responsabilidade:** Autenticação anônima
- **Funcionalidades:**
  - Login automático
  - Persistência de sessão
  - Logout
- **Fonte:** `src/hooks/useAuth.ts`

### useExpenses
- **Responsabilidade:** CRUD de despesas
- **Funcionalidades:**
  - Criar, ler, atualizar, excluir despesas
  - Filtros por loja, categoria, data
  - Ordenação
  - Sincronização com Firebase
- **Fonte:** `src/hooks/useExpenses.ts`

### useCalendar
- **Responsabilidade:** Navegação de calendário
- **Funcionalidades:**
  - Navegação entre meses
  - Seleção de datas
  - Cálculo de dias do mês
- **Fonte:** `src/hooks/useCalendar.ts`

### useBackup
- **Responsabilidade:** Backup e exportação
- **Funcionalidades:**
  - Exportação JSON
  - Exportação CSV (compatível com Odoo)
  - Importação de backup
- **Fonte:** `src/hooks/useBackup.ts`

### useToast
- **Responsabilidade:** Notificações toast
- **Funcionalidades:**
  - Adicionar notificações
  - Remover notificações
  - Tipos: success, error, warning, info
- **Fonte:** `src/hooks/useToast.ts`

### useFixedPayments
- **Responsabilidade:** Pagamentos fixos
- **Funcionalidades:**
  - CRUD de pagamentos fixos
  - Persistência em localStorage
  - Validação de dias
- **Fonte:** `src/hooks/useFixedPayments.ts`

## Fluxo de Dados

### 1. Inicialização da Aplicação

```
main.tsx
  ↓
App.tsx
  ↓
useAuth (login automático)
  ↓
useExpenses (carregar despesas)
  ↓
useFixedPayments (carregar pagamentos fixos)
  ↓
Renderização inicial
```

### 2. Criação de Despesa

```
Usuário preenche formulário
  ↓
App.tsx (handleSubmit)
  ↓
useExpenses.addExpense()
  ↓
Validação
  ↓
Firebase Firestore (addDoc)
  ↓
Atualização de estado
  ↓
Re-renderização
  ↓
useToast (notificação)
```

### 3. Backup de Dados

```
Usuário clica em backup
  ↓
App.tsx (handleBackup)
  ↓
useBackup.exportJSON()
  ↓
Coleta de dados (despesas + pagamentos fixos)
  ↓
Formatação JSON
  ↓
Download do arquivo
  ↓
useToast (notificação)
```

## Integração com Firebase

### Configuração

**Arquivo:** `src/config/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

### Firestore

**Coleções:**
- `expenses` - Despesas do usuário
- `checklists` - Checklists globais

**Estrutura de documento (expense):**

```typescript
{
  id: string,
  description: string,
  amount: number,
  category: string,
  store: string,
  date: string (ISO),
  createdAt: string (ISO),
  userId: string
}
```

### Auth

**Tipo:** Autenticação anônima

**Fluxo:**
1. Usuário acessa aplicação
2. `signInAnonymously()` é chamado automaticamente
3. UID é gerado e persistido
4. Todas as operações usam este UID

## Padrões Utilizados

### 1. Custom Hooks

Padrão para extrair lógica de componentes:

```typescript
const useCustomHook = () => {
  const [state, setState] = useState(initialState);
  
  const action = useCallback(() => {
    // lógica
  }, [dependencies]);
  
  return { state, action };
};
```

### 2. Componentes UI Reutilizáveis

Componentes pequenos e focados:

```typescript
interface Props {
  prop1: string;
  prop2: number;
  onAction: () => void;
}

export const Component = ({ prop1, prop2, onAction }: Props) => {
  return <div>{/* JSX */}</div>;
};
```

### 3. Tipagem Forte

Uso extensivo de TypeScript:

```typescript
interface Expense {
  id: string;
  description: string;
  amount: number;
  // ...
}

type StoreName = "Piracicaba" | "Amparo" | "Todas";
```

### 4. Separação de Concerns

- **Components:** UI e interação
- **Hooks:** Lógica de negócio
- **Utils:** Funções puras
- **Config:** Constantes e configurações

## Regras de Negócio

### 1. Divisão de Despesas

- **Piracicaba (DP - Realme - XV):** Divide em 3
- **Amparo (Premium - Kassouf):** Divide em 2
- **Todas:** Divide em 4 (Dom Pedro II, Realme, XV, Premium — sem Kassouf)

### 2. Exclusão de Despesas

- Permitida apenas em 24h após criação
- Verificação: `Date.now() - new Date(expense.createdAt).getTime() < 24 * 60 * 60 * 1000`

### 3. Correções no Calendário

- Requer senha de administrador
- Validação **assíncrona contra o Firestore** (`authService.validateAnyAdminPassword`)
  — nenhuma senha existe no código do cliente; senha mestra em
  `system_settings_v1/admin_master` (hash) e usuários com role `Administrador`
- Gestão de senhas: `node scripts/seed_users.mjs` (hash SHA-256 + salt)

### 4. Pagamentos Fixos

- Dias permitidos: 5, 10, 15, 20, 25, 27
- 58 pagamentos pré-configurados por padrão

## Performance

### Otimizações Atuais

1. **React.memo** em componentes que não precisam re-render
2. **useCallback** em handlers de eventos
3. **useMemo** em cálculos pesados
4. **Lazy loading** de componentes (parcial)

### Oportunidades de Melhoria

1. Code splitting por rota
2. Virtualização de listas longas
3. Cache de dados local
4. Otimização de bundle size

## Segurança

### Medidas Atuais

1. Autenticação anônima do Firebase
2. Regras de segurança do Firestore
3. Validação de dados no frontend

### Melhorias Necessárias

1. Mover senha admin para variáveis de ambiente ✅
2. Implementar autenticação real
3. Validação no backend (Cloud Functions)
4. Auditoria de ações

## Escalabilidade

### Capacidade Atual

- Suporta múltiplos usuários (autenticação anônima)
- Sincronização em tempo real
- Backup local e exportação

### Limitações

- Sem autenticação real
- Sem roles e permissões
- Sem auditoria
- Componentes monolíticos

## Próximos Passos

1. Refatorar componentes grandes
2. Implementar testes abrangentes
3. Adicionar autenticação real
4. Implementar auditoria
5. Otimizar performance
6. Adicionar novas funcionalidades

## Referências

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)


## Carga de despesas (janela recente + histórico sob demanda)

O painel não lê todas as despesas a cada abertura. `useExpenses` assina só a janela
recente (`where('date', '>=', início)` + `orderBy('date')`, últimos 3 meses, sem
índice composto); medido em produção, isso evita ~77% das leituras. O histórico
completo é pedido com `loadFullHistory()`, que só resolve quando o **servidor**
confirmou (o 1º evento pode vir do cache local, incompleto) e rejeita com
`HistoryLoadError` em vez de devolver lista parcial.

Precisam do histórico completo: análises e fechamento (mostram um aviso de
carregamento, nunca números parciais), busca, painel vazio, backup (usa a lista
devolvida por `loadFullHistory`) e lançamentos com data anterior à janela. O card
de resumo e o aviso do painel deixam claro quando o total é só do período
carregado. A janela vive em `features/expenses/utils/historyWindow.ts`.


## Decisões de dependências

- **Firebase 11.10 (não 12/13):** medido com o mesmo código de entrada, o SDK
  passa de ~127 kB (v10) para ~133 kB (v11), mas salta para ~190–198 kB gzip na
  v12/v13 (+65–70 kB no carregamento inicial) sem benefício para este app. A v11
  já elimina as vulnerabilidades moderadas do `undici`; o aviso que resta
  (`@grpc/grpc-js`) é de servidor gRPC em Node, não usado no navegador. A v13
  também foi validada (tipos, 358 testes, regras, build) — migrar é trocar
  `firebase` para `^13` e `@firebase/rules-unit-testing` para `^6`.
- **Vite 8 / Rolldown:** `build.rolldownOptions.output.codeSplitting.groups`
  substitui o `manualChunks` em objeto. Importe módulos lazy (`TodoManager`,
  `AuditManager`) direto do arquivo, nunca do `index.ts` da feature: o barrel
  reexporta o componente e anula o `import()` dinâmico (aviso
  `INEFFECTIVE_DYNAMIC_IMPORT`).
- **Node:** `engines` exige `^22.22.2 || >=24.15.0` (jsdom 31 / Vite 8).
- Testes usam `@testing-library/jest-dom/vitest` (tipos do Vitest 5).

## To-Do (`src/features/todo`)

`TodoManager` (1.256 → 173 linhas) só orquestra o estado da tela. O restante:

| Peça | Responsabilidade |
|---|---|
| `utils/todoFilters.ts` | Regras puras: filtros, contagens, seções de "Meu Dia", selo de vencimento, rótulos. Lista e contagem de cada filtro saem das mesmas funções. |
| `hooks/useTodoComposer.ts` | Estado e envio do "Adicionar uma tarefa..." (não limpa o formulário se salvar falhar). |
| `hooks/useSavedContacts.ts` | Contatos recentes (localStorage). |
| `hooks/useTodoIntegrations.ts` | Google Agenda, Gmail e `.ics` com o aviso ao usuário. |
| `components/TodoSidebar` + `todoFilterConfig.ts` | Listas e contagens, dirigidas por configuração (cores/ícones por lista). |
| `TodoQuickAdd`, `TodoList`, `TodoTaskCard`, `TodoDetailDrawer`, `TodoBanner` | Uma região da tela cada. |

Peculiaridade preservada (e coberta por teste): em "Meu Dia" a **lista** inclui as
concluídas (numa seção própria), mas a **contagem** só conta as pendentes.

A refatoração foi guiada por 45 testes de caracterização (`TodoManager.test.tsx`)
escritos *antes* de mexer no código, e conferida renderizando a versão original e a
nova com os mesmos dados em 16 estados (padrão, cada lista, painel aberto, formulário,
busca...): o HTML gerado foi idêntico.

## Calendário (`src/features/calendar`)

`ExpenseCalendar` (1.076 → 257 linhas) só orquestra o estado da tela.

| Peça | Responsabilidade |
|---|---|
| `utils/calendarView.ts` | Regras puras: grade do mês, filtros, deduplicação, regra de `months`, chave de pagamento (normalizada com fallback legado), estilos. `month` é sempre o índice 0–11 do JS. |
| `hooks/useCalendarPayments.ts` | Fluxos de pagar, corrigir (senha de admin) e "selecionar todos" (lote), com o estado dos 3 modais. |
| `hooks/useCalendarTodos.ts` | Tarefas exibidas, tarefa aberta no modal e concluir/reabrir (caminho local grava e toca som; o delegado não, para não duplicar). |
| `CalendarHeader`, `CalendarGrid`, `CalendarSectionHeader`, `PaymentsList`, `ScheduledTodosList`, `TodoQuickModal`, `PaymentModals` | Uma região da tela cada. |

Guiada por 37 testes de caracterização (escritos antes) e conferida renderizando a
versão original e a nova em 31 estados (abas, filtros, zoom, modais, pagos legados...):
HTML idêntico.

## Pagamentos fixos (`src/features/fixed-payments`)

`FixedPaymentsManager` (731 → 148 linhas) só compõe a tela. O formulário de cadastro
existia **duas vezes** (menu suspenso e modal de edição); agora as partes comuns
(`DayModeToggle`, `CustomDateInput`, `MonthPicker`) vivem em `PaymentFormParts`.

| Peça | Responsabilidade |
|---|---|
| `utils/fixedPaymentsView.ts` | Regras puras: meses (1–12), dias padrão, opções de dia (inclui 30/31), dia a partir da data, alternar mês, montar o dado gravado. |
| `hooks/useFixedPaymentsEditor.ts` | Menu "Novo Pagamento", modal de edição, pedido de senha de admin (editar/excluir), salvar. |
| `hooks/useLastSyncTime.ts` | Horário da última sincronização. |
| `NewPaymentDropdown`, `PaymentEditModal`, `PaymentPasswordModal`, `PaymentDayGroup`, `SyncStatusBadge` | Uma região da tela cada. |

Guiada por 30 testes de caracterização (o componente não tinha testes) e conferida
renderizando a versão original e a nova em 25 estados: HTML idêntico, ignorando
apenas o espaço em branco dentro de um atributo `class` (o `className` de várias linhas
carregava a indentação do código).

## Formulário de lançamento (`src/features/expenses`)

`ExpenseForm` (582 → 131 linhas) só compõe a tela.

| Peça | Responsabilidade |
|---|---|
| `utils/amountInput.ts` | Regras de valor em pt-BR: `parsePastedAmount` (milhar/decimal/centavos/negativos), máscara de digitação, colagem (inválido, zero e negativo seguem a colagem padrão). |
| `hooks/useReceiptAttachment.ts` | Comprovante: escolher arquivo, arrastar e soltar, Ctrl+V dentro do formulário e (só imagem) em qualquer lugar fora de campos de texto, sem processar o mesmo arquivo duas vezes. |
| `ExpenseFormHeader`, `ExpenseFormFields`, `ReceiptDropzone` | Uma região da tela cada. |

Guiada por 61 testes de caracterização (o formulário não tinha testes) e conferida
renderizando a versão original e a nova em 17 estados: HTML idêntico.

### Hook `useTodo` (`src/features/todo/hooks`)

`useTodo` (526 → 61 linhas) só compõe as partes:

| Peça | Responsabilidade |
|---|---|
| `useTodoAuthReady` | Espera o login com conta da equipe (sessão anônima não conta) antes de assinar o Firestore. |
| `useTodoSync` | Escuta as 300 tarefas mais recentes e entrega a lista já traduzida/ordenada/sem duplicados. |
| `useTodoReminders` | Alerta sonoro + notificação nativa uma vez por tarefa por dia; permissão no primeiro gesto. |
| `useTodoMutations` | As 8 operações. Todas aplicam na tela na hora, gravam e **desfazem** se a gravação falhar (um só ponto de confirmação: `commit`). |
| `utils/todoRecurrence`, `todoDocument`, `todoReminders` | Regras puras: próxima data (dias úteis, fim de mês), próxima ocorrência já existe?, leitura de documentos legados, lembrete devido. |

Guiada por 55 testes de caracterização. Os testes de "desfazer" capturam o erro dentro do
`act`: se a ação lançasse para fora, o React descartaria as renderizações e o estado lido
seria só o inicial (o teste passaria sem provar o rollback) — conferido por quebra proposital.

### Backup e restauração (`src/shared`)

`useBackup` (317 → 145 linhas) só orquestra (trava anti duplo-envio, confirmação, fluxo).

| Peça | Responsabilidade |
|---|---|
| `utils/backup.ts` | Regras puras: formato do backup, validação item a item (com motivo), mensagem final, CSV do Odoo (BOM, escape, anti-injeção de fórmula, números crus). |
| `utils/download.ts` | Baixar um conteúdo como arquivo pelo navegador. |
| `services/backupRestore.ts` | Ler o arquivo e enviar ao Firestore em blocos de 50 com relatório de falha parcial; restaurar os checks (com merge). |

**Restauração que preserva os dados** (corrigido): o `createdAt` original do backup é mantido
(`parseBackupCreatedAt` converte o Timestamp serializado de volta; sem data válida usa a hora do
servidor), e `setDoc` usa `merge`. Antes, a restauração regravava `createdAt` com a hora atual —
o que reiniciava a janela de 24h em que um lançamento pode ser excluído sem senha de admin
(`canDelete`) — e substituía o documento inteiro, perdendo campos acrescentados depois do backup.
Os dados de exclusão (`deletedAt`, `deleteReason`, `deletedBy`) são zerados, como em "desfazer
exclusão" do app. Restaurar continua trazendo de volta lançamentos excluídos depois do backup
(`deleted: false`), por ser uma restauração ao estado do arquivo.

Guiada por 39 testes de caracterização + 72 unitários. As proteções críticas
(idempotência por id, normalização de valor, anti-injeção de fórmula, trava de duplo
envio, confirmação) foram conferidas por quebra proposital.
