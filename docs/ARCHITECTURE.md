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
- **Todas:** Divide em 5

### 2. Exclusão de Despesas

- Permitida apenas em 24h após criação
- Verificação: `Date.now() - new Date(expense.createdAt).getTime() < 24 * 60 * 60 * 1000`

### 3. Correções no Calendário

- Requer senha de administrador
- Senha configurada em `VITE_ADMIN_PASSWORD`

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
