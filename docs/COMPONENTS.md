# Guia de Componentes - Despesas-Odoo

## Visão Geral

Este documento descreve todos os componentes do sistema, suas props, funcionalidades e exemplos de uso.

## Componentes Principais

### App.tsx

**Descrição:** Componente raiz da aplicação que gerencia todos os estados e funcionalidades.

**Estado:**
- `expenses` - Lista de despesas
- `fixedPayments` - Lista de pagamentos fixos
- `showAnalytics` - Visibilidade do dashboard
- `showCalendar` - Visibilidade do calendário
- `showFixedPayments` - Visibilidade do gerenciador de pagamentos fixos
- `showBackup` - Visibilidade do backup
- `showSettings` - Visibilidade das configurações
- `editingExpense` - Despesa sendo editada
- `filterStore` - Filtro por loja
- `filterCategory` - Filtro por categoria
- `filterStartDate` - Data inicial do filtro
- `filterEndDate` - Data final do filtro
- `currentMonth` - Mês atual do calendário
- `currentYear` - Ano atual do calendário
- `selectedDate` - Data selecionada no calendário
- `showAddForm` - Visibilidade do formulário de adição
- `adminPassword` - Senha do administrador
- `showPasswordModal` - Visibilidade do modal de senha
- `passwordInput` - Input da senha
- `correctionMode` - Modo de correção
- `correctionDate` - Data da correção
- `correctionDescription` - Descrição da correção
- `correctionAmount` - Valor da correção

**Funcionalidades:**
- Dashboard com analytics
- CRUD de despesas
- Calendário de pagamentos
- Gerenciador de pagamentos fixos
- Backup e exportação
- Configurações
- Filtros avançados

**Hooks utilizados:**
- `useAuth`
- `useExpenses`
- `useCalendar`
- `useBackup`
- `useToast`
- `useFixedPayments`

**Tamanho:** 1003 linhas (a ser refatorado)

---

### ExpenseAnalytics.tsx

**Descrição:** Dashboard com gráficos e analytics de despesas.

**Props:**
```typescript
interface Props {
  expenses: Expense[];
  filterStore?: string;
  filterCategory?: string;
  filterStartDate?: string;
  filterEndDate?: string;
}
```

**Funcionalidades:**
- Gráfico de despesas mensais
- Gráfico de despesas anuais
- Cálculo de totais
- Cálculo de médias
- Filtros por loja e categoria
- Comparação entre períodos

**Tamanho:** 583 linhas (a ser refatorado)

**Exemplo de uso:**
```tsx
<ExpenseAnalytics
  expenses={expenses}
  filterStore="Piracicaba"
  filterCategory="Alimentação"
/>
```

---

### FixedPaymentsManager.tsx

**Descrição:** Gerenciador de pagamentos fixos com CRUD completo.

**Props:**
```typescript
interface Props {
  fixedPayments: FixedNotification[];
  onAdd: (payment: FixedNotification) => void;
  onUpdate: (id: string, payment: FixedNotification) => void;
  onDelete: (id: string) => void;
}
```

**Funcionalidades:**
- Adicionar pagamentos fixos
- Editar pagamentos fixos
- Excluir pagamentos fixos
- Validação de dias (5, 10, 15, 20, 25, 27)
- Persistência em localStorage
- Alertas de pagamentos pendentes

**Tamanho:** 496 linhas (a ser refatorado)

**Exemplo de uso:**
```tsx
<FixedPaymentsManager
  fixedPayments={fixedPayments}
  onAdd={handleAddPayment}
  onUpdate={handleUpdatePayment}
  onDelete={handleDeletePayment}
/>
```

---

### ExpenseCalendar.tsx

**Descrição:** Calendário interativo para visualização de pagamentos.

**Props:**
```typescript
interface Props {
  currentMonth: number;
  currentYear: number;
  selectedDate: Date | null;
  expenses: Expense[];
  fixedPayments: FixedNotification[];
  onMonthChange: (month: number, year: number) => void;
  onDateSelect: (date: Date) => void;
}
```

**Funcionalidades:**
- Visualização mensal
- Navegação entre meses
- Seleção de datas
- Destaque de dias com pagamentos
- Correções com senha admin

**Tamanho:** 478 linhas (a ser refatorado)

**Exemplo de uso:**
```tsx
<ExpenseCalendar
  currentMonth={currentMonth}
  currentYear={currentYear}
  selectedDate={selectedDate}
  expenses={expenses}
  fixedPayments={fixedPayments}
  onMonthChange={handleMonthChange}
  onDateSelect={handleDateSelect}
/>
```

## Componentes UI

### DateInput.tsx

**Descrição:** Input de data com formatação automática.

**Props:**
```typescript
interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}
```

