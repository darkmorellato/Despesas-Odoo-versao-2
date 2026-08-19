import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { AuditLogItem } from '../types';
import { getCachedAuditLogs } from '../services/auditService';

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => getCachedAuditLogs());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
      const auditColl = collection(dataDoc, 'audit_logs_v1');
      const q = query(auditColl, orderBy('actionDate', 'desc'));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedLogs: AuditLogItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedLogs.push({
              id: docSnap.id,
              actionType: data.actionType,
              actionDate: data.actionDate,
              userName: data.userName,
              userEmail: data.userEmail,
              expenseId: data.expenseId,
              previousData: data.previousData,
              newData: data.newData,
              createdAt: data.createdAt,
            });
          });

          if (fetchedLogs.length > 0) {
            setLogs(fetchedLogs);
          } else {
            setLogs(getCachedAuditLogs());
          }
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
