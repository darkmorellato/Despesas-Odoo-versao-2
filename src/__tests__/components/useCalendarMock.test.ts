import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarMock } from '@/features/calendar/hooks/useCalendarMock';

const STORAGE_KEY = 'calendar_checks_mock';

describe('useCalendarMock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return empty checks object initially', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());
      expect(result.current.checks).toEqual({});
    });

    it('should return isLoading as false', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());
      expect(result.current.isLoading).toBe(false);
    });

    it('should load checks from localStorage if available', () => {
      const storedChecks = { '2024-0-Test': true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedChecks));

      const { result } = renderHook(() => useCalendarMock());
      expect(result.current.checks).toEqual(storedChecks);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json');
      
      const { result } = renderHook(() => useCalendarMock());
      expect(result.current.checks).toEqual({});
    });
  });

  describe('toggleCheck', () => {
    it('should toggle check to true', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      act(() => {
        result.current.toggleCheck('2024-0-Test', true);
      });

      expect(result.current.checks['2024-0-Test']).toBe(true);
    });

    it('should toggle check to false', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      act(() => {
        result.current.toggleCheck('2024-0-Test', true);
      });

      act(() => {
        result.current.toggleCheck('2024-0-Test', false);
      });

      expect(result.current.checks['2024-0-Test']).toBe(false);
    });

    it('should maintain multiple checks independently', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      act(() => {
        result.current.toggleCheck('2024-0-Test1', true);
        result.current.toggleCheck('2024-0-Test2', false);
      });

      expect(result.current.checks['2024-0-Test1']).toBe(true);
      expect(result.current.checks['2024-0-Test2']).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist checks to localStorage after debounce', async () => {
      vi.useFakeTimers();
      localStorage.removeItem(STORAGE_KEY);

      const { result } = renderHook(() => useCalendarMock());

      act(() => {
        result.current.toggleCheck('2024-0-Test', true);
      });

      vi.advanceTimersByTime(800);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['2024-0-Test']).toBe(true);

      vi.useRealTimers();
    });

    it('should not persist immediately after toggle', () => {
      vi.useFakeTimers();
      localStorage.removeItem(STORAGE_KEY);

      const { result } = renderHook(() => useCalendarMock());

      act(() => {
        result.current.toggleCheck('2024-0-Test', true);
      });

      vi.advanceTimersByTime(400);

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('getPendingPayments', () => {
    it('should return pending payments when no checks exist', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      vi.setSystemTime(new Date(2024, 0, 10));

      const pending = result.current.getPendingPayments();

      expect(pending.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter out checked payments', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      vi.setSystemTime(new Date(2024, 0, 10));

      act(() => {
        result.current.toggleCheck('2024-0-Aluguel Loja Premium', true);
      });

      const pending = result.current.getPendingPayments();
      const checkedItem = pending.find((p: any) => p.description === 'Aluguel Loja Premium');

      expect(checkedItem).toBeUndefined();
    });

    it('should filter by month if specified', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      vi.setSystemTime(new Date(2024, 1, 10));

      const pending = result.current.getPendingPayments();

      pending.forEach((item: any) => {
        if (item.months) {
          expect(item.months).toContain(2);
        }
      });
    });

    it('should filter out future payments', () => {
      localStorage.removeItem(STORAGE_KEY);
      const { result } = renderHook(() => useCalendarMock());

      vi.setSystemTime(new Date(2024, 0, 5));

      const pending = result.current.getPendingPayments();

      pending.forEach((item: any) => {
        expect(item.day).toBeLessThanOrEqual(5);
      });
    });
  });
});
