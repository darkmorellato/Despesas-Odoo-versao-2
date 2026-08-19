import { db } from '@/config/firebase';
import { collection, doc, addDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import type { AuditLogItem } from '../types';

const LOCAL_AUDIT_KEY = 'miplace_audit_logs_cache';

export const logAuditEvent = async (
  logData: Omit<AuditLogItem, 'id' | 'createdAt'>
): Promise<void> => {
  const localItem: AuditLogItem = {
    ...logData,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  // Salva no cache local imediatamente
  try {
    const cached = localStorage.getItem(LOCAL_AUDIT_KEY);
    const list: AuditLogItem[] = cached ? JSON.parse(cached) : [];
    list.unshift(localItem);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(list.slice(0, 500)));
  } catch (e) {
    console.warn('Erro ao salvar auditoria local:', e);
  }

  // Persiste no banco de dados Firestore
  try {
    const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
    const auditColl = collection(dataDoc, 'audit_logs_v1');
    await addDoc(auditColl, {
      ...logData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Aviso: Falha ao sincronizar log de auditoria no Firestore imediatamente:', error);
  }
};

export const getCachedAuditLogs = (): AuditLogItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
