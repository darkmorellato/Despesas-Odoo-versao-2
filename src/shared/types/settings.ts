import { CategoryName } from './expense';

export interface Category {
  label: CategoryName;
  odooRef: string;
}

export interface Settings {
  employeeName: string;
  currency: string;
  categories: Category[];
}

export const DEFAULT_SETTINGS: Settings = {
  employeeName: "Seu Nome",
  currency: "R$",
  categories: [] as Category[],
};

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';
