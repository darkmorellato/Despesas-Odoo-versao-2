/**
 * Testes de caracterização do useBackup: fixam o comportamento atual de backup
 * (JSON), exportação CSV (Odoo) e restauração para o Firestore, para a refatoração
 * não mudar nada sem perceber. A restauração mexe em dados reais: os testes cobrem
 * validação, idempotência, falhas parciais e a trava contra duplo envio.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Expense } from '@/shared/types';
import { useBackup } from './useBackup';
import { addDoc, setDoc, doc, Timestamp } from 'firebase/firestore';

const refs = vi.hoisted(() => ({ expensesRef: { __ref: 'expenses' }, checksRef: { __ref: 'checks' } }));
vi.mock('@/config/firebase', () => ({ getFirebaseRefs: vi.fn(() => refs) }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'novo' }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn((_ref: unknown, id: string) => ({ __doc: id })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  Timestamp: class {
    constructor(public seconds: number, public nanoseconds: number) {}
  },
}));

const NOW = new Date(2026, 10, 5, 12, 0, 0); // 05/11/2026

const exp = (o: Partial<Expense> & { id?: string } = {}): Expense => ({
  id: 'e1', date: '2026-11-01', description: 'Aluguel', store: 'Realme', category: 'Despesa Fixa', amount: 1500,
  quantity: 1, employeeName: 'Ana', notes: '', ...o,
} as Expense);

const fileOf = (content: string) => new File([content], 'backup.json', { type: 'application/json' });
const backupFile = (data: unknown[], checks: Record<string, boolean> = {}) => fileOf(JSON.stringify({ data, checks, version: 3 }));

/** Captura o arquivo gerado por download (Blob) */
const captureDownload = () => {
  let blob: Blob | null = null;
  let name = '';
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => { blob = b as Blob; return 'blob:x'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });
  return {
    text: async () => (blob ? blob.text() : ''),
    bytes: async () => new Uint8Array(blob ? await blob.arrayBuffer() : new ArrayBuffer(0)),
    name: () => name,
    click,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(NOW);
  vi.mocked(addDoc).mockResolvedValue({ id: 'novo' } as never);
  vi.mocked(setDoc).mockResolvedValue(undefined);
  vi.stubGlobal('confirm', vi.fn(() => true));
  delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('useBackup — salvar backup (JSON)', () => {
  it('sem seletor de arquivos: baixa "backup_completo_DD-MM-AAAA.json" com dados, checks e versão 3', async () => {
    const dl = captureDownload();
    const { result } = renderHook(() => useBackup());
    const checks = { '2026-10-Aluguel': true };
    await result.current.saveToComputer([exp()], checks);
    expect(dl.click).toHaveBeenCalledTimes(1);
    expect(dl.name()).toBe('backup_completo_05-11-2026.json');
    const text = await dl.text();
    expect(JSON.parse(text)).toEqual({ data: [exp()], checks, version: 3 });
    expect(text).toContain('\n  "data"'); // formatado com 2 espaços
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull(); // link removido
  });

  it('com seletor de arquivos: grava o JSON escolhido e fecha o arquivo', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const picker = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close }) });
    window.showSaveFilePicker = picker;
    const dl = captureDownload();
    const { result } = renderHook(() => useBackup());
    await result.current.saveToComputer([exp()], {});
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'backup_completo_05-11-2026.json',
      types: [{ description: 'Arquivo de Backup JSON', accept: { 'application/json': ['.json'] } }],
    });
    expect(JSON.parse(write.mock.calls[0][0])).toMatchObject({ version: 3, data: [exp()] });
    expect(close).toHaveBeenCalled();
    expect(dl.click).not.toHaveBeenCalled(); // não cai no download
  });

  it('usuário cancela o diálogo: termina sem erro e sem baixar', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' });
    window.showSaveFilePicker = vi.fn().mockRejectedValue(abort);
    const dl = captureDownload();
    const { result } = renderHook(() => useBackup());
    await expect(result.current.saveToComputer([exp()], {})).resolves.toBeUndefined();
    expect(dl.click).not.toHaveBeenCalled();
  });

  it('erro real do seletor (permissão): propaga, sem cair no download', async () => {
    window.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('permissão negada'));
    const dl = captureDownload();
    const { result } = renderHook(() => useBackup());
    await expect(result.current.saveToComputer([exp()], {})).rejects.toThrow('permissão negada');
    expect(dl.click).not.toHaveBeenCalled();
  });
});

