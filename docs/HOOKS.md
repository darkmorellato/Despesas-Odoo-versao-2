# Guia de Hooks - Despesas-Odoo

## Visão Geral

Este documento descreve todos os hooks customizados do sistema, suas APIs, funcionalidades e exemplos de uso.

## Hooks Implementados

### useAuth

**Descrição:** Hook para autenticação anônima do Firebase.

**Arquivo:** `src/hooks/useAuth.ts`

**API:**
```typescript
interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const useAuth = (): UseAuthReturn;
```

**Funcionalidades:**
- Login automático anônimo
- Persistência de sessão
- Logout
- Gerenciamento de loading e erros

**Exemplo de uso:**
```typescript
const { user, loading, error, login, logout } = useAuth();

useEffect(() => {
  login();
}, []);

if (loading) return <LoadingSpinner />;
if (error) return <Error message={error} />;
if (!user) return <LoginPrompt />;

return <App user={user} />;
```

**Implementação:**
```typescript
import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err) {
      setError('Falha no login');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setError('Falha no logout');
    }
  };

  return { user, loading, error, login, logout };
};
```

---

### useExpenses

**Descrição:** Hook para CRUD de despesas com sincronização Firebase.

**Arquivo:** `src/hooks/useExpenses.ts`

**API:**
```typescript
interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpenses: (filters?: ExpenseFilters) => Expense[];
}

const useExpenses = (): UseExpensesReturn;
```

**Funcionalidades:**
- Criar despesas
- Ler despesas
- Atualizar despesas
- Excluir despesas (com validação de 24h)
- Filtros por loja, categoria, data
- Ordenação
- Sincronização em tempo real

**Exemplo de uso:**
```typescript
const { 
  expenses, 
  loading, 
  addExpense, 
  updateExpense, 
  deleteExpense,
  getExpenses 
} = useExpenses();

// Adicionar despesa
await addExpense({
  description: 'Aluguel',
  amount: 1500,
  category: 'Aluguel',
  store: 'Piracicaba',
  date: '2024-01-15'
});

// Filtrar despesas
const filtered = getExpenses({
  store: 'Piracicaba',
  category: 'Aluguel',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// Atualizar despesa
await updateExpense(expenseId, { amount: 1600 });

// Excluir despesa
await deleteExpense(expenseId);
```

**Implementação:**
```typescript
import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Expense, ExpenseFilters } from '@/types';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      
      setExpenses(expensesData);
      setLoading(false);
    }, (err) => {
      setError('Erro ao carregar despesas');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'expenses'), {
        ...expense,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      setError('Erro ao adicionar despesa');
      throw err;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      await updateDoc(doc(db, 'expenses', id), updates);
    } catch (err) {
      setError('Erro ao atualizar despesa');
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    const timeDiff = Date.now() - new Date(expense.createdAt).getTime();
    if (timeDiff > 24 * 60 * 60 * 1000) {
      throw new Error('Só é possível excluir despesas nas primeiras 24h');
    }

    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      setError('Erro ao excluir despesa');
      throw err;
    }
  };

  const getExpenses = (filters?: ExpenseFilters): Expense[] => {
    let filtered = [...expenses];

    if (filters?.store) {
      filtered = filtered.filter(e => e.store === filters.store);
    }

    if (filters?.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(e => e.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(e => e.date <= filters.endDate!);
    }

    return filtered;
  };

  return { 
    expenses, 
    loading, 
    error, 
    addExpense, 
    updateExpense, 
    deleteExpense,
    getExpenses 
  };
};
```

---

### useCalendar

**Descrição:** Hook para navegação e gerenciamento de calendário.

**Arquivo:** `src/hooks/useCalendar.ts`

**API:**
```typescript
interface UseCalendarReturn {
  currentMonth: number;
  currentYear: number;
  selectedDate: Date | null;
  goToMonth: (month: number, year: number) => void;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  selectDate: (date: Date) => void;
  getDaysInMonth: (month: number, year: number) => Date[];
}

const useCalendar = (): UseCalendarReturn;
```

**Funcionalidades:**
- Navegação entre meses
- Seleção de datas
- Cálculo de dias do mês
- Formatação de datas

**Exemplo de uso:**
```typescript
const { 
  currentMonth, 
  currentYear, 
  selectedDate,
  goToNextMonth, 
  goToPreviousMonth,
  selectDate,
  getDaysInMonth
} = useCalendar();

// Navegar para próximo mês
goToNextMonth();

// Selecionar data
selectDate(new Date(2024, 0, 15));

// Obter dias do mês
const days = getDaysInMonth(currentMonth, currentYear);
```

