import { useState, useEffect, useRef, useCallback } from 'react';
import { getFixedPayments } from '@/features/fixed-payments/hooks/useFixedPayments';
import type { CalendarCheck, FixedNotification } from '@/shared/types';

const STORAGE_KEY = 'calendar_checks_mock';
const DEBOUNCE_MS = 800;

interface UseCalendarMockReturn {
  checks: CalendarCheck;
  isLoading: boolean;
  toggleCheck: (key: string, status: boolean) => void;
  getPendingPayments: () => FixedNotification[];
}

export const useCalendarMock = (): UseCalendarMockReturn => {
  const [checks, setChecks] = useState<CalendarCheck>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const lastLocalUpdate = useRef(0);
  const isInitialized = useRef(false);

  useEffect(() => {
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;

    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [checks]);

  const toggleCheck = useCallback((key: string, status: boolean) => {
    lastLocalUpdate.current = Date.now();
    setChecks(prev => ({ ...prev, [key]: status }));
  }, []);

  const getPendingPayments = useCallback(() => {
    const FIXED_NOTIFICATIONS = getFixedPayments();
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return FIXED_NOTIFICATIONS.filter(task => {
      if (task.months && !task.months.includes(currentMonth + 1)) return false;
      if (task.day > currentDay) return false;
      const key = `${currentYear}-${currentMonth}-${task.description}`;
      return !checks[key];
    });
  }, [checks]);

  return {
    checks,
    isLoading,
    toggleCheck,
    getPendingPayments
  };
};
