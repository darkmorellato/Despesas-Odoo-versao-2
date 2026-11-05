import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Expense } from '@/shared/types';
import {
  BACKUP_VERSION, RESTORE_CHUNK_SIZE, buildBackupFile, buildCsv, datedFileName, escapeCsvCell,
  parseBackupCreatedAt, partitionBackupItems, summarizeRestore, validateBackupItem,
} from './backup';

const exp = (o: Partial<Expense> = {}): Expense => ({
  id: 'e1', date: '2026-11-01', description: 'Aluguel', store: 'Realme', category: 'Despesa Fixa', amount: 1500,
  quantity: 1, employeeName: 'Ana', notes: '', ...o,
} as Expense);

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 5, 12)); });
afterEach(() => vi.useRealTimers());

describe('constantes e nomes de arquivo', () => {
  it('versão e tamanho do bloco', () => {
    expect(BACKUP_VERSION).toBe(3);
    expect(RESTORE_CHUNK_SIZE).toBe(50);
  });
  it('datedFileName usa a data de hoje (DD-MM-AAAA)', () => {
    expect(datedFileName('backup_completo', 'json')).toBe('backup_completo_05-11-2026.json');
    expect(datedFileName('despesas_odoo', 'csv')).toBe('despesas_odoo_05-11-2026.csv');
  });
  it('buildBackupFile: JSON formatado com dados, checks e versão', () => {
    const { content, fileName } = buildBackupFile([exp()], { '2026-10-A': true });
    expect(fileName).toBe('backup_completo_05-11-2026.json');
    expect(JSON.parse(content)).toEqual({ data: [exp()], checks: { '2026-10-A': true }, version: 3 });
    expect(content).toContain('\n  "data"');
  });
});

describe('validateBackupItem', () => {
  it('item válido: normaliza valor e quantidade e força deleted=false', () => {
    const { item, reason } = validateBackupItem(exp({ amount: '10.5' as unknown as number, quantity: undefined as unknown as number, deleted: true }));
    expect(reason).toBeUndefined();
    expect(item).toMatchObject({ amount: 10.5, quantity: 1, deleted: false });
  });

  it('valor como texto nunca concatena ("10" + "5" não vira "105" nos totais)', () => {
    const a = validateBackupItem(exp({ amount: '10' as unknown as number })).item!;
    const b = validateBackupItem(exp({ amount: '5' as unknown as number })).item!;
    expect(a.amount + b.amount).toBe(15);
  });

  it.each([
    [null, 'objeto'], ['texto', 'objeto'], [42, 'objeto'], [undefined, 'objeto'],
    [exp({ date: '01/11/2026' }), 'data'], [exp({ date: undefined as unknown as string }), 'data'], [exp({ date: '2026-1-1' }), 'data'],
    [exp({ description: '   ' }), 'descrição'], [exp({ description: 5 as unknown as string }), 'descrição'],
    [exp({ store: '' }), 'loja'], [exp({ store: undefined as unknown as string }), 'loja'],
    [exp({ store: 'Loja Fantasma' }), 'loja inválida'],
    [exp({ amount: 0 }), 'valor'], [exp({ amount: -1 }), 'valor'], [exp({ amount: 'abc' as unknown as number }), 'valor'],
    [exp({ amount: Infinity }), 'valor'], [exp({ amount: NaN }), 'valor'],
  ])('descarta %#: motivo "%s"', (input, reason) => {
    expect(validateBackupItem(input)).toEqual({ item: null, reason });
  });

  it('a validação é feita na ordem data → descrição → loja → valor', () => {
    expect(validateBackupItem({ date: 'x', description: '', store: '', amount: 0 }).reason).toBe('data');
    expect(validateBackupItem({ date: '2026-01-01', description: '', store: '', amount: 0 }).reason).toBe('descrição');
  });

  it('aceita lojas individuais e grupos', () => {
    ['Dom Pedro II', 'Realme', 'Kassouf', 'Premium', 'Xv de Novembro', 'Todas', 'Piracicaba (DP - Realme - XV)', 'Amparo (Premium - Kassouf)']
      .forEach(store => expect(validateBackupItem(exp({ store })).item).not.toBeNull());
  });
});

describe('partitionBackupItems', () => {
  it('separa válidos e conta os descartes por motivo', () => {
    const { validItems, skipped } = partitionBackupItems([
      exp({ id: 'ok' }), exp({ date: 'x' }), exp({ date: 'y' }), exp({ amount: 0 }), null,
    ]);
    expect(validItems.map(i => i.id)).toEqual(['ok']);
    expect(skipped).toEqual({ data: 2, valor: 1, objeto: 1 });
  });
  it('lista vazia', () => {
    expect(partitionBackupItems([])).toEqual({ validItems: [], skipped: {} });
  });
});