**Implementação:**
```typescript
import { useState } from 'react';

export const useCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const goToMonth = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const getDaysInMonth = (month: number, year: number): Date[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Date[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  return {
    currentMonth,
    currentYear,
    selectedDate,
    goToMonth,
    goToNextMonth,
    goToPreviousMonth,
    selectDate,
    getDaysInMonth
  };
};
```

---

### useBackup

**Descrição:** Hook para backup e exportação de dados.

**Arquivo:** `src/hooks/useBackup.ts`

**API:**
```typescript
interface UseBackupReturn {
  exportJSON: (expenses: Expense[], fixedPayments: FixedNotification[]) => void;
  exportCSV: (expenses: Expense[]) => void;
  importBackup: (file: File) => Promise<BackupData>;
}

const useBackup = (): UseBackupReturn;
```

**Funcionalidades:**
- Exportação JSON
- Exportação CSV (compatível com Odoo)
- Importação de backup
- Validação de dados

**Exemplo de uso:**
```typescript
const { exportJSON, exportCSV, importBackup } = useBackup();

// Exportar JSON
exportJSON(expenses, fixedPayments);

// Exportar CSV
exportCSV(expenses);

// Importar backup
const handleFileUpload = async (file: File) => {
  try {
    const data = await importBackup(file);
    // Restaurar dados
  } catch (err) {
    console.error('Erro ao importar', err);
  }
};
```

**Implementação:**
```typescript
import type { Expense, FixedNotification, BackupData } from '@/types';

export const useBackup = () => {
  const exportJSON = (expenses: Expense[], fixedPayments: FixedNotification[]) => {
    const data: BackupData = {
      expenses,
      fixedPayments,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = (expenses: Expense[]) => {
    const headers = ['ID', 'Descrição', 'Valor', 'Categoria', 'Loja', 'Data', 'Criado em'];
    const rows = expenses.map(expense => [
      expense.id,
      expense.description,
      expense.amount.toFixed(2),
      expense.category,
      expense.store,
      expense.date,
      expense.createdAt
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despesas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File): Promise<BackupData> => {
    const text = await file.text();
    const data = JSON.parse(text) as BackupData;

    if (!data.expenses || !Array.isArray(data.expenses)) {
      throw new Error('Formato de backup inválido');
    }

    return data;
  };

  return { exportJSON, exportCSV, importBackup };
};
```

---

### useToast

**Descrição:** Hook para gerenciamento de notificações toast.

**Arquivo:** `src/hooks/useToast.ts`

**API:**
```typescript
interface UseToastReturn {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const useToast = (): UseToastReturn;
```

**Funcionalidades:**
- Adicionar notificações
- Remover notificações
- Auto-remoção após timeout
- Tipos: success, error, warning, info

**Exemplo de uso:**
```typescript
const { toasts, addToast, removeToast } = useToast();

// Adicionar toast
addToast('Despesa adicionada com sucesso!', 'success');
addToast('Erro ao salvar despesa', 'error');
addToast('Atenção: verifique os dados', 'warning');
addToast('Informação importante', 'info');

// Remover toast
removeToast(toastId);
```

**Implementação:**
```typescript
import { useState } from 'react';
import type { Toast, ToastType } from '@/types';

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type };

    setToasts(prev => [...prev, toast]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
};
```

---

### useFixedPayments

**Descrição:** Hook para gerenciamento de pagamentos fixos.

**Arquivo:** `src/hooks/useFixedPayments.ts`

**API:**
```typescript
interface UseFixedPaymentsReturn {
  fixedPayments: FixedNotification[];
  addFixedPayment: (payment: Omit<FixedNotification, 'id'>) => void;
  updateFixedPayment: (id: string, payment: Partial<FixedNotification>) => void;
  deleteFixedPayment: (id: string) => void;
  getPaymentsForDay: (day: number, month?: number) => FixedNotification[];
}

const useFixedPayments = (): UseFixedPaymentsReturn;
```

**Funcionalidades:**
- CRUD de pagamentos fixos
- Persistência em localStorage
- Validação de dias (5, 10, 15, 20, 25, 27)
- Filtro por dia e mês

