import { useCallback, useMemo, useRef } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import { getTodayLocal, formatDateBR } from '@/shared/utils/formatters';
import { STORES_LIST } from '@/config/constants';
import type { Expense, CalendarCheck } from '@/shared/types';
import { addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

/**
 * Data structure for backup JSON files
 * @interface BackupData
 */
interface BackupData {
  /** Array of expenses to backup */
  data: Expense[];
  /** Calendar check state to backup */
  checks: CalendarCheck;
  /** Backup format version */
  version: number;
}

/**
 * Return type for useBackup hook
 * @interface UseBackupReturn
 */
interface UseBackupReturn {
  /** Save backup to local computer as JSON */
  saveToComputer: (expenses: Expense[], checks: CalendarCheck) => Promise<void>;
  /** Restore backup from file to Firebase */
  handleRestoreFile: (file: File, onProgress?: (msg: string) => void) => Promise<void>;
  /** Export expenses to CSV format (Odoo compatible) */
  exportToCSV: (dataToExport: Expense[], employeeName: string) => void;
}

// Formato de data YYYY-MM-DD (validação na restauração)
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida um item do backup. `amount` é normalizado para número — antes um
 * `"10"` string passava direto e contaminava todos os reduce/total com
 * concatenação ("010") em vez de soma.
 */
const validateBackupItem = (
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

/**
 * Escapa uma célula CSV e neutraliza injeção de fórmula: texto iniciado por
 * =, +, -, @, TAB ou CR executa no Excel/Google Sheets ao abrir o arquivo
 * (ex.: `=HYPERLINK(...)` exfiltra dados da planilha).
 * Números negativos legítimos (`-100`) são preservados como estão.
 */
const escapeCsvCell = (value: unknown): string => {
  let s = value === null || value === undefined ? '' : String(value);
  const isPlainNumber = /^-?\d+(?:[.,]\d+)?$/.test(s);
  if (!isPlainNumber && /^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Hook para gerenciar backup e restauração de dados
 *
 * Fornece funcionalidades de exportação em JSON (backup completo) e CSV
 * (compatível com Odoo), além de restauração para Firebase.
 *
 * A restauração é IDEMPOTENTE: preserva o id original de cada registro
 * (setDoc), então restaurar o mesmo arquivo 2x não duplica os dados.
 *
 * @returns Objeto com funções de backup e exportação
 */
export const useBackup = (): UseBackupReturn => {
  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);
  const isRestoringRef = useRef(false); // trava anti duplo-submissão

  const saveToComputer = useCallback(async (expenses: Expense[], checks: CalendarCheck) => {
    const backupData: BackupData = {
      data: expenses,
      checks,
      version: 3
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const fileName = `backup_completo_${formatDateBR(getTodayLocal()).replace(/\//g, '-')}.json`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Arquivo de Backup JSON',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
        return;
      } catch (err: unknown) {
        // Usuário cancelou o diálogo: encerra sem fallback e sem erro
        if (err instanceof Error && err.name === 'AbortError') return;
        // Erro real (permissão negada etc.): propaga em vez de cair
        // silenciosamente no download blob (confundia o usuário)
        throw err;
      }
    }

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleRestoreFile = useCallback(async (
    file: File,
    onProgress?: (msg: string) => void
  ): Promise<void> => {
    if (isRestoringRef.current) {
      throw new Error('Restauração já em andamento — aguarde.');
    }
    isRestoringRef.current = true;

    try {
      const importedData: BackupData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            resolve(JSON.parse(event.target?.result as string));
          } catch {
            reject(new Error('Arquivo JSON inválido.'));
          }
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsText(file);
      });

      if (!confirm("ATENÇÃO: Deseja enviar estes dados para a nuvem para que TODOS tenham acesso?")) {
        throw new Error("Cancelled by user");
      }

      const dataArray = importedData.data;
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("Arquivo sem dados válidos");
      }

      // Validação de schema item a item (data, descrição, loja e valor)
      const validItems: Expense[] = [];
      const skipped: Record<string, number> = {};
      for (const raw of dataArray) {
        const { item, reason } = validateBackupItem(raw);
        if (item) {
          validItems.push(item);
        } else if (reason) {
          skipped[reason] = (skipped[reason] || 0) + 1;
        }
      }
      if (validItems.length === 0) {
        throw new Error("Nenhum registro válido para importar");
      }

      // Envio em chunks com relatório de falha parcial: antes um Promise.all
      // puro rejeitava no meio (toast de erro) com metade já gravada — e a
      // nova tentativa duplicava a parte que deu certo.
      let imported = 0;
      let failed = 0;
      const CHUNK_SIZE = 50;
      for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
        const chunk = validItems.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map(item => {
            const { id, ...cleanItem } = item;
            if (id) {
              // IDEMPOTENTE: mesmo id do backup → re-restaurar sobrescreve
              // em vez de duplicar (bug antigo: addDoc gerava novo id sempre)
              return setDoc(doc(firebaseRefs.expensesRef, id), {
                ...cleanItem,
                deleted: false,
                createdAt: serverTimestamp()
              });
            }
            return addDoc(firebaseRefs.expensesRef, {
              ...cleanItem,
              deleted: false,
              createdAt: serverTimestamp()
            });
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') imported++;
          else failed++;
        }
        const sent = Math.min(i + CHUNK_SIZE, validItems.length);
        onProgress?.(`Enviando ${sent}/${validItems.length} registros...`);
      }

      // Restaurar checks
      if (importedData.checks && Object.keys(importedData.checks).length > 0) {
        await setDoc(firebaseRefs.checksRef, { checks: importedData.checks }, { merge: true });
      }

      const skippedTotal = Object.values(skipped).reduce((s, n) => s + n, 0);
      const parts = [`${imported} registros importados com sucesso!`];
      if (failed > 0) {
        parts.push(`${failed} falharam (a restauração é idempotente — execute novamente para reenviar os que faltaram).`);
      }
      if (skippedTotal > 0) {
        parts.push(`${skippedTotal} ignorados por dados inválidos (${Object.entries(skipped).map(([k, v]) => `${k}: ${v}`).join(', ')}).`);
      }
      const message = parts.join(' ');
      onProgress?.(message);

      if (imported === 0 && failed > 0) {
        throw new Error(`Todos os ${failed} registros falharam ao serem enviados.`);
      }
    } finally {
      isRestoringRef.current = false;
    }
  }, [firebaseRefs]);

  const exportToCSV = useCallback((dataToExport: Expense[], employeeName: string) => {
    if (!dataToExport || dataToExport.length === 0) return;

    const headers = [
      "date",
      "name",
      "store_name",
      "product_id",
      "unit_amount",
      "quantity",
      "description",
      "employee_id"
    ];

    const rows = dataToExport.map(ex => [
      formatDateBR(ex.date),
      ex.description,
      ex.store,
      ex.category,
      // Número cru para o import do Odoo (formatCurrency gerava "1.234,56")
      Number(ex.amount) || 0,
      Number(ex.quantity) || 0,
      ex.notes,
      ex.employeeName || employeeName
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(r => r.map(escapeCsvCell).join(';'))
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `despesas_odoo_${formatDateBR(getTodayLocal()).replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    saveToComputer,
    handleRestoreFile,
    exportToCSV
  };
};

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }
}
