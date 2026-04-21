import { useCallback, useMemo } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import { getTodayLocal, formatDateBR, formatCurrency } from '@/shared/utils/formatters';
import type { Expense, CalendarCheck } from '@/shared/types';
import { addDoc, serverTimestamp, setDoc } from 'firebase/firestore';

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

/**
 * Hook para gerenciar backup e restauração de dados
 * 
 * Fornece funcionalidades de exportação em JSON (backup completo) e CSV
 * (compatível com Odoo), além de restauração para Firebase.
 * 
 * @returns Objeto com funções de backup e exportação
 * 
 * @example
 * ```tsx
 * const { saveToComputer, exportToCSV, handleRestoreFile } = useBackup();
 * 
 * // Salvar backup completo
 * await saveToComputer(expenses, checks);
 * 
 * // Exportar para Odoo
 * exportToCSV(filteredExpenses, 'João Silva');
 * 
 * // Restaurar de arquivo
 * await handleRestoreFile(file, (msg) => console.log(msg));
 * ```
 */
export const useBackup = (): UseBackupReturn => {
  const firebaseRefs = useMemo(() => getFirebaseRefs(), []);

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
        if (err instanceof Error && err.name === 'AbortError') return;
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const importedData: BackupData = JSON.parse(event.target?.result as string);

          if (!confirm("ATENÇÃO: Deseja enviar estes dados para a nuvem para que TODOS tenham acesso?")) {
            reject(new Error("Cancelled by user"));
            return;
          }

          const dataArray = importedData.data;
          if (!Array.isArray(dataArray) || dataArray.length === 0) {
            reject(new Error("Arquivo sem dados válidos"));
            return;
          }

          const validItems = dataArray.filter(item => {
            if (!item.date || !item.description || !item.store) {
              console.warn("Item inválido ignorado:", item);
              return false;
            }
            return true;
          });

          await Promise.all(
            validItems.map(item => {
              const { id, ...cleanItem } = item;
              return addDoc(firebaseRefs.expensesRef, {
                ...cleanItem,
                createdAt: serverTimestamp()
              });
            })
          );

          const count = validItems.length;

          // Restaurar checks
          if (importedData.checks && Object.keys(importedData.checks).length > 0) {
            await setDoc(firebaseRefs.checksRef, { checks: importedData.checks }, { merge: true });
          }

          onProgress?.(`${count} registros importados com sucesso!`);
          resolve();
        } catch (err) {
          console.error("Erro ao restaurar:", err);
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsText(file);
    });
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
      formatCurrency(ex.amount),
      ex.quantity,
      ex.notes,
      ex.employeeName || employeeName
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(r => r.map(f => `"${String(f || '').replace(/"/g, '""')}"`).join(';'))
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
    }) => Promise<any>;
  }
}
