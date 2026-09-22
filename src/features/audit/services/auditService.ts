import { db } from '@/config/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { AuditLogItem } from '../types';

const LOCAL_AUDIT_KEY = 'miplace_audit_logs_cache';
const PENDING_AUDIT_KEY = 'miplace_audit_pending_v1';
const MAX_ITEMS = 500;

// ID gerado UMA vez e reutilizado tanto no cache local quanto no Firestore
// (setDoc com o mesmo id) → local e remoto são o MESMO documento. Isso torna
// a mescla sem duplicatas e o retry idempotente (reenviar não duplica evento).
const makeAuditId = (): string =>
  `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const getAuditCollection = () =>
  collection(doc(db, 'miplace-despesas', 'data-team_data'), 'audit_logs_v1');

const readList = (key: string): AuditLogItem[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Cache corrompido (objeto em vez de array) não pode derrubar a UI
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeList = (key: string, list: AuditLogItem[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // storage cheio/indisponível — o evento ainda vai para o Firestore
  }
};

/** Cache local lido com segurança (Array.isArray). */
export const getCachedAuditLogs = (): AuditLogItem[] => readList(LOCAL_AUDIT_KEY);

/** Persiste a lista mesclada no cache local (usado pelo hook ao receber snapshot). */
export const saveCachedAuditLogs = (logs: AuditLogItem[]): void => writeList(LOCAL_AUDIT_KEY, logs);

// Escrita remota com id determinístico (mesmo documento do cache local)
const writeRemote = async (item: AuditLogItem): Promise<void> => {
  await setDoc(doc(getAuditCollection(), item.id), {
    actionType: item.actionType,
    actionDate: item.actionDate,
    userName: item.userName,
    userEmail: item.userEmail,
    expenseId: item.expenseId,
    reason: item.reason ?? null,
    previousData: item.previousData ?? null,
    newData: item.newData ?? null,
    createdAt: serverTimestamp(),
  });
};

export const logAuditEvent = async (
  logData: Omit<AuditLogItem, 'id' | 'createdAt'>
): Promise<void> => {
  const item: AuditLogItem = { ...logData, id: makeAuditId() };

  // 1) Cache local imediato — o evento fica visível mesmo offline
  const cached = readList(LOCAL_AUDIT_KEY);
  cached.unshift(item);
  writeList(LOCAL_AUDIT_KEY, cached);

  // 2) Firestore — em falha, entra na fila de reenvio (nunca perde o evento;
  //    antes o erro era só engolido com console.warn e o log se perdia)
  try {
    await writeRemote(item);
  } catch (error) {
    console.warn('Falha ao sincronizar log de auditoria; enfileirado para reenvio:', error);
    const pending = readList(PENDING_AUDIT_KEY);
    if (!pending.some(p => p.id === item.id)) {
      pending.unshift(item);
      writeList(PENDING_AUDIT_KEY, pending);
    }
  }
};

/**
 * Reenvia ao Firestore os logs que falharam anteriormente (fila local).
 * Idempotente: usa setDoc com o id determinístico, então reenviar é seguro.
 * @returns quantidade de eventos sincronizados com sucesso
 */
export const retryPendingAuditLogs = async (): Promise<number> => {
  const pending = readList(PENDING_AUDIT_KEY);
  if (pending.length === 0) return 0;

  const stillPending: AuditLogItem[] = [];
  let sent = 0;
  for (const item of pending) {
    try {
      await writeRemote(item);
      sent++;
    } catch {
      stillPending.push(item);
    }
  }
  writeList(PENDING_AUDIT_KEY, stillPending);
  return sent;
};
