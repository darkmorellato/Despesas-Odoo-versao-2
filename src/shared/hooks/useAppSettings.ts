import { useState, useEffect, useRef } from 'react';
import { CATEGORIES_LIST } from '@/config/constants';
import type { Settings } from '@/shared/types';

const STORAGE_KEY = 'odoo_fast_settings';

export const DEFAULT_APP_SETTINGS: Settings = {
  employeeName: 'Seu Nome',
  currency: 'R$',
  categories: CATEGORIES_LIST.map(cat => ({ label: cat, odooRef: cat }))
};

/**
 * Configurações do app persistidas no navegador (localStorage).
 * O nome do funcionário assume o nome do usuário logado quando ainda não foi
 * configurado.
 */
export const useAppSettings = (sessionUserName: string | null) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_APP_SETTINGS);

  // Evita sobrescrever o localStorage com settings padrão antes do carregamento
  // (um JSON corrompido seria destruído silenciosamente pelo efeito de save).
  const loadedRef = useRef(false);

  // Carrega do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsed.categories = CATEGORIES_LIST.map(cat => ({ label: cat, odooRef: cat }));
          if (sessionUserName && (!parsed.employeeName || parsed.employeeName === 'Seu Nome')) {
            parsed.employeeName = sessionUserName;
          }
          setSettings(parsed);
        }
      } catch (e) {
        // Preserva o valor corrompido em cópia de segurança antes de qualquer save
        console.warn('Erro ao parsear settings:', e);
        try {
          localStorage.setItem(`${STORAGE_KEY}_corrupt_backup`, saved);
        } catch { /* storage cheio — ignora */ }
      }
    } else if (sessionUserName) {
      setSettings(prev => ({ ...prev, employeeName: sessionUserName }));
    }
    loadedRef.current = true;
  }, [sessionUserName]);

  // Salva (pula a 1ª execução — só persiste após o load)
  useEffect(() => {
    if (!loadedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Sincroniza o nome do usuário logado com o do funcionário
  useEffect(() => {
    if (sessionUserName && (settings.employeeName === 'Seu Nome' || !settings.employeeName)) {
      setSettings(prev => ({ ...prev, employeeName: sessionUserName }));
    }
  }, [sessionUserName, settings.employeeName]);

  return { settings, setSettings };
};