describe('summarizeRestore', () => {
  it('só sucesso', () => {
    expect(summarizeRestore({ imported: 10, failed: 0, skipped: {} })).toBe('10 registros importados com sucesso!');
  });
  it('com falhas orienta repetir (idempotente)', () => {
    expect(summarizeRestore({ imported: 8, failed: 2, skipped: {} }))
      .toBe('8 registros importados com sucesso! 2 falharam (a restauração é idempotente — execute novamente para reenviar os que faltaram).');
  });
  it('com descartes lista os motivos', () => {
    expect(summarizeRestore({ imported: 5, failed: 0, skipped: { data: 2, valor: 1 } }))
      .toBe('5 registros importados com sucesso! 3 ignorados por dados inválidos (data: 2, valor: 1).');
  });
  it('tudo junto', () => {
    const m = summarizeRestore({ imported: 1, failed: 1, skipped: { loja: 1 } });
    expect(m).toContain('1 registros importados');
    expect(m).toContain('1 falharam');
    expect(m).toContain('1 ignorados por dados inválidos (loja: 1)');
  });
});

describe('escapeCsvCell', () => {
  it.each([
    ['simples', '"simples"'], ['com "aspas"', '"com ""aspas"""'], ['a;b', '"a;b"'], ['linha1\nlinha2', '"linha1\nlinha2"'],
    [null, '""'], [undefined, '""'], [0, '"0"'], [1234.5, '"1234.5"'],
    // números (inclusive negativos) ficam como estão
    ['-100', '"-100"'], ['-5,50', '"-5,50"'], ['10.5', '"10.5"'], [-100, '"-100"'],
    // injeção de fórmula
    ['=1+1', `"'=1+1"`], ['+cmd', `"'+cmd"`], ['-cmd', `"'-cmd"`], ['@SUM(A1)', `"'@SUM(A1)"`], ['\tx', `"'\tx"`], ['\rx', `"'\rx"`],
    ['=HYPERLINK("u")', `"'=HYPERLINK(""u"")"`],
  ])('%j → %s', (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });

  it('só o INÍCIO importa: "=" no meio do texto não recebe apóstrofo', () => {
    expect(escapeCsvCell('a=b')).toBe('"a=b"');
    expect(escapeCsvCell('1-2')).toBe('"1-2"');
  });
});

describe('buildCsv', () => {
  it('BOM + cabeçalho + linhas com data dd/mm/aaaa e números crus', () => {
    const csv = buildCsv([exp({ amount: 1234.5, quantity: 2, notes: 'NF 1' })], 'Padrão');
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const lines = csv.slice(1).split('\n');
    expect(lines[0]).toBe('date;name;store_name;product_id;unit_amount;quantity;description;employee_id');
    expect(lines[1]).toBe('"01/11/2026";"Aluguel";"Realme";"Despesa Fixa";"1234.5";"2";"NF 1";"Ana"');
  });
  it('funcionário padrão quando o lançamento não tem; valores inválidos viram 0', () => {
    const line = buildCsv([exp({ employeeName: '', amount: 'abc' as unknown as number, quantity: undefined as unknown as number })], 'Padrão').split('\n')[1];
    expect(line.endsWith('"Padrão"')).toBe(true);
    expect(line).toContain('"0";"0"');
  });
  it('uma linha por despesa, na ordem recebida', () => {
    const csv = buildCsv([exp({ description: 'A' }), exp({ description: 'B' })], 'x');
    expect(csv.split('\n')).toHaveLength(3);
    expect(csv.indexOf('"A"')).toBeLessThan(csv.indexOf('"B"'));
  });
});

describe('parseBackupCreatedAt', () => {
  it('Timestamp serializado do backup ({ seconds, nanoseconds })', () => {
    expect(parseBackupCreatedAt({ seconds: 1700000000, nanoseconds: 123000000 })).toEqual({ seconds: 1700000000, nanoseconds: 123000000 });
    expect(parseBackupCreatedAt({ seconds: 1700000000 })).toEqual({ seconds: 1700000000, nanoseconds: 0 });
  });

  it('formato do Admin SDK (_seconds/_nanoseconds)', () => {
    expect(parseBackupCreatedAt({ _seconds: 1700000000, _nanoseconds: 5 })).toEqual({ seconds: 1700000000, nanoseconds: 5 });
  });

  it('texto de data (ISO) e número em milissegundos', () => {
    expect(parseBackupCreatedAt('2026-03-01T10:00:00.250Z')).toEqual({ seconds: Date.parse('2026-03-01T10:00:00Z') / 1000, nanoseconds: 250000000 });
    expect(parseBackupCreatedAt(1700000000500)).toEqual({ seconds: 1700000000, nanoseconds: 500000000 });
  });

  it('preserva o instante exato (não "arredonda" para a restauração)', () => {
    const original = { seconds: 1767225600, nanoseconds: 1 };
    expect(parseBackupCreatedAt(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });

  it.each([
    [undefined], [null], [''], ['lixo'], [{}], [{ seconds: 'x' }], [{ seconds: -1 }], [{ seconds: 1e12 }], [{ seconds: NaN }],
    [{ seconds: 10, nanoseconds: -1 }], [{ seconds: 10, nanoseconds: 1e9 }], [NaN], [-5], [[]], [true],
  ])('sem data válida (%j) → null (o chamador usa a hora do servidor)', (value) => {
    expect(parseBackupCreatedAt(value)).toBeNull();
  });
});
