import { describe, it, expect } from 'vitest';
import { getRecentWindowStart, isBeforeRecentWindow, RECENT_MONTHS } from './historyWindow';

describe('getRecentWindowStart', () => {
  it('usa o mês atual + 2 anteriores por padrão', () => {
    expect(RECENT_MONTHS).toBe(3);
    expect(getRecentWindowStart(new Date(2026, 10, 5))).toBe('2026-09-01'); // nov/2026
  });

  it('atravessa a virada de ano', () => {
    expect(getRecentWindowStart(new Date(2026, 0, 15))).toBe('2025-11-01'); // jan/2026
    expect(getRecentWindowStart(new Date(2026, 1, 28))).toBe('2025-12-01'); // fev/2026
  });

  it('fim de mês não vaza para o mês seguinte (31 de março)', () => {
    expect(getRecentWindowStart(new Date(2026, 2, 31))).toBe('2026-01-01');
  });

  it('aceita outro número de meses; mínimo é o mês atual', () => {
    expect(getRecentWindowStart(new Date(2026, 10, 5), 1)).toBe('2026-11-01');
    expect(getRecentWindowStart(new Date(2026, 10, 5), 0)).toBe('2026-11-01');
    expect(getRecentWindowStart(new Date(2026, 10, 5), 12)).toBe('2025-12-01');
  });
});

describe('isBeforeRecentWindow', () => {
  it('compara datas YYYY-MM-DD como texto', () => {
    expect(isBeforeRecentWindow('2026-08-31', '2026-09-01')).toBe(true);
    expect(isBeforeRecentWindow('2026-09-01', '2026-09-01')).toBe(false);
    expect(isBeforeRecentWindow('2026-11-05', '2026-09-01')).toBe(false);
  });
});
