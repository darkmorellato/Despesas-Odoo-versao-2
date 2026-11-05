export interface Expense {
  id: string;
  date: string;
  description: string;
  store: string;
  category: string;
  amount: number;
  quantity: number;
  notes?: string | undefined;
  employeeName: string;
  originalTotal?: number | null | undefined;
  /** Id comum das parcelas de um lançamento rateado entre lojas (ausente em lançamentos antigos/individuais) */
  groupId?: string | null | undefined;
  receiptUrl?: string | null | undefined; // Foto/anexo do comprovante ou nota fiscal
  deleted?: boolean | undefined; // Soft delete
  deletedAt?: string | null | undefined;
  deletedBy?: string | null | undefined;
  deleteReason?: string | null | undefined;
  editReason?: string | null | undefined;
  createdAt?: any;
  updatedAt?: any;
}

export interface ExpenseGroup {
  key: string;
  items: Expense[];
  total: number;
}

// Derivado de src/config/stores.ts (fonte única das lojas)
export type { StoreName } from '@/config/stores';
import type { StoreName } from '@/config/stores';

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
export type ViewMode = 'dashboard' | 'calendar' | 'analytics' | 'closing' | 'payments' | 'audit' | 'todo';
