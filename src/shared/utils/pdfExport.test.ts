import { describe, it, expect } from 'vitest';
import { buildVectorPDFDocument } from './pdfExport';
import { DEFAULT_SETTINGS } from '@/shared/types';
import type { Expense } from '@/shared/types';

const mk = (i: number, store: string, extra: Partial<Expense> = {}): Expense => ({
  id: `e${i}`,
  date: '2026-08-20',
  description: `Despesa ${i}`,
  category: 'Despesa',
  store: store as Expense['store'],
  amount: 100 + i,
  employeeName: 'Teste',
  ...extra,
} as Expense);

/** Extrai o texto desenhado no PDF (o jsPDF guarda os textos em strings do stream). */
const pdfText = (bytes: ArrayBuffer): string => new TextDecoder('latin1').decode(bytes);

describe('buildVectorPDFDocument (fumaça — protege upgrades do jsPDF)', () => {
  it('gera um PDF válido com uma página para poucos lançamentos', () => {
    const doc = buildVectorPDFDocument(
      [mk(1, 'Dom Pedro II'), mk(2, 'Realme')],
      DEFAULT_SETTINGS,
      'Agosto/2026'
    );

    expect(doc.getNumberOfPages()).toBe(1);
    const raw = pdfText(doc.output('arraybuffer'));
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain('%%EOF');
  });

  it('pagina quando há muitos lançamentos', () => {
    const many = Array.from({ length: 120 }, (_, i) => mk(i, 'Premium'));
    const doc = buildVectorPDFDocument(many, DEFAULT_SETTINGS, 'Geral');
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('tolera dados sujos (descrição vazia, valor NaN, quebras de linha)', () => {
    const doc = buildVectorPDFDocument(
      [
        mk(1, 'Kassouf', { description: 'linha1\nlinha2\t', amount: NaN as unknown as number }),
        mk(2, 'Xv de Novembro', { description: undefined as unknown as string }),
      ],
      DEFAULT_SETTINGS,
      'Geral'
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('inclui o total original nas despesas rateadas (Orig:)', () => {
    const doc = buildVectorPDFDocument(
      [mk(1, 'Dom Pedro II', { amount: 100, originalTotal: 400 })],
      DEFAULT_SETTINGS,
      'Geral'
    );
    expect(pdfText(doc.output('arraybuffer'))).toContain('Orig');
  });

  it('lista vazia não quebra', () => {
    const doc = buildVectorPDFDocument([], DEFAULT_SETTINGS, 'Geral');
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
