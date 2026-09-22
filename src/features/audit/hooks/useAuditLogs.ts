import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { AuditActionType, AuditLogItem } from '../types';
import {
  getCachedAuditLogs,
  saveCachedAuditLogs,
  retryPendingAuditLogs,
} from '../services/auditService';

const VALID_ACTIONS: readonly string[] = ['EDIT', 'DELETE', 'RESTORE'];

/** Converte um doc do snapshot em AuditLogItem, validando o formato. */
const mapSnapshotDoc = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): AuditLogItem | null => {
  const data = docSnap.data();
  // Só entra o que tem tipo válido — lixo/outros formatos são ignorados
  if (!data || !VALID_ACTIONS.includes(String(data.actionType))) return null;
  return {
    id: docSnap.id,
    actionType: data.actionType as AuditActionType,
    actionDate: data.actionDate ?? '',
    userName: data.userName ?? '',
    userEmail: data.userEmail ?? '',
    expenseId: data.expenseId ?? '',
    // `reason` (justificativa) antes não era mapeado — sumia da UI no snapshot
    reason: data.reason ?? undefined,
    previousData: data.previousData,
    newData: data.newData ?? undefined,
    createdAt: data.createdAt,
  };
};

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => getCachedAuditLogs());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Reenvia eventos que falharam anteriormente (best-effort, idempotente)
    retryPendingAuditLogs().catch(() => {});

    try {
      const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
      const auditColl = collection(dataDoc, 'audit_logs_v1');
      const q = query(auditColl, orderBy('actionDate', 'desc'), limit(100));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const serverLogs = snapshot.docs
            .map(mapSnapshotDoc)
            .filter((l): l is AuditLogItem => l !== null);

          // Mescla o cache local: eventos ainda não confirmados pelo servidor
          // (ids determinísticos ⇒ os mesmos documentos não duplicam)
          const cacheLogs = getCachedAuditLogs();
          const serverIds = new Set(serverLogs.map(l => l.id));
          const localOnly = cacheLogs.filter(l => !serverIds.has(l.id));
          const merged = [...serverLogs, ...localOnly].sort((a, b) =>
            (b.actionDate || '').localeCompare(a.actionDate || '')
          );

          setLogs(merged);
          // Atualiza o cache A PARTIR do servidor (antes o cache nunca
          // recebia os dados remotos e o fallback ficava obsoleto para sempre)
          if (serverLogs.length > 0) saveCachedAuditLogs(merged);
          setIsLoading(false);
        },
        (error) => {
          console.warn('Aviso: Falha na escuta do Firestore para auditoria, usando cache local:', error);
          setLogs(getCachedAuditLogs());
          setIsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Erro ao inicializar listener de auditoria:', e);
      setLogs(getCachedAuditLogs());
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { logs, isLoading };
};
