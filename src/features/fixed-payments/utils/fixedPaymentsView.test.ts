import { describe, it, expect } from 'vitest';
import {
  MONTHS, createEmptyPaymentForm, PAYMENT_DAYS, buildPaymentData, dayFromCustomDate, formFromPayment,
  getDayOptions, getMonthLabel, selectStandardDay, toggleMonth,
} from './fixedPaymentsView';

describe('fixedPaymentsView', () => {
  it('constantes: 12 meses (1–12) e dias padrão', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toEqual({ value: 1, label: 'Jan' });
    expect(MONTHS[11]).toEqual({ value: 12, label: 'Dez' });
    expect(PAYMENT_DAYS).toEqual([5, 10, 15, 20, 25, 27, 29]);
    expect(createEmptyPaymentForm()).toEqual({ description: '', day: 5, months: [] });
    expect(createEmptyPaymentForm().months).not.toBe(createEmptyPaymentForm().months); // sem estado compartilhado
  });

  it('getMonthLabel', () => {
    expect(getMonthLabel(6)).toBe('Jun');
    expect(getMonthLabel(13)).toBeUndefined();
  });

  it('getDayOptions inclui o dia atual quando fora da lista fixa, em ordem', () => {
    expect(getDayOptions(10)).toBe(PAYMENT_DAYS);
    expect(getDayOptions(30)).toEqual([5, 10, 15, 20, 25, 27, 29, 30]);
    expect(getDayOptions(1)).toEqual([1, 5, 10, 15, 20, 25, 27, 29]);
    expect(getDayOptions(26)).toEqual([5, 10, 15, 20, 25, 26, 27, 29]);
  });

  it('dayFromCustomDate', () => {
    expect(dayFromCustomDate('2026-12-18')).toBe(18);
    expect(dayFromCustomDate('2026-01-05')).toBe(5);
    expect(dayFromCustomDate('')).toBe(5);
  });

  it('toggleMonth marca, desmarca e preserva a ordem de marcação', () => {
    expect(toggleMonth([], 3)).toEqual([3]);
    expect(toggleMonth([3, 9], 3)).toEqual([9]);
    expect(toggleMonth([1, 6], 3)).toEqual([1, 6, 3]);
  });

  it('selectStandardDay descarta customDate e não altera o original', () => {
    const form = { description: 'x', day: 18, months: [1], customDate: '2026-12-18' };
    expect(selectStandardDay(form, 10)).toEqual({ description: 'x', day: 10, months: [1] });
    expect(form.customDate).toBe('2026-12-18');
  });

  it('formFromPayment', () => {
    expect(formFromPayment({ id: '1', day: 5, description: 'A' })).toEqual({ description: 'A', day: 5, months: [] });
    expect(formFromPayment({ id: '1', day: 27, description: 'B', months: [2], customDate: '2026-11-27' }))
      .toEqual({ description: 'B', day: 27, months: [2], customDate: '2026-11-27' });
  });

  it('buildPaymentData: trim, e months/customDate só quando informados', () => {
    expect(buildPaymentData({ description: '  Luz  ', day: 10, months: [] })).toEqual({ description: 'Luz', day: 10 });
    expect(buildPaymentData({ description: 'Luz', day: 10, months: [1, 2], customDate: '2026-02-10' }))
      .toEqual({ description: 'Luz', day: 10, months: [1, 2], customDate: '2026-02-10' });
    expect(buildPaymentData({ description: 'Luz', day: 10, months: [], customDate: '' })).not.toHaveProperty('customDate');
  });
});
