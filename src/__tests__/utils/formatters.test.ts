import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDateBR, formatMonthBR, getTodayLocal } from '@/shared/utils/formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive integers correctly', () => {
      expect(formatCurrency(1000)).toBe('1.000,00');
      expect(formatCurrency(100)).toBe('100,00');
      expect(formatCurrency(1)).toBe('1,00');
    });

    it('should format decimal numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('1.234,56');
      expect(formatCurrency(0.5)).toBe('0,50');
      expect(formatCurrency(99.99)).toBe('99,99');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('0,00');
    });

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-100)).toBe('-100,00');
      expect(formatCurrency(-1234.56)).toBe('-1.234,56');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('1.000.000,00');
      expect(formatCurrency(1234567.89)).toBe('1.234.567,89');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(123.456)).toBe('123,46');
      expect(formatCurrency(123.454)).toBe('123,45');
    });
  });

  describe('formatDateBR', () => {
    it('should format date from YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(formatDateBR('2024-01-15')).toBe('15/01/2024');
      expect(formatDateBR('2024-12-31')).toBe('31/12/2024');
      expect(formatDateBR('2023-06-20')).toBe('20/06/2023');
    });

    it('should return empty string for empty input', () => {
      expect(formatDateBR('')).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatDateBR(null as any)).toBe('');
      expect(formatDateBR(undefined as any)).toBe('');
    });

    it('should handle single digit day and month', () => {
      expect(formatDateBR('2024-01-05')).toBe('05/01/2024');
      expect(formatDateBR('2024-09-01')).toBe('01/09/2024');
    });
  });

  describe('formatMonthBR', () => {
    it('should format year-month to Month Year in Portuguese', () => {
      expect(formatMonthBR('2024-01')).toBe('Janeiro 2024');
      expect(formatMonthBR('2024-02')).toBe('Fevereiro 2024');
      expect(formatMonthBR('2024-12')).toBe('Dezembro 2024');
    });

    it('should return empty string for empty input', () => {
      expect(formatMonthBR('')).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatMonthBR(null as any)).toBe('');
      expect(formatMonthBR(undefined as any)).toBe('');
    });

    it('should capitalize month name', () => {
      const result = formatMonthBR('2024-03');
      expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
      expect(result).toBe('Março 2024');
    });

    it('should handle all months', () => {
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      months.forEach((month, index) => {
        const monthNum = String(index + 1).padStart(2, '0');
        expect(formatMonthBR(`2024-${monthNum}`)).toBe(`${month} 2024`);
      });
    });
  });

  describe('getTodayLocal', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getTodayLocal();
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      expect(regex.test(result)).toBe(true);
    });

    it('should return current date', () => {
      const result = getTodayLocal();
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      expect(result).toBe(`${year}-${month}-${day}`);
    });
  });
});
