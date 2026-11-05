/**
 * Testes de caracterização do formulário de lançamento: fixam o comportamento
 * observável (campos, máscara e colagem de valor, comprovante por arquivo/arrastar/
 * colar, envio) para a refatoração não mudar nada sem perceber.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, createEvent } from '@testing-library/react';
import { ExpenseForm, parsePastedAmount } from './ExpenseForm';
import { compressImageFile } from '@/shared/utils/imageCompressor';

vi.mock('@/shared/utils/imageCompressor', () => ({ compressImageFile: vi.fn() }));

const categories = [
  { label: 'Alimentação', odooRef: 'A' },
  { label: 'Transporte', odooRef: 'T' },
];

const baseProps = () => ({
  date: '2026-11-05',
  category: '',
  description: '',
  store: '',
  amount: '',
  notes: '',
  receiptUrl: undefined as string | undefined,
  editingId: null as string | null,
  isSubmitting: false,
  currency: 'R$',
  categoriesList: categories,
});

const setup = (over: Partial<ReturnType<typeof baseProps>> & { withReceiptSetter?: boolean } = {}) => {
  const { withReceiptSetter = true, ...rest } = over;
  const fns = {
    setDate: vi.fn(), setCategory: vi.fn(), setDescription: vi.fn(), setStore: vi.fn(), setAmount: vi.fn(), setNotes: vi.fn(),
    setReceiptUrl: vi.fn(), onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()), onReset: vi.fn(), showToast: vi.fn(),
  };
  const { setReceiptUrl, ...others } = fns;
  const utils = render(
    <ExpenseForm {...baseProps()} {...rest} {...others} {...(withReceiptSetter ? { setReceiptUrl } : {})} />
  );
  return { ...utils, ...fns };
};

const amountInput = () => screen.getByPlaceholderText('0,00') as HTMLInputElement;
const selects = () => Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const imageFile = (name = 'cupom.png', type = 'image/png') => new File(['x'], name, { type });
const clipItems = (...entries: Array<{ type: string; file?: File | null }>) => ({
  items: entries.map(e => ({ type: e.type, getAsFile: () => e.file ?? null })),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(compressImageFile).mockResolvedValue('data:image/jpeg;base64,AAAA');
});

describe('parsePastedAmount', () => {
  it.each([
    ['1.234,56', 1234.56], ['1234,56', 1234.56], ['R$ 1.234,56', 1234.56], ['  R$  99,90 ', 99.9],
    ['1234.56', 1234.56], ['12.5', 12.5], ['1.234', 1234], ['1.234.567', 1234567], ['0.5', 0.5],
    ['123456', 1234.56], ['5', 0.05], ['100', 1], ['-1.234,56', -1234.56], ['-50', -0.5],
  ])('"%s" → %s', (raw, expected) => {
    expect(parsePastedAmount(raw)).toBe(expected);
  });

  it.each([[''], ['   '], ['R$'], ['-'], ['abc'], ['--']])('"%s" → null', raw => {
    expect(parsePastedAmount(raw)).toBeNull();
  });
});

describe('ExpenseForm — cabeçalho', () => {
  it('novo lançamento: título, "Limpar" e botão de envio', () => {
    const { onReset } = setup();
    expect(screen.getByText('Novo Lançamento')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Limpar todos os campos do formulário'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Adicionar Lançamento' })).toBeInTheDocument();
    expect(screen.queryByText('Cancelar Edição')).not.toBeInTheDocument();
  });

  it('edição: título, "Cancelar Edição" (avisa) e "Salvar Alterações"', () => {
    const { onReset, showToast } = setup({ editingId: 'x1' });
    expect(screen.getByText('Editar Lançamento (Modo Seguro)')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Cancelar edição e voltar'));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('Edição cancelada', 'info');
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument();
    expect(screen.queryByTitle('Limpar todos os campos do formulário')).not.toBeInTheDocument();
  });
});

describe('ExpenseForm — campos', () => {
  it('mostra a data formatada e a moeda no rótulo do valor', () => {
    setup();
    expect(screen.getByDisplayValue('05/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Valor (R$)')).toBeInTheDocument();
  });

  it('categoria: opções da lista e callback', () => {
    const { setCategory } = setup();
    const [category] = selects();
    expect(Array.from(category.options).map(o => o.textContent)).toEqual(['Selecione uma categoria...', 'Alimentação', 'Transporte']);
    fireEvent.change(category, { target: { value: 'Transporte' } });
    expect(setCategory).toHaveBeenCalledWith('Transporte');
  });

  it('loja: lojas individuais + grupos, sem Kassouf em "Todas" (config)', () => {
    const { setStore } = setup();
    const store = selects()[1];
    const labels = Array.from(store.options).map(o => o.textContent);
    expect(labels[0]).toBe('Selecione a loja...');
    expect(labels).toEqual(expect.arrayContaining(['Dom Pedro II', 'Realme', 'Kassouf', 'Premium', 'Xv de Novembro', 'Todas']));
    fireEvent.change(store, { target: { value: 'Realme' } });
    expect(setStore).toHaveBeenCalledWith('Realme');
  });

  it('dica de grupo só aparece quando a loja é um grupo', () => {
    const a = setup({ store: 'Realme' });
    expect(document.querySelector('p.text-\\[10px\\]')).toBeNull();
    a.unmount();
    setup({ store: 'Todas' });
    expect(screen.getByText(/Dom Pedro II/, { selector: 'p' })).toBeInTheDocument();
  });

  it('descrição e observações chamam os callbacks', () => {
    const { setDescription, setNotes } = setup();
    fireEvent.change(screen.getByPlaceholderText('Ex: Café com cliente, boleto...'), { target: { value: 'Almoço' } });
    expect(setDescription).toHaveBeenCalledWith('Almoço');
    fireEvent.change(screen.getByPlaceholderText('Detalhes, NF, número...'), { target: { value: 'NF 123' } });
    expect(setNotes).toHaveBeenCalledWith('NF 123');
  });
});

describe('ExpenseForm — máscara do valor', () => {
  it.each([
    ['1', '0,01'], ['12', '0,12'], ['123', '1,23'], ['12345', '123,45'], ['123456789', '1.234.567,89'],
    ['R$ 12,5x', '1,25'], // só os dígitos contam (centavos)
  ])('digitar "%s" → "%s"', (typed, shown) => {
    const { setAmount } = setup();
    fireEvent.change(amountInput(), { target: { value: typed } });
    expect(setAmount).toHaveBeenCalledWith(shown);
  });

  it('sem dígitos limpa o campo', () => {
    const { setAmount } = setup({ amount: '1,23' });
    fireEvent.change(amountInput(), { target: { value: 'abc' } });
    expect(setAmount).toHaveBeenCalledWith('');
  });

  const paste = (text: string) => {
    const event = createEvent.paste(amountInput(), { clipboardData: { getData: () => text } });
    fireEvent(amountInput(), event);
    return event;
  };

  it('colar valor pt-BR formata e impede a colagem padrão', () => {
    const { setAmount } = setup();
    const event = paste('R$ 1.234,56');
    expect(setAmount).toHaveBeenCalledWith('1.234,56');
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([['abc'], ['0'], ['-10,00'], ['']])('colar "%s" não interfere', text => {
    const { setAmount } = setup();
    const event = paste(text);
    expect(setAmount).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('ExpenseForm — envio', () => {
  it('submit chama onSubmit', () => {
    const { onSubmit } = setup();
    fireEvent.submit(amountInput().closest('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('enquanto grava: botão desabilitado com "Gravando..."', () => {
    setup({ isSubmitting: true });
    const btn = screen.getByRole('button', { name: 'Gravando...' });
    expect(btn).toBeDisabled();
  });
});

describe('ExpenseForm — comprovante por arquivo', () => {
  it('estado vazio mostra as instruções', () => {
    setup();
    expect(screen.getByText('Anexar Foto / Cupom ou PDF')).toBeInTheDocument();
    expect(screen.queryByText('Anexado')).not.toBeInTheDocument();
  });

  it('imagem válida: comprime, anexa e avisa; limpa o input', async () => {
    const { setReceiptUrl, showToast } = setup();
    fireEvent.change(fileInput(), { target: { files: [imageFile()] } });
    await waitFor(() => expect(setReceiptUrl).toHaveBeenCalledWith('data:image/jpeg;base64,AAAA'));
    expect(compressImageFile).toHaveBeenCalledWith(expect.any(File), 1200, 1200, 0.75);
    expect(showToast).toHaveBeenCalledWith('Comprovante anexado com sucesso!', 'success');
    expect(fileInput().value).toBe('');
  });

  it('PDF também é aceito', async () => {
    const { setReceiptUrl } = setup();
    fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'nota.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(setReceiptUrl).toHaveBeenCalled());
  });

  it('tipo inválido: avisa e não comprime', async () => {
    const { showToast, setReceiptUrl } = setup();
    fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Por favor envie uma imagem (JPG, PNG, WebP) ou documento PDF.', 'error'));
    expect(compressImageFile).not.toHaveBeenCalled();
    expect(setReceiptUrl).not.toHaveBeenCalled();
  });

  it('erro ao compactar: mostra a mensagem do erro', async () => {
    vi.mocked(compressImageFile).mockRejectedValueOnce(new Error('arquivo corrompido'));
    const { showToast, setReceiptUrl } = setup();
    fireEvent.change(fileInput(), { target: { files: [imageFile()] } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('arquivo corrompido', 'error'));
    expect(setReceiptUrl).not.toHaveBeenCalled();
  });

  it('erro sem mensagem usa o texto padrão', async () => {
    vi.mocked(compressImageFile).mockRejectedValueOnce({});
    const { showToast } = setup();
    fireEvent.change(fileInput(), { target: { files: [imageFile()] } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Erro ao processar arquivo do comprovante', 'error'));
  });

  it('mostra "Processando..." enquanto comprime', async () => {
    let release!: (v: string) => void;
    vi.mocked(compressImageFile).mockReturnValueOnce(new Promise<string>(r => { release = r; }));
    setup();
    fireEvent.change(fileInput(), { target: { files: [imageFile()] } });
    expect(await screen.findByText('Processando e compactando arquivo...')).toBeInTheDocument();
    release('data:image/jpeg;base64,BBBB');
    await waitFor(() => expect(screen.queryByText('Processando e compactando arquivo...')).not.toBeInTheDocument());
  });

  it('sem setReceiptUrl: comprime mas não anexa nem avisa sucesso', async () => {
    const { showToast } = setup({ withReceiptSetter: false });
    fireEvent.change(fileInput(), { target: { files: [imageFile()] } });
    await waitFor(() => expect(compressImageFile).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalledWith('Comprovante anexado com sucesso!', 'success');
  });

  it('clicar na área vazia abre o seletor; com comprovante não abre', () => {
    const a = setup();
    const click = vi.spyOn(fileInput(), 'click');
    fireEvent.click(screen.getByText('Anexar Foto / Cupom ou PDF'));
    expect(click).toHaveBeenCalledTimes(1);
    a.unmount();
    setup({ receiptUrl: 'data:image/jpeg;base64,AAAA' });
    const click2 = vi.spyOn(fileInput(), 'click');
    fireEvent.click(screen.getByAltText('Pré-visualização do comprovante'));
    expect(click2).not.toHaveBeenCalled();
  });
});

describe('ExpenseForm — comprovante anexado', () => {
  it('imagem: selo "Anexado", pré-visualização, Trocar e Remover', () => {
    const { setReceiptUrl, showToast } = setup({ receiptUrl: 'data:image/jpeg;base64,AAAA' });
    expect(screen.getByText('Anexado')).toBeInTheDocument();
    expect(screen.getByAltText('Pré-visualização do comprovante')).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    const click = vi.spyOn(fileInput(), 'click');
    fireEvent.click(screen.getByTitle('Trocar arquivo'));
    expect(click).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Remover comprovante'));
    expect(setReceiptUrl).toHaveBeenCalledWith(undefined);
    expect(showToast).toHaveBeenCalledWith('Comprovante removido', 'info');
  });

  it('PDF: mostra o cartão do documento em vez da imagem', () => {
    setup({ receiptUrl: 'data:application/pdf;base64,AAAA' });
    expect(screen.getByText('Documento PDF Anexado')).toBeInTheDocument();
    expect(screen.queryByAltText('Pré-visualização do comprovante')).not.toBeInTheDocument();
  });

  it('sem setReceiptUrl não há botão Remover', () => {
    setup({ receiptUrl: 'data:image/jpeg;base64,AAAA', withReceiptSetter: false });
    expect(screen.queryByTitle('Remover comprovante')).not.toBeInTheDocument();
    expect(screen.getByTitle('Trocar arquivo')).toBeInTheDocument();
  });
});

describe('ExpenseForm — arrastar e colar', () => {
  const dropzone = () => screen.getByText('Anexar Foto / Cupom ou PDF').closest('.border-dashed') as HTMLElement;

  it('arrastar destaca a área e soltar processa o arquivo', async () => {
    const { setReceiptUrl } = setup();
    fireEvent.dragOver(dropzone());
    expect(dropzone().className).toContain('border-amber-500');
    fireEvent.dragLeave(dropzone());
    expect(dropzone().className).not.toContain('border-amber-500');
    fireEvent.dragOver(dropzone());
    fireEvent.drop(dropzone(), { dataTransfer: { files: [imageFile('solto.png')] } });
    await waitFor(() => expect(setReceiptUrl).toHaveBeenCalledWith('data:image/jpeg;base64,AAAA'));
    expect(dropzone().className).not.toContain('border-amber-500');
  });

  it('colar imagem DENTRO do formulário processa uma única vez', async () => {
    setup();
    fireEvent.paste(screen.getByPlaceholderText('Detalhes, NF, número...'), {
      clipboardData: clipItems({ type: 'image/png', file: imageFile() }),
    });
    await waitFor(() => expect(compressImageFile).toHaveBeenCalledTimes(1));
    await new Promise(r => setTimeout(r, 20));
    expect(compressImageFile).toHaveBeenCalledTimes(1); // o ouvinte global não processa de novo
  });

  it('colar PDF dentro do formulário também funciona', async () => {
    setup();
    fireEvent.paste(screen.getByPlaceholderText('Detalhes, NF, número...'), {
      clipboardData: clipItems({ type: 'application/pdf', file: new File(['x'], 'a.pdf', { type: 'application/pdf' }) }),
    });
    await waitFor(() => expect(compressImageFile).toHaveBeenCalledTimes(1));
  });

  it('colar imagem FORA do formulário (fora de campos de texto) é capturado globalmente', async () => {
    setup();
    fireEvent.paste(document.body, { clipboardData: clipItems({ type: 'image/png', file: imageFile() }) });
    await waitFor(() => expect(compressImageFile).toHaveBeenCalledTimes(1));
  });

  it('colar PDF fora do formulário NÃO é capturado (só imagem)', async () => {
    setup();
    fireEvent.paste(document.body, { clipboardData: clipItems({ type: 'application/pdf', file: new File(['x'], 'a.pdf', { type: 'application/pdf' }) }) });
    await new Promise(r => setTimeout(r, 20));
    expect(compressImageFile).not.toHaveBeenCalled();
  });

  it('colar em um campo de texto fora do formulário é ignorado', async () => {
    setup();
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    fireEvent.paste(outside, { clipboardData: clipItems({ type: 'image/png', file: imageFile() }) });
    await new Promise(r => setTimeout(r, 20));
    expect(compressImageFile).not.toHaveBeenCalled();
    outside.remove();
  });

  it('colar texto comum não faz nada', async () => {
    setup();
    fireEvent.paste(document.body, { clipboardData: clipItems({ type: 'text/plain' }) });
    await new Promise(r => setTimeout(r, 20));
    expect(compressImageFile).not.toHaveBeenCalled();
  });

  it('o ouvinte global é removido ao desmontar', async () => {
    const { unmount } = setup();
    unmount();
    fireEvent.paste(document.body, { clipboardData: clipItems({ type: 'image/png', file: imageFile() }) });
    await new Promise(r => setTimeout(r, 20));
    expect(compressImageFile).not.toHaveBeenCalled();
  });
});
