import { addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import type { CollectionReference, DocumentData, DocumentReference } from 'firebase/firestore';
import type { Expense, CalendarCheck } from '@/shared/types';
import { RESTORE_CHUNK_SIZE, type BackupData } from '../utils/backup';

/** Lê o arquivo de backup e devolve o JSON; erro claro se o arquivo não for JSON */
export const readBackupFile = (file: File): Promise<BackupData> =>
  new Promise((resolve, reject) => {
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

/**
 * Envia as despesas em blocos, com relatório de falha parcial: antes um
 * Promise.all puro rejeitava no meio (toast de erro) com metade já gravada — e a
 * nova tentativa duplicava a parte que deu certo.
 *
 * Com id: grava no MESMO id (idempotente — restaurar o mesmo arquivo 2x não
 * duplica). Sem id: cria documento novo.
 *
 * Atenção (comportamento histórico preservado): `createdAt` é regravado com a hora
 * do servidor e `setDoc` sem `merge` substitui o documento inteiro.
 */
export const uploadExpenses = async (
  items: Expense[],
  expensesRef: CollectionReference<DocumentData>,
  onProgress?: (msg: string) => void
): Promise<{ imported: number; failed: number }> => {
  let imported = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += RESTORE_CHUNK_SIZE) {
    const chunk = items.slice(i, i + RESTORE_CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(item => {
        const { id, ...cleanItem } = item;
        if (id) {
          // IDEMPOTENTE: mesmo id do backup → re-restaurar sobrescreve
          // em vez de duplicar (bug antigo: addDoc gerava novo id sempre)
          return setDoc(doc(expensesRef, id), {
            ...cleanItem,
            deleted: false,
            createdAt: serverTimestamp()
          });
        }
        return addDoc(expensesRef, {
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
    const sent = Math.min(i + RESTORE_CHUNK_SIZE, items.length);
    onProgress?.(`Enviando ${sent}/${items.length} registros...`);
  }
  return { imported, failed };
};

/** Restaura o estado do calendário (mescla com o existente); não faz nada se vazio */
export const restoreChecks = async (
  checks: CalendarCheck | undefined,
  checksRef: DocumentReference<DocumentData>
): Promise<void> => {
  if (checks && Object.keys(checks).length > 0) {
    await setDoc(checksRef, { checks }, { merge: true });
  }
};
