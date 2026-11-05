import { useCallback, useMemo, useRef } from 'react';
import { getFirebaseRefs } from '@/config/firebase';
import type { Expense, CalendarCheck } from '@/shared/types';
import {
  buildBackupFile,
  buildCsv,
  datedFileName,
  partitionBackupItems,
  summarizeRestore,
} from '@/shared/utils/backup';
import { downloadTextFile } from '@/shared/utils/download';
import { readBackupFile, restoreChecks, uploadExpenses } from '@/shared/services/backupRestore';

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
 * (compatível com Odoo), além de restauração para Firebase. As regras de
 * formato e validação estão em `utils/backup`; o envio ao Firestore em
 * `services/backupRestore`.
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
    const { content, fileName } = buildBackupFile(expenses, checks);

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
        await writable.write(content);
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

    downloadTextFile(content, fileName, 'application/json');
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
      const importedData = await readBackupFile(file);

      if (!confirm("ATENÇÃO: Deseja enviar estes dados para a nuvem para que TODOS tenham acesso?")) {
        throw new Error("Cancelled by user");
      }

      const dataArray = importedData.data;
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("Arquivo sem dados válidos");
      }

      // Validação de schema item a item (data, descrição, loja e valor)
      const { validItems, skipped } = partitionBackupItems(dataArray);
      if (validItems.length === 0) {
        throw new Error("Nenhum registro válido para importar");
      }

      const { imported, failed } = await uploadExpenses(validItems, firebaseRefs.expensesRef, onProgress);

      await restoreChecks(importedData.checks, firebaseRefs.checksRef);

      onProgress?.(summarizeRestore({ imported, failed, skipped }));

      if (imported === 0 && failed > 0) {
        throw new Error(`Todos os ${failed} registros falharam ao serem enviados.`);
      }
    } finally {
      isRestoringRef.current = false;
    }
  }, [firebaseRefs]);

  const exportToCSV = useCallback((dataToExport: Expense[], employeeName: string) => {
    if (!dataToExport || dataToExport.length === 0) return;

    downloadTextFile(
      buildCsv(dataToExport, employeeName),
      datedFileName('despesas_odoo', 'csv'),
      'text/csv;charset=utf-8;'
    );
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
