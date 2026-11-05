/**
 * Testes de caracterização do gerenciador de pagamentos fixos: fixam o
 * comportamento observável (lista por dia, menu "Novo Pagamento", edição e
 * exclusão com senha de admin, modais, ESC) para a refatoração não mudar nada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { FixedNotification } from '@/shared/types';
import { FixedPaymentsManager } from './FixedPaymentsManager';
import { validateAnyAdminPassword } from '@/features/auth';

// O componente lê o hook por dois caminhos possíveis (barrel antes, arquivo depois)
const hookStub = vi.hoisted(() => ({
  useFixedPayments: vi.fn(() => ({
    payments: [], addPayment: vi.fn(), updatePayment: vi.fn(), deletePayment: vi.fn(),
    getPaymentsByDay: () => [], getUniqueDays: () => [], syncStatus: 'offline',
  })),
}));
vi.mock('@/features/fixed-payments', () => hookStub);
vi.mock('../hooks/useFixedPayments', () => hookStub);
vi.mock('@/shared/hooks', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/features/auth', () => ({ validateAnyAdminPassword: vi.fn() }));

const payments: FixedNotification[] = [
  { id: 'a', day: 5, description: 'Aluguel Loja' },
  { id: 'b', day: 5, description: 'Contabilidade', months: [1, 6] },
  { id: 'c', day: 10, description: 'Internet' },
  { id: 'd', day: 27, description: 'Seguro', customDate: '2026-11-27' },
  { id: 'e', day: 30, description: 'Taxa dia 30' },
];

type Status = 'synced' | 'syncing' | 'error' | 'offline';
const setup = (over: { syncStatus?: Status; payments?: FixedNotification[] } = {}) => {
  const list = over.payments ?? payments;
  const actions = {
    addPayment: vi.fn().mockResolvedValue(undefined),
    updatePayment: vi.fn().mockResolvedValue(undefined),
    deletePayment: vi.fn().mockResolvedValue(undefined),
  };
  const showToast = vi.fn();
  const utils = render(
    <FixedPaymentsManager
      showToast={showToast}
      payments={list}
      getUniqueDays={() => [...new Set(list.map(p => p.day))].sort((a, b) => a - b)}
      getPaymentsByDay={(d: number) => list.filter(p => p.day === d)}
      syncStatus={over.syncStatus ?? 'synced'}
      {...actions}
    />
  );
  return { ...utils, ...actions, showToast };
};

const dropdownInput = () => screen.getByPlaceholderText('Ex: Aluguel Loja Premium, Contabilidade...');
const openDropdown = () => fireEvent.click(screen.getByRole('button', { name: /Novo Pagamento Fixo/ }));
const expandDay = (day: number) =>
  fireEvent.click(
    screen.getAllByRole('button').find(b => b.textContent?.startsWith(`Dia ${day}`) && /pagamento/.test(b.textContent ?? ''))!
  );
const modalRoot = (title: string) => screen.getByRole('heading', { name: title }).closest('.fixed') as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date(2026, 10, 15, 14, 30, 0));
});
afterEach(() => vi.useRealTimers());

describe('Pagamentos fixos — cabeçalho e lista', () => {
  it('mostra o total cadastrado', () => {
    setup();
    expect(screen.getByText('Total: 5 pagamentos cadastrados')).toBeInTheDocument();
  });

  it.each([
    ['synced', 'Sincronizado'],
    ['syncing', 'Sincronizando...'],
    ['error', 'Erro de conexão'],
    ['offline', 'Offline'],
  ] as const)('status de sincronização: %s', (status, label) => {
    setup({ syncStatus: status });
    expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
  });

  it('"Sincronizado" mostra a hora da última sincronização', () => {
    setup({ syncStatus: 'synced' });
    expect(screen.getByText('14:30')).toBeInTheDocument();
  });

  it('agrupa por dia com a contagem no singular/plural', () => {
    setup();
    expect(screen.getByRole('button', { name: /Dia 5\s*2 pagamentos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dia 10\s*1 pagamento$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dia 27/ })).toBeInTheDocument();
  });

  it('os pagamentos só aparecem ao expandir o dia (e somem ao recolher)', () => {
    setup();
    expect(screen.queryByText('Aluguel Loja')).not.toBeInTheDocument();
    expandDay(5);
    expect(screen.getByText('Aluguel Loja')).toBeInTheDocument();
    expect(screen.getByText('Contabilidade')).toBeInTheDocument();
    expect(screen.queryByText('Internet')).not.toBeInTheDocument();
    expandDay(5);
    expect(screen.queryByText('Aluguel Loja')).not.toBeInTheDocument();
  });

  it('mostra os meses específicos como selos', () => {
    setup();
    expandDay(5);
    const badges = (label: string) => screen.getAllByText(label).filter(el => el.className.includes('purple'));
    expect(badges('Jan')).toHaveLength(1); // selo do pagamento (a grade de meses do menu não é roxa)
    expect(badges('Jun')).toHaveLength(1);
    expect(badges('Fev')).toHaveLength(0);
  });

  it('sem pagamentos, não há grupos', () => {
    setup({ payments: [] });
    expect(screen.getByText('Total: 0 pagamentos cadastrados')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dia \d+/ })).not.toBeInTheDocument();
  });
});

describe('Pagamentos fixos — novo pagamento (menu suspenso)', () => {
  it('abre e fecha pelo botão, e Cancelar descarta', () => {
    setup();
    openDropdown();
    expect(dropdownInput()).toBeInTheDocument();
    openDropdown(); // o mesmo botão fecha
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: 'texto' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);
    openDropdown();
    expect(dropdownInput()).toHaveValue(''); // reabrir limpa o formulário
  });

  it('descrição obrigatória: avisa e não salva', async () => {
    const { addPayment, showToast } = setup();
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(showToast).toHaveBeenCalledWith('Descrição é obrigatória.', 'error');
    expect(addPayment).not.toHaveBeenCalled();
  });

  it('adiciona com dia padrão 5, sem meses, descrição sem espaços nas pontas', async () => {
    const { addPayment, showToast } = setup();
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: '  Energia  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(addPayment).toHaveBeenCalledWith({ description: 'Energia', day: 5 }));
    expect(showToast).toHaveBeenCalledWith('Pagamento adicionado com sucesso!', 'success');
  });

  it('escolhe o dia pelos botões e os meses pela grade', async () => {
    const { addPayment } = setup();
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: 'Seguro' } });
    const panel = dropdownInput().closest('.space-y-4') as HTMLElement;
    fireEvent.click(within(panel).getByRole('button', { name: '15' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Mar' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Set' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Mar' })); // desmarca
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(addPayment).toHaveBeenCalledWith({ description: 'Seguro', day: 15, months: [9] }));
  });

  it('data específica define o dia pelo calendário e envia customDate', async () => {
    const { addPayment } = setup();
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: 'IPTU' } });
    const panel = dropdownInput().closest('.space-y-4') as HTMLElement;
    fireEvent.click(within(panel).getByRole('button', { name: 'Data Específica' }));
    fireEvent.change(panel.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2026-12-18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(addPayment).toHaveBeenCalledWith({ description: 'IPTU', day: 18, customDate: '2026-12-18' }));
  });

  it('depois de salvar, fecha o menu', async () => {
    setup();
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: 'Algo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(dropdownInput().closest('.invisible')).not.toBeNull());
  });

  it('erro ao salvar: mostra a mensagem e mantém o menu aberto', async () => {
    const { addPayment, showToast } = setup();
    addPayment.mockRejectedValueOnce(new Error('sem permissão'));
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: 'Vai falhar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('sem permissão', 'error'));
    expect(dropdownInput().closest('.invisible')).toBeNull();
    expect(dropdownInput()).toHaveValue('Vai falhar');
  });

  it('clique duplo em Adicionar não salva duas vezes', async () => {
    const { addPayment } = setup();
    let release!: () => void;
    addPayment.mockReturnValueOnce(new Promise<void>(r => { release = r; }));
    openDropdown();
    fireEvent.change(dropdownInput(), { target: { value: 'Uma vez' } });
    const btn = screen.getByRole('button', { name: 'Adicionar' });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('button', { name: 'Salvando...' }));
    release();
    await waitFor(() => expect(addPayment).toHaveBeenCalledTimes(1));
  });

  it('ESC fecha o menu', () => {
    setup();
    openDropdown();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dropdownInput().closest('.invisible')).not.toBeNull();
  });
});

describe('Pagamentos fixos — editar (exige senha de admin)', () => {
  const askEdit = (day: number, text: string) => {
    if (!screen.queryByText(text)) expandDay(day); // o dia pode já estar expandido
    const row = screen.getByText(text).closest('.rounded-xl') as HTMLElement;
    fireEvent.click(within(row).getByTitle('Editar'));
  };
  const typePasswordAndConfirm = (pwd: string) => {
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: pwd } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  };

  it('pede a senha; senha errada avisa e mantém o modal', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(false);
    const { showToast } = setup();
    askEdit(5, 'Aluguel Loja');
    expect(screen.getByText('Digite a senha de administrador para editar.')).toBeInTheDocument();
    typePasswordAndConfirm('errada');
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Senha incorreta.', 'error'));
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
  });

  it('senha correta abre o modal de edição preenchido', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    setup();
    askEdit(5, 'Contabilidade');
    typePasswordAndConfirm('certa');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Editar Pagamento' })).toBeInTheDocument());
    expect(validateAnyAdminPassword).toHaveBeenCalledWith('certa');
    expect(screen.queryByPlaceholderText('Senha')).not.toBeInTheDocument();
    const modal = within(modalRoot('Editar Pagamento'));
    expect(modal.getByPlaceholderText('Ex: Aluguel Loja Premium')).toHaveValue('Contabilidade');
    expect(modal.getByRole('combobox')).toHaveValue('5');
    expect(modal.getByRole('button', { name: 'Jan' }).className).toContain('bg-amber-400');
    expect(modal.getByRole('button', { name: 'Fev' }).className).not.toContain('bg-amber-400');
  });

  it('salvar atualiza (id + dados), avisa e fecha', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    const { updatePayment, showToast } = setup();
    askEdit(5, 'Contabilidade');
    typePasswordAndConfirm('certa');
    await screen.findByRole('heading', { name: 'Editar Pagamento' });
    const modal = within(modalRoot('Editar Pagamento'));
    fireEvent.change(modal.getByPlaceholderText('Ex: Aluguel Loja Premium'), { target: { value: 'Contabilidade Nova' } });
    fireEvent.change(modal.getByRole('combobox'), { target: { value: '10' } });
    fireEvent.click(modal.getByRole('button', { name: 'Mar' }));
    fireEvent.click(modal.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith('b', { description: 'Contabilidade Nova', day: 10, months: [1, 6, 3] }));
    expect(showToast).toHaveBeenCalledWith('Pagamento atualizado com sucesso!', 'success');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Editar Pagamento' })).not.toBeInTheDocument());
  });

  it('pagamento com data específica abre com o campo de data preenchido', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    setup();
    askEdit(27, 'Seguro');
    typePasswordAndConfirm('certa');
    await screen.findByRole('heading', { name: 'Editar Pagamento' });
    const modal = modalRoot('Editar Pagamento');
    expect((modal.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2026-11-27');
  });

  it('dia fora da lista fixa (30) aparece nas opções do modal', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    setup();
    askEdit(30, 'Taxa dia 30');
    typePasswordAndConfirm('certa');
    await screen.findByRole('heading', { name: 'Editar Pagamento' });
    const select = within(modalRoot('Editar Pagamento')).getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.value)).toEqual(['5', '10', '15', '20', '25', '27', '29', '30']);
    expect(select.value).toBe('30');
  });

  it('fecha o modal de edição por Cancelar, clique no fundo e ESC', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    setup();
    const openEdit = async () => {
      askEdit(5, 'Aluguel Loja');
      typePasswordAndConfirm('certa');
      await screen.findByRole('heading', { name: 'Editar Pagamento' });
    };
    await openEdit();
    fireEvent.click(within(modalRoot('Editar Pagamento')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Editar Pagamento' })).not.toBeInTheDocument();

    await openEdit();
    fireEvent.click(modalRoot('Editar Pagamento')); // fundo
    expect(screen.queryByRole('heading', { name: 'Editar Pagamento' })).not.toBeInTheDocument();

    await openEdit();
    fireEvent.click(screen.getByRole('heading', { name: 'Editar Pagamento' })); // dentro do cartão: não fecha
    expect(screen.getByRole('heading', { name: 'Editar Pagamento' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: 'Editar Pagamento' })).not.toBeInTheDocument();
  });

  it('Cancelar e ESC fecham o pedido de senha', () => {
    setup();
    askEdit(5, 'Aluguel Loja');
    fireEvent.click(within(screen.getByPlaceholderText('Senha').closest('.fixed') as HTMLElement).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByPlaceholderText('Senha')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByText('Aluguel Loja').closest('.rounded-xl') as HTMLElement).getByTitle('Editar'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Senha')).not.toBeInTheDocument();
  });
});

describe('Pagamentos fixos — excluir (exige senha de admin)', () => {
  const askDelete = (day: number, text: string) => {
    expandDay(day);
    const row = screen.getByText(text).closest('.rounded-xl') as HTMLElement;
    fireEvent.click(within(row).getByTitle('Excluir'));
  };
  const confirmWith = (pwd: string) => {
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: pwd } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  };

  it('pede a senha com o texto de exclusão', () => {
    setup();
    askDelete(10, 'Internet');
    expect(screen.getByRole('heading', { name: 'Excluir Pagamento' })).toBeInTheDocument();
    expect(screen.getByText('Digite a senha de administrador para excluir.')).toBeInTheDocument();
  });

  it('senha correta exclui pelo id e avisa', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    const { deletePayment, showToast } = setup();
    askDelete(10, 'Internet');
    confirmWith('certa');
    await waitFor(() => expect(deletePayment).toHaveBeenCalledWith('c'));
    expect(showToast).toHaveBeenCalledWith('Pagamento excluído com sucesso!', 'success');
    await waitFor(() => expect(screen.queryByPlaceholderText('Senha')).not.toBeInTheDocument());
  });

  it('senha errada não exclui', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(false);
    const { deletePayment, showToast } = setup();
    askDelete(10, 'Internet');
    confirmWith('errada');
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Senha incorreta.', 'error'));
    expect(deletePayment).not.toHaveBeenCalled();
  });

  it('erro ao excluir: mostra a mensagem do erro e fecha o pedido de senha', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    const { deletePayment, showToast } = setup();
    deletePayment.mockRejectedValueOnce(new Error('falhou na nuvem'));
    askDelete(10, 'Internet');
    confirmWith('certa');
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('falhou na nuvem', 'error'));
    await waitFor(() => expect(screen.queryByPlaceholderText('Senha')).not.toBeInTheDocument());
  });
});