describe('useBackup — exportar CSV (Odoo)', () => {
  const csv = async (rows: Expense[], employee = 'Fulano') => {
    const dl = captureDownload();
    const { result } = renderHook(() => useBackup());
    result.current.exportToCSV(rows, employee);
    return { text: await dl.text(), bytes: await dl.bytes(), name: dl.name(), click: dl.click };
  };

  it('lista vazia não gera arquivo', async () => {
    const r = await csv([]);
    expect(r.click).not.toHaveBeenCalled();
  });

  it('BOM, cabeçalho, separador ";", data dd/mm/aaaa e valores crus', async () => {
    const r = await csv([exp({ description: 'Aluguel', amount: 1234.5, quantity: 2, notes: 'NF 1', employeeName: 'Ana' })]);
    expect(r.name).toBe('despesas_odoo_05-11-2026.csv');
    // O texto decodificado descarta o BOM; ele existe nos bytes (EF BB BF) para o Excel reconhecer UTF-8
    expect(Array.from(r.bytes.slice(0, 3))).toEqual([0xEF, 0xBB, 0xBF]);
    const lines = r.text.split('\n');
    expect(lines[0]).toBe('date;name;store_name;product_id;unit_amount;quantity;description;employee_id');
    expect(lines[1]).toBe('"01/11/2026";"Aluguel";"Realme";"Despesa Fixa";"1234.5";"2";"NF 1";"Ana"'); // número cru, sem "1.234,50"
  });

  it('usa o funcionário padrão quando o lançamento não tem; valores inválidos viram 0', async () => {
    const r = await csv([exp({ employeeName: '', amount: 'abc' as unknown as number, quantity: undefined as unknown as number })], 'Fulano');
    const row = r.text.split('\n')[1];
    expect(row.endsWith('"Fulano"')).toBe(true);
    expect(row).toContain('"0";"0"'); // unit_amount;quantity
  });

  it('aspas duplas são escapadas; ponto e vírgula e quebra de linha ficam entre aspas', async () => {
    const r = await csv([exp({ description: 'Disse "oi"; tchau' })]);
    expect(r.text).toContain('"Disse ""oi""; tchau"');
  });

  it('neutraliza injeção de fórmula (=, +, -, @, tab, CR) com apóstrofo', async () => {
    const r = await csv([
      exp({ id: '1', description: '=HYPERLINK("http://x")' }),
      exp({ id: '2', description: '+cmd' }),
      exp({ id: '3', description: '-cmd' }),
      exp({ id: '4', description: '@SUM(A1)' }),
      exp({ id: '5', description: '\tabc' }),
    ]);
    expect(r.text).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(r.text).toContain(`"'+cmd"`);
    expect(r.text).toContain(`"'-cmd"`);
    expect(r.text).toContain(`"'@SUM(A1)"`);
    expect(r.text).toContain(`"'\tabc"`);
  });

  it('número negativo legítimo e texto comum NÃO ganham apóstrofo', async () => {
    const r = await csv([exp({ amount: -100, description: 'Normal', notes: '-5,50' })]);
    expect(r.text).toContain('"-100"');
    expect(r.text).toContain('"-5,50"'); // ainda é número
    expect(r.text).not.toContain(`"'Normal"`);
  });

  it('campos vazios/nulos viram "" (sem "undefined")', async () => {
    const r = await csv([exp({ notes: undefined as unknown as string })]);
    expect(r.text).not.toContain('undefined');
    expect(r.text.split('\n')[1]).toContain(';"";"Ana"');
  });
});