**Exemplo de uso:**
```typescript
const { 
  fixedPayments, 
  addFixedPayment, 
  updateFixedPayment, 
  deleteFixedPayment,
  getPaymentsForDay
} = useFixedPayments();

// Adicionar pagamento fixo
addFixedPayment({
  day: 10,
  description: 'Aluguel'
});

// Atualizar pagamento
updateFixedPayment(paymentId, { description: 'Aluguel Premium' });

// Excluir pagamento
deleteFixedPayment(paymentId);

// Obter pagamentos do dia
const payments = getPaymentsForDay(10, 0); // 10 de janeiro
```

**Implementação:**
```typescript
import { useState, useEffect } from 'react';
import type { FixedNotification } from '@/types';
import { FIXED_NOTIFICATIONS_DEFAULT } from '@/config/constants';

const STORAGE_KEY = 'fixed_payments';

export const useFixedPayments = () => {
  const [fixedPayments, setFixedPayments] = useState<FixedNotification[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setFixedPayments(JSON.parse(stored));
    } else {
      setFixedPayments(FIXED_NOTIFICATIONS_DEFAULT);
    }
  }, []);

  const addFixedPayment = (payment: Omit<FixedNotification, 'id'>) => {
    const validDays = [5, 10, 15, 20, 25, 27];
    if (!validDays.includes(payment.day)) {
      throw new Error('Dia inválido. Use: 5, 10, 15, 20, 25 ou 27');
    }

    const newPayment: FixedNotification = {
      ...payment,
      id: Date.now().toString()
    };

    const updated = [...fixedPayments, newPayment];
    setFixedPayments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateFixedPayment = (id: string, updates: Partial<FixedNotification>) => {
    const updated = fixedPayments.map(payment =>
      payment.id === id ? { ...payment, ...updates } : payment
    );
    setFixedPayments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteFixedPayment = (id: string) => {
    const updated = fixedPayments.filter(payment => payment.id !== id);
    setFixedPayments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const getPaymentsForDay = (day: number, month?: number): FixedNotification[] => {
    let payments = fixedPayments.filter(payment => payment.day === day);

    if (month !== undefined) {
      payments = payments.filter(payment => 
        !payment.months || payment.months.includes(month)
      );
    }

    return payments;
  };

  return {
    fixedPayments,
    addFixedPayment,
    updateFixedPayment,
    deleteFixedPayment,
    getPaymentsForDay
  };
};
```

## Hooks Futuros

### useExpenseForm

**Descrição:** Hook para gerenciamento de formulário de despesas.

**Funcionalidades:**
- Validação de campos
- Formatação de dados
- Reset de formulário
- Erros de validação

### useExpenseFilters

**Descrição:** Hook para gerenciamento de filtros de despesas.

**Funcionalidades:**
- Filtros por loja, categoria, data
- Persistência de filtros
- Reset de filtros
- URL params

### useExpenseValidation

**Descrição:** Hook para validação de despesas.

**Funcionalidades:**
- Validação de campos obrigatórios
- Validação de valores
- Validação de datas
- Mensagens de erro

### useAnalytics

**Descrição:** Hook para cálculos de analytics.

**Funcionalidades:**
- Cálculo de totais
- Cálculo de médias
- Comparação entre períodos
- Agrupamento por categoria

### useTheme

**Descrição:** Hook para gerenciamento de tema.

**Funcionalidades:**
- Toggle de tema (claro/escuro)
- Persistência de tema
- Detecção de preferência do sistema

## Boas Práticas

### 1. Nomenclatura

Usar prefixo `use` para hooks:

```typescript
const useCustomHook = () => { ... };
```

### 2. Tipagem

Sempre definir interfaces para retorno:

```typescript
interface UseCustomHookReturn {
  value: string;
  setValue: (value: string) => void;
}

const useCustomHook = (): UseCustomHookReturn => { ... };
```

### 3. Cleanup

Sempre fazer cleanup em useEffect:

```typescript
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
}, []);
```

### 4. Error Handling

Tratar erros adequadamente:

```typescript
const doSomething = async () => {
  try {
    await operation();
  } catch (err) {
    setError('Erro ao realizar operação');
    throw err;
  }
};
```

### 5. Memoization

Usar useCallback e useMemo quando necessário:

```typescript
const callback = useCallback(() => {
  // lógica
}, [dependencies]);

const value = useMemo(() => {
  return expensiveCalculation();
}, [dependencies]);
```

## Próximos Passos

1. Implementar hooks futuros
2. Adicionar testes para todos os hooks
3. Otimizar performance
4. Adicionar documentação JSDoc
5. Criar hooks compostos

## Referências

- [React Hooks Documentation](https://react.dev/reference/react)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
