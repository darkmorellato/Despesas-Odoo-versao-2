export interface Expense {
  id: string;
  date: string;
  description: string;
  store: string;
  category: string;
  amount: number;
  quantity: number;
  notes?: string;
  employeeName: string;
  originalTotal?: number | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface ExpenseGroup {
  key: string;
  items: Expense[];
  total: number;
}

export type StoreName = 
  | "Dom Pedro II"
  | "Realme"
  | "Xv de Novembro"
  | "Premium"
  | "Kassouf"
  | "Piracicaba (DP - Realme - XV)"
  | "Amparo (Premium - Kassouf)"
  | "Todas";

export type CategoryName =
  | "Despesa Fixa"
  | "Despesa"
  | "Salário"
  | "Vale Alimentação"
  | "Vale Transporte"
  | "Vale (Adiantamento)"
  | "Despesa Jack"
  | "Impostos"
  | "Requisição";

export interface StoreSplit {
  s: StoreName;
  v: number;
}

export type GroupByMode = 'date' | 'store';
export type FilterMode = 'day' | 'month';
export type ViewMode = 'dashboard' | 'calendar' | 'analytics' | 'payments';