describe('useBackup — restaurar: leitura e validação', () => {
  const restore = (file: File, onProgress?: (m: string) => void) => {
    const { result } = renderHook(() => useBackup());
    return result.current.handleRestoreFile(file, onProgress);
  };

  it('JSON inválido: erro claro e nada é gravado', async () => {
    await expect(restore(fileOf('{lixo'))).rejects.toThrow('Arquivo JSON inválido.');
    expect(setDoc).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('o usuário precisa confirmar; recusando, nada é gravado', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    await expect(restore(backupFile([exp()]))).rejects.toThrow('Cancelled by user');
    expect(setDoc).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('ATENÇÃO'));
  });

  it.each([
    ['sem "data"', { checks: {} }], ['data vazia', { data: [] }], ['data não é lista', { data: 'x' }],
  ])('arquivo %s: "Arquivo sem dados válidos"', async (_n, content) => {
    await expect(restore(fileOf(JSON.stringify(content)))).rejects.toThrow('Arquivo sem dados válidos');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('todos inválidos: "Nenhum registro válido para importar"', async () => {
    await expect(restore(backupFile([{ date: 'ontem' }, null, 'x']))).rejects.toThrow('Nenhum registro válido para importar');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('descarta item a item e informa o motivo de cada descarte', async () => {
    const msgs: string[] = [];
    await restore(backupFile([
      exp({ id: 'ok' }),
      exp({ id: 'a', date: '01/11/2026' }),            // data
      exp({ id: 'b', description: '   ' }),            // descrição
      exp({ id: 'c', store: '' }),                     // loja
      exp({ id: 'd', store: 'Loja Fantasma' }),        // loja inválida
      exp({ id: 'e', amount: 0 }),                     // valor
      exp({ id: 'f', amount: -10 }),                   // valor
      exp({ id: 'g', amount: 'abc' as unknown as number }), // valor
      null,                                            // objeto
    ]), m => msgs.push(m));
    expect(setDoc).toHaveBeenCalledTimes(1);
    const last = msgs[msgs.length - 1];
    expect(last).toContain('1 registros importados com sucesso!');
    expect(last).toContain('8 ignorados por dados inválidos');
    expect(last).toMatch(/data: 1/); expect(last).toMatch(/descrição: 1/); expect(last).toMatch(/loja: 1/);
    expect(last).toMatch(/loja inválida: 1/); expect(last).toMatch(/valor: 3/); expect(last).toMatch(/objeto: 1/);
  });

  it('aceita as lojas individuais e os grupos válidos', async () => {
    await restore(backupFile([
      exp({ id: '1', store: 'Dom Pedro II' }), exp({ id: '2', store: 'Kassouf' }), exp({ id: '3', store: 'Premium' }),
      exp({ id: '4', store: 'Todas' }), exp({ id: '5', store: 'Piracicaba (DP - Realme - XV)' }),
    ]));
    expect(setDoc).toHaveBeenCalledTimes(5);
  });
});

describe('useBackup — restaurar: gravação', () => {
  const restore = (file: File, onProgress?: (m: string) => void) => {
    const { result } = renderHook(() => useBackup());
    return result.current.handleRestoreFile(file, onProgress);
  };

  it('com id: grava no MESMO id (idempotente) e normaliza valor, quantidade e "deleted"', async () => {
    await restore(backupFile([exp({ id: 'abc', amount: '10.5' as unknown as number, quantity: undefined as unknown as number, deleted: true })]));
    expect(doc).toHaveBeenCalledWith(refs.expensesRef, 'abc');
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = vi.mocked(setDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(ref).toEqual({ __doc: 'abc' });
    expect(payload).toMatchObject({ description: 'Aluguel', store: 'Realme', amount: 10.5, quantity: 1, deleted: false });
    expect(payload).not.toHaveProperty('id'); // o id não vira campo do documento
    expect(addDoc).not.toHaveBeenCalled();
  });

  describe('createdAt original é preservado (a janela de 24h de exclusão NÃO reinicia)', () => {
    const createdAtOf = async (createdAt: unknown) => {
      vi.mocked(setDoc).mockClear();
      await restore(backupFile([exp({ id: 'abc', createdAt: createdAt as never })]));
      return (vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>).createdAt;
    };

    it('Timestamp serializado ({seconds, nanoseconds}) volta como Timestamp com os mesmos valores', async () => {
      const value = await createdAtOf({ seconds: 1700000000, nanoseconds: 500 });
      expect(value).toBeInstanceOf(Timestamp);
      expect(value).toMatchObject({ seconds: 1700000000, nanoseconds: 500 });
    });

    it('data em texto ISO também é preservada', async () => {
      const value = await createdAtOf('2026-03-01T10:00:00.000Z');
      expect(value).toBeInstanceOf(Timestamp);
      expect((value as Timestamp).seconds).toBe(Date.parse('2026-03-01T10:00:00.000Z') / 1000);
    });

    it.each([[undefined], [null], ['lixo'], [{}], [{ seconds: 'x' }], [{ seconds: -5 }], [NaN]])(
      'sem data válida (%j) usa a hora do servidor', async (value) => {
        expect(await createdAtOf(value)).toBe('SERVER_TS');
      }
    );
  });

  it('setDoc usa merge: campos acrescentados depois do backup NÃO são apagados', async () => {
    await restore(backupFile([exp({ id: 'abc' })]));
    expect(vi.mocked(setDoc).mock.calls[0][2]).toEqual({ merge: true });
  });

  it('limpa os dados de exclusão (igual a "desfazer exclusão" do app)', async () => {
    await restore(backupFile([exp({ id: 'abc' })]));
    expect(vi.mocked(setDoc).mock.calls[0][1]).toMatchObject({ deleted: false, deletedAt: null, deleteReason: null, deletedBy: null });
  });

  it('sem id: cria um novo documento (addDoc)', async () => {
    const { id: _id, ...semId } = exp();
    await restore(backupFile([semId]));
    expect(addDoc).toHaveBeenCalledWith(refs.expensesRef, expect.objectContaining({ description: 'Aluguel', deleted: false, createdAt: 'SERVER_TS' }));
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('sem id mas com createdAt no backup: o novo documento também mantém a data original', async () => {
    const { id: _id, ...semId } = exp({ createdAt: { seconds: 1700000000, nanoseconds: 0 } as never });
    await restore(backupFile([semId]));
    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.createdAt).toBeInstanceOf(Timestamp);
    expect(payload).not.toHaveProperty('deletedAt'); // documento novo: sem campos de exclusão
  });

  it('envia em blocos de 50 e informa o progresso', async () => {
    const items = Array.from({ length: 120 }, (_, i) => exp({ id: `e${i}` }));
    const msgs: string[] = [];
    await restore(backupFile(items), m => msgs.push(m));
    expect(setDoc).toHaveBeenCalledTimes(120);
    expect(msgs.slice(0, 3)).toEqual(['Enviando 50/120 registros...', 'Enviando 100/120 registros...', 'Enviando 120/120 registros...']);
    expect(msgs[msgs.length - 1]).toBe('120 registros importados com sucesso!');
  });

  it('falha parcial: informa quantos falharam, orienta repetir e NÃO lança', async () => {
    vi.mocked(setDoc).mockImplementation(((ref: { __doc: string }) =>
      ref.__doc === 'ruim' ? Promise.reject(new Error('x')) : Promise.resolve()) as never);
    const msgs: string[] = [];
    await expect(restore(backupFile([exp({ id: 'a' }), exp({ id: 'ruim' }), exp({ id: 'b' })]), m => msgs.push(m))).resolves.toBeUndefined();
    const last = msgs[msgs.length - 1];
    expect(last).toContain('2 registros importados com sucesso!');
    expect(last).toContain('1 falharam (a restauração é idempotente — execute novamente para reenviar os que faltaram).');
  });

  it('todos falharam: lança o erro com a contagem', async () => {
    vi.mocked(setDoc).mockRejectedValue(new Error('offline'));
    await expect(restore(backupFile([exp({ id: 'a' }), exp({ id: 'b' })]))).rejects.toThrow('Todos os 2 registros falharam ao serem enviados.');
  });

  it('restaura os checks (com merge) só quando existem', async () => {
    await restore(backupFile([exp()], { '2026-10-Aluguel': true }));
    const checksCall = (vi.mocked(setDoc).mock.calls as unknown as unknown[][]).find(c => c[0] === refs.checksRef);
    expect(checksCall?.[1]).toEqual({ checks: { '2026-10-Aluguel': true } });
    expect(checksCall?.[2]).toEqual({ merge: true });

    vi.mocked(setDoc).mockClear();
    await restore(backupFile([exp()], {}));
    expect((vi.mocked(setDoc).mock.calls as unknown as unknown[][]).some(c => c[0] === refs.checksRef)).toBe(false);
  });

  it('trava: segunda restauração enquanto a primeira roda é recusada; depois libera', async () => {
    let release!: () => void;
    vi.mocked(setDoc).mockReturnValueOnce(new Promise<void>(r => { release = r; }) as never);
    const { result } = renderHook(() => useBackup());
    const first = result.current.handleRestoreFile(backupFile([exp({ id: 'a' })]));
    await new Promise(r => setTimeout(r, 20)); // deixa a leitura do arquivo avançar
    await expect(result.current.handleRestoreFile(backupFile([exp({ id: 'b' })]))).rejects.toThrow('Restauração já em andamento — aguarde.');
    release();
    await first;
    await expect(result.current.handleRestoreFile(backupFile([exp({ id: 'c' })]))).resolves.toBeUndefined();
  });

  it('a trava também é liberada depois de um erro', async () => {
    const { result } = renderHook(() => useBackup());
    await expect(result.current.handleRestoreFile(fileOf('{lixo'))).rejects.toThrow('Arquivo JSON inválido.');
    await expect(result.current.handleRestoreFile(backupFile([exp()]))).resolves.toBeUndefined();
  });
});
