import { getTodayLocal, formatDateBR } from '@/shared/utils/formatters';
import { STORES_LIST } from '@/config/constants';
import type { Expense, CalendarCheck } from '@/shared/types';

/**
 * Regras puras de backup (JSON), exportação CSV (Odoo) e validação na
 * restauração, sem React nem Firebase.
 */

/** Estrutura do arquivo de backup JSON */
export interface BackupData {
  /** Despesas do backup */
  data: Expense[];
  /** Estado do calendário (pagamentos marcados) */
  checks: CalendarCheck;
  /** Versão do formato */
  version: number;
}

/** Versão atual do formato de backup */
export const BACKUP_VERSION = 3;

/** Quantos registros a restauração envia por bloco */
export const RESTORE_CHUNK_SIZE = 50;

// Formato de data YYYY-MM-DD (validação na restauração)
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Conteúdo e nome do arquivo de backup ("backup_completo_DD-MM-AAAA.json") */
export const buildBackupFile = (expenses: Expense[], checks: CalendarCheck): { content: string; fileName: string } => {
  const backupData: BackupData = { data: expenses, checks, version: BACKUP_VERSION };
  return {
    content: JSON.stringify(backupData, null, 2),
    fileName: datedFileName('backup_completo', 'json'),
  };
};

/** Nome de arquivo com a data de hoje: `${prefixo}_DD-MM-AAAA.${extensão}` */
export const datedFileName = (prefix: string, extension: string): string =>
  `${prefix}_${formatDateBR(getTodayLocal()).replace(/\//g, '-')}.${extension}`;

/**
 * Valida um item do backup. `amount` é normalizado para número — antes um
 * `"10"` string passava direto e contaminava todos os reduce/total com
 * concatenação ("010") em vez de soma.
 */
export const validateBackupItem = (
  item: unknown
): { item: Expense | null; reason?: string } => {
  if (!item || typeof item !== 'object') return { item: null, reason: 'objeto' };
  const it = item as Partial<Expense>;

  if (typeof it.date !== 'string' || !ISO_DATE_RE.test(it.date)) {
    return { item: null, reason: 'data' };
  }
  if (typeof it.description !== 'string' || !it.description.trim()) {
    return { item: null, reason: 'descrição' };
  }
  if (typeof it.store !== 'string' || !it.store) {
    return { item: null, reason: 'loja' };
  }
  if (!(STORES_LIST as string[]).includes(it.store)) {
    return { item: null, reason: 'loja inválida' };
  }

  const amount = Number(it.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { item: null, reason: 'valor' };
  }

  return {
    item: {
      ...(it as Expense),
      amount,
      quantity: Number(it.quantity) || 1,
      deleted: false, // restauração não recria itens já excluídos
    } as Expense,
  };
};

/** Separa os itens válidos dos descartados, contando os motivos dos descartes */
export const partitionBackupItems = (items: unknown[]): { validItems: Expense[]; skipped: Record<string, number> } => {
  const validItems: Expense[] = [];
  const skipped: Record<string, number> = {};
  for (const raw of items) {
    const { item, reason } = validateBackupItem(raw);
    if (item) {
      validItems.push(item);
    } else if (reason) {
      skipped[reason] = (skipped[reason] || 0) + 1;
    }
  }
  return { validItems, skipped };
};

/** Mensagem final da restauração (importados, falhas e descartados com motivo) */
export const summarizeRestore = (result: { imported: number; failed: number; skipped: Record<string, number> }): string => {
  const { imported, failed, skipped } = result;
  const skippedTotal = Object.values(skipped).reduce((s, n) => s + n, 0);
  const parts = [`${imported} registros importados com sucesso!`];
  if (failed > 0) {
    parts.push(`${failed} falharam (a restauração é idempotente — execute novamente para reenviar os que faltaram).`);
  }
  if (skippedTotal > 0) {
    parts.push(`${skippedTotal} ignorados por dados inválidos (${Object.entries(skipped).map(([k, v]) => `${k}: ${v}`).join(', ')}).`);
  }
  return parts.join(' ');
};

/**
 * Escapa uma célula CSV e neutraliza injeção de fórmula: texto iniciado por
 * =, +, -, @, TAB ou CR executa no Excel/Google Sheets ao abrir o arquivo
 * (ex.: `=HYPERLINK(...)` exfiltra dados da planilha).
 * Números negativos legítimos (`-100`) são preservados como estão.
 */
export const escapeCsvCell = (value: unknown): string => {
  let s = value === null || value === undefined ? '' : String(value);
  const isPlainNumber = /^-?\d+(?:[.,]\d+)?$/.test(s);
  if (!isPlainNumber && /^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
};

const CSV_HEADERS = [
  'date',
  'name',
  'store_name',
  'product_id',
  'unit_amount',
  'quantity',
  'description',
  'employee_id',
];

/**
 * CSV no formato de importação do Odoo (separador ";", BOM UTF-8 para o Excel
 * reconhecer acentos, valores numéricos crus como "1234.5").
 */
export const buildCsv = (expenses: Expense[], defaultEmployeeName: string): string => {
  const rows = expenses.map(ex => [
    formatDateBR(ex.date),
    ex.description,
    ex.store,
    ex.category,
    // Número cru para o import do Odoo (formatCurrency gerava "1.234,56")
    Number(ex.amount) || 0,
    Number(ex.quantity) || 0,
    ex.notes,
    ex.employeeName || defaultEmployeeName,
  ]);

  return '﻿' + [
    CSV_HEADERS.join(';'),
    ...rows.map(r => r.map(escapeCsvCell).join(';')),
  ].join('\n');
};
