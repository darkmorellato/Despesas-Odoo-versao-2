import { describe, it, expect } from 'vitest';
import { getStoreColorClass, getStoreBarColor, getStoreOrder } from '@/shared/utils/helpers';

describe('helpers', () => {
  describe('getStoreColorClass', () => {
    it('should return correct class for Dom Pedro II', () => {
      expect(getStoreColorClass('Dom Pedro II')).toBe('bg-blue-50/50 text-blue-600 border-blue-200 shadow-sm');
    });

    it('should return correct class for Realme', () => {
      expect(getStoreColorClass('Realme')).toBe('bg-yellow-50/50 text-yellow-600 border-yellow-200 shadow-sm');
    });

    it('should return correct class for Xv de Novembro', () => {
      expect(getStoreColorClass('Xv de Novembro')).toBe('bg-slate-50/50 text-slate-600 border-slate-200 shadow-sm');
    });

    it('should return correct class for Premium', () => {
      expect(getStoreColorClass('Premium')).toBe('bg-fuchsia-50/50 text-fuchsia-600 border-fuchsia-200 shadow-sm');
    });

    it('should return correct class for Amparo', () => {
      expect(getStoreColorClass('Amparo')).toBe('bg-purple-50/50 text-purple-600 border-purple-200 shadow-sm');
    });

    it('should return correct class for Kassouf', () => {
      expect(getStoreColorClass('Kassouf')).toBe('bg-orange-50/50 text-orange-600 border-orange-200 shadow-sm');
    });

    it('should return correct class for Piracicaba (DP - Realme - XV)', () => {
      expect(getStoreColorClass('Piracicaba (DP - Realme - XV)')).toBe('bg-red-50/50 text-red-600 border-red-200 shadow-sm');
    });

    it('should return correct class for Amparo (Premium - Kassouf)', () => {
      expect(getStoreColorClass('Amparo (Premium - Kassouf)')).toBe('bg-pink-50/50 text-pink-600 border-pink-200 shadow-sm');
    });

    it('should return correct class for Todas', () => {
      expect(getStoreColorClass('Todas')).toBe('bg-emerald-50/50 text-emerald-600 border-emerald-200 shadow-sm');
    });

    it('should return default class for unknown store', () => {
      expect(getStoreColorClass('Unknown Store')).toBe('bg-gray-50 text-gray-600 border-gray-200');
    });

    it('should return default class for empty string', () => {
      expect(getStoreColorClass('')).toBe('bg-gray-50 text-gray-600 border-gray-200');
    });
  });

  describe('getStoreBarColor', () => {
    it('should return correct gradient for Dom Pedro II', () => {
      expect(getStoreBarColor('Dom Pedro II')).toBe('from-blue-500 to-blue-300');
    });

    it('should return correct gradient for Realme', () => {
      expect(getStoreBarColor('Realme')).toBe('from-yellow-400 to-yellow-200');
    });

    it('should return correct gradient for Xv de Novembro', () => {
      expect(getStoreBarColor('Xv de Novembro')).toBe('from-slate-900 to-slate-600');
    });

    it('should return correct gradient for Premium', () => {
      expect(getStoreBarColor('Premium')).toBe('from-purple-500 to-purple-300');
    });

    it('should return correct gradient for Kassouf', () => {
      expect(getStoreBarColor('Kassouf')).toBe('from-orange-500 to-orange-300');
    });

    it('should return correct gradient for Amparo', () => {
      expect(getStoreBarColor('Amparo')).toBe('from-pink-500 to-pink-300');
    });

    it('should return default gradient for unknown store', () => {
      expect(getStoreBarColor('Unknown Store')).toBe('from-slate-400 to-slate-200');
    });

    it('should return default gradient for empty string', () => {
      expect(getStoreBarColor('')).toBe('from-slate-400 to-slate-200');
    });
  });

  describe('getStoreOrder', () => {
    it('should return correct order for Dom Pedro II', () => {
      expect(getStoreOrder('Dom Pedro II')).toBe(1);
    });

    it('should return correct order for Realme', () => {
      expect(getStoreOrder('Realme')).toBe(2);
    });

    it('should return correct order for Kassouf', () => {
      expect(getStoreOrder('Kassouf')).toBe(3);
    });

    it('should return correct order for Premium', () => {
      expect(getStoreOrder('Premium')).toBe(4);
    });

    it('should return correct order for Xv de Novembro', () => {
      expect(getStoreOrder('Xv de Novembro')).toBe(5);
    });

    it('should return default order (99) for unknown store', () => {
      expect(getStoreOrder('Unknown Store')).toBe(99);
    });

    it('should return default order (99) for empty string', () => {
      expect(getStoreOrder('')).toBe(99);
    });

    it('should maintain correct relative ordering', () => {
      const stores = ['Dom Pedro II', 'Realme', 'Kassouf', 'Premium', 'Xv de Novembro'];
      const orders = stores.map(s => getStoreOrder(s));
      for (let i = 0; i < orders.length - 1; i++) {
        expect(orders[i]).toBeLessThan(orders[i + 1]);
      }
    });
  });
});