**Funcionalidades:**
- Formatação automática (DD/MM/YYYY)
- Validação de data
- Máscara de input

**Exemplo de uso:**
```tsx
<DateInput
  value={date}
  onChange={setDate}
  placeholder="DD/MM/YYYY"
/>
```

---

### ToastContainer.tsx

**Descrição:** Container de notificações toast com animações.

**Props:**
```typescript
interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}
```

**Funcionalidades:**
- Exibição de notificações
- Animações de entrada/saída
- Auto-remoção após timeout
- Tipos: success, error, warning, info

**Exemplo de uso:**
```tsx
<ToastContainer
  toasts={toasts}
  onRemove={removeToast}
/>
```

---

### PendingPaymentsAlert.tsx

**Descrição:** Alerta de pagamentos pendentes do dia.

**Props:**
```typescript
interface Props {
  count: number;
  onDismiss: () => void;
}
```

**Funcionalidades:**
- Exibição de contagem
- Botão de dismiss
- Animação de entrada

**Exemplo de uso:**
```tsx
<PendingPaymentsAlert
  count={pendingCount}
  onDismiss={handleDismiss}
/>
```

---

### LoadingSpinner.tsx

**Descrição:** Spinner de carregamento.

**Props:**
```typescript
interface Props {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}
```

**Funcionalidades:**
- Tamanhos variados
- Animação de rotação
- Customização via className

**Exemplo de uso:**
```tsx
<LoadingSpinner size="large" />
```

## Componentes de Ícones

### Icon.tsx

**Descrição:** Componente base para ícones.

**Props:**
```typescript
interface Props {
  name: string;
  size?: number;
  className?: string;
}
```

**Funcionalidades:**
- Renderização de ícones SVG
- Tamanho customizável
- Classes CSS customizáveis

**Exemplo de uso:**
```tsx
<Icon name="home" size={24} />
```

---

### Icons.tsx

**Descrição:** Coleção de ícones simples.

**Ícones disponíveis:**
- `home` - Ícone de casa
- `calendar` - Ícone de calendário
- `chart` - Ícone de gráfico
- `settings` - Ícone de configurações
- `floppy` - Ícone de disquete
- `fast-forward` - Ícone de avanço rápido
- `wallet` - Ícone de carteira
- `payments` - Ícone de pagamentos

**Exemplo de uso:**
```tsx
<Icons.home size={24} />
<Icons.calendar size={24} />
```

---

### Ícones 3D

**Descrição:** Ícones com efeito 3D.

**Componentes:**
- `CalendarIcon3D.tsx` - Calendário 3D
- `ChartIcon3D.tsx` - Gráfico 3D
- `FastForwardIcon3D.tsx` - Avanço rápido 3D
- `FloppyDiskIcon3D.tsx` - Disquete 3D
- `HomeIcon3D.tsx` - Casa 3D
- `PaymentsIcon3D.tsx` - Pagamentos 3D
- `SettingsIcon3D.tsx` - Configurações 3D
- `WalletIcon3D.tsx` - Carteira 3D

**Exemplo de uso:**
```tsx
<HomeIcon3D size={32} />
<CalendarIcon3D size={32} />
```

## Boas Práticas

### 1. Props Typing

Sempre definir interfaces para props:

```typescript
interface Props {
  prop1: string;
  prop2?: number; // opcional
  onAction: () => void;
}

export const Component = ({ prop1, prop2, onAction }: Props) => {
  return <div>{/* JSX */}</div>;
};
```

### 2. Default Props

Usar valores padrão para props opcionais:

```typescript
export const Component = ({ 
  size = 'medium',
  className = ''
}: Props) => {
  return <div className={className}>{/* JSX */}</div>;
};
```

### 3. Event Handlers

Usar useCallback para handlers:

```typescript
const handleClick = useCallback(() => {
  // lógica
}, [dependencies]);
```

### 4. Conditional Rendering

Usar renderização condicional clara:

```typescript
{condition && <Component />}

{condition ? <ComponentA /> : <ComponentB />}

{condition && <ComponentA /> || <ComponentB />}
```

### 5. Lists

Usar map com key:

```typescript
{items.map((item) => (
  <Item key={item.id} data={item} />
))}
```

## Próximos Passos

1. Refatorar App.tsx em componentes menores
2. Criar componentes reutilizáveis (Cards, Modals, Forms)
3. Adicionar Storybook para documentação visual
4. Implementar testes para todos os componentes
5. Otimizar performance com React.memo

## Referências

- [React Components Documentation](https://react.dev/learn/understanding-your-ui-as-a-tree)
- [TypeScript React Props](https://www.typescriptlang.org/docs/handbook/jsx-basic.html)
