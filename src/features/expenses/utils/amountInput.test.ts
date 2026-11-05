import { describe, it, expect } from 'vitest';
import { formatAmountBR, formatPastedAmount, maskAmountInput, parsePastedAmount } from './amountInput';

describe('parsePastedAmount', () => {
  it.each([
    ['1.234,56', 1234.56], ['1234,56', 1234.56], ['R$ 1.234,56', 1234.56], ['  R$  99,90 ', 99.9], ['r$10,00', 10],
    ['1234.56', 1234.56], ['12.5', 12.5], ['1.234', 1234], ['1.234.567', 1234567], ['0.5', 0.5], ['1.5.2', 152],
    ['123456', 1234.56], ['5', 0.05], ['100', 1], ['-1.234,56', -1234.56], ['-50', -0.5], ['1.234,5', 1234.5],
  ])('"%s" → %s', (raw, expected) => {
    expect(parsePastedAmount(raw)).toBe(expected);
  });

  it.each([[''], ['   '], ['R$'], ['-'], ['--'], ['abc'], [',']])('"%s" → null', raw => {
    expect(parsePastedAmount(raw)).toBeNull();
  });

  it('ponto com 3 casas é milhar, não decimal ("1.234" = 1234, nunca 1,234)', () => {
    expect(parsePastedAmount('1.234')).toBe(1234);
    expect(parsePastedAmount('1.23')).toBe(1.23);
  });
});

describe('formatAmountBR', () => {
  it('2 casas e separador de milhar pt-BR', () => {
    expect(formatAmountBR(0)).toBe('0,00');
    expect(formatAmountBR(1234.5)).toBe('1.234,50');
    expect(formatAmountBR(1234567.891)).toBe('1.234.567,89');
  });
});

describe('maskAmountInput', () => {
  it.each([
    ['1', '0,01'], ['12', '0,12'], ['123', '1,23'], ['12345', '123,45'], ['123456789', '1.234.567,89'],
    ['R$ 12,5x', '1,25'], ['007', '0,07'],
  ])('"%s" → "%s"', (raw, expected) => {
    expect(maskAmountInput(raw)).toBe(expected);
  });
  it('sem dígitos limpa o campo', () => {
    expect(maskAmountInput('')).toBe('');
    expect(maskAmountInput('abc')).toBe('');
  });
});

describe('formatPastedAmount', () => {
  it('valor válido e positivo vira texto formatado', () => {
    expect(formatPastedAmount('R$ 1.234,56')).toBe('1.234,56');
    expect(formatPastedAmount('99.9')).toBe('99,90');
  });
  it('inválido, zero ou negativo → null (colagem padrão)', () => {
    expect(formatPastedAmount('abc')).toBeNull();
    expect(formatPastedAmount('0')).toBeNull();
    expect(formatPastedAmount('-10,00')).toBeNull();
    expect(formatPastedAmount('')).toBeNull();
  });
});
