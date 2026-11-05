/**
 * Testes de caracterização do calendário: fixam o comportamento observável
 * (grade, abas, filtros, pagamento/correção/selecionar todos, tarefas) para a
 * refatoração em partes não mudar nada sem perceber. Usam os ícones reais.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { FixedNotification } from '@/shared/types';
import type { TodoItem } from '@/features/todo/types';
import { ExpenseCalendar } from './ExpenseCalendar';
import { validateAnyAdminPassword } from '@/features/auth';
import { openGoogleCalendar, openInGmail } from '@/features/todo/utils/calendarIntegration';
import { updateTodoDoc } from '@/features/todo/services/todoService';
import { playTodoAlertSound, playSynthesizedBeep } from '@/shared/utils/audio';
import { getCalendarBatchWriter } from '../hooks/useCalendar';

vi.mock('@/features/auth', () => ({ validateAnyAdminPassword: vi.fn() }));
vi.mock('@/features/todo/utils/calendarIntegration', () => ({
  openGoogleCalendar: vi.fn(),
  openInGmail: vi.fn(),
  getSavedContacts: vi.fn(() => []),
  saveContact: vi.fn(),
}));
vi.mock('@/features/todo/services/todoService', () => ({
  getCachedTodos: vi.fn(() => []),
  updateTodoDoc: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/utils/audio', () => ({
  playTodoAlertSound: vi.fn(),
  playSynthesizedBeep: vi.fn(),
  playCalendarAlertSound: vi.fn(),
}));
vi.mock('../hooks/useCalendar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useCalendar')>()),
  getCalendarBatchWriter: vi.fn(() => null),
}));

// 15/11/2026 (domingo; novembro/2026 começa num domingo e tem 30 dias)
const NOW = new Date(2026, 10, 15, 12, 0, 0);
const YEAR = 2026;
const MONTH = 10; // índice usado nas chaves de check

const payments: FixedNotification[] = [
  { id: 'p1', day: 5, description: 'Aluguel Loja' },
  { id: 'p2', day: 5, description: 'Contabilidade' },
  { id: 'p3', day: 10, description: 'Internet' },
  { id: 'p4', day: 10, description: 'internet ' }, // duplicado (mesmo dia + descrição sem diferenciar caixa/espaços)
  { id: 'p5', day: 15, description: 'Seguro Anual', months: [1, 2] }, // fora de novembro
  { id: 'p6', day: 20, description: 'Energia Loja Kassouf' }, // normaliza para "Energia Kassouf"
];

const T = (o: Partial<TodoItem> & { id: string; title: string }): TodoItem => ({
  completed: false, important: false, employeeName: 'Ana', userEmail: 'a@x.com', createdAt: '2026-01-01', ...o,
});
const todos: TodoItem[] = [
  T({ id: 'td1', title: 'Reunião', dueDate: '2026-11-12' }),
  T({ id: 'td2', title: 'Relatório pronto', dueDate: '2026-11-12', completed: true, important: true }),
  T({ id: 'td3', title: 'Outro mês', dueDate: '2026-12-01' }),
  T({
    id: 'td4', title: 'Entrega', dueDate: '2026-11-20', dueTime: '09:00', assignedTo: 'x@y.com', assignedToName: 'Xis',
    notes: 'Levar contrato', steps: [{ id: 's1', title: 'Imprimir', completed: true }, { id: 's2', title: 'Assinar', completed: false }],
  }),
];

type Props = Partial<React.ComponentProps<typeof ExpenseCalendar>>;
const setup = (props: Props = {}) => {
  const onToggleCheck = vi.fn();
  const showToast = vi.fn();
  const utils = render(
    <ExpenseCalendar
      fixedPayments={payments}
      checkedState={{}}
      onToggleCheck={onToggleCheck}
      showToast={showToast}
      todos={todos}
      {...props}
    />
  );
  return { ...utils, onToggleCheck, showToast };
};

const card = (text: string) => screen.getAllByText(text).find(el => el.tagName === 'P') as HTMLElement;
const cardRoot = (text: string) => card(text).closest('.rounded-xl.border') as HTMLElement;
const tab = (re: RegExp) => screen.getByRole('button', { name: re });

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(NOW);
  vi.mocked(getCalendarBatchWriter).mockReturnValue(null);
});
afterEach(() => vi.useRealTimers());

describe('Calendário — cabeçalho e navegação', () => {
  it('mostra o mês/ano atuais e navega entre meses', () => {
    setup();
    expect(screen.getByRole('heading', { name: /Novembro\s*2026/ })).toBeInTheDocument();
    const [prev, hoje, next] = Array.from(document.querySelectorAll('button')).slice(0, 3);
    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: /Dezembro\s*2026/ })).toBeInTheDocument();
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(screen.getByRole('heading', { name: /Outubro\s*2026/ })).toBeInTheDocument();
    fireEvent.click(hoje);
    expect(screen.getByRole('heading', { name: /Novembro\s*2026/ })).toBeInTheDocument();
  });

  it('virada de ano para frente e para trás', () => {
    setup();
    const [prev, , next] = Array.from(document.querySelectorAll('button')).slice(0, 3);
    fireEvent.click(next); fireEvent.click(next);
    expect(screen.getByRole('heading', { name: /Janeiro\s*2027/ })).toBeInTheDocument();
    fireEvent.click(prev); fireEvent.click(prev); fireEvent.click(prev);
    expect(screen.getByRole('heading', { name: /Outubro\s*2026/ })).toBeInTheDocument();
  });
});

describe('Calendário — grade do mês', () => {
  it('tem os 30 dias de novembro, destaca hoje e mostra pagamentos e tarefas do dia', () => {
    setup();
    for (let d = 1; d <= 30; d++) expect(screen.getAllByText(String(d)).length).toBeGreaterThan(0);
    const today = screen.getAllByText('15').find(el => el.className.includes('bg-amber-400')) as HTMLElement;
    expect(today).toBeTruthy();
    expect(screen.getByTitle('Pagamento: Aluguel Loja')).toBeInTheDocument();
    expect(screen.getByTitle('Pagamento: Contabilidade')).toBeInTheDocument();
    expect(screen.getByTitle('Tarefa: Reunião (Clique para detalhes)')).toBeInTheDocument();
    expect(screen.getByTitle('Tarefa: Entrega @ 09:00 (Clique para detalhes)')).toBeInTheDocument();
    expect(screen.queryByTitle('Tarefa: Outro mês (Clique para detalhes)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Pagamento: Seguro Anual')).not.toBeInTheDocument(); // só em jan/fev
  });

  it('pagamentos com "months" só aparecem nos meses indicados', () => {
    setup();
    const [, , next] = Array.from(document.querySelectorAll('button')).slice(0, 3);
    fireEvent.click(next); fireEvent.click(next); // jan/2027
    expect(screen.getByTitle('Pagamento: Seguro Anual')).toBeInTheDocument();
  });

  it('zoom: padrão, reduzir e ampliar, com limites desabilitados', () => {
    setup();
    const buttons = Array.from(document.querySelectorAll('button'));
    const zoomOut = buttons[3] as HTMLButtonElement;
    const zoomIn = buttons[4] as HTMLButtonElement;
    const cell = () => screen.getAllByText('20').find(el => el.tagName === 'SPAN')!.closest('.group') as HTMLElement;
    expect(cell().className).toContain('h-28 md:h-36');
    fireEvent.click(zoomOut);
    expect(cell().className).toContain('h-16');
    expect(zoomOut).toBeDisabled();
    fireEvent.click(zoomIn); fireEvent.click(zoomIn);
    expect(cell().className).toContain('h-40');
    expect(zoomIn).toBeDisabled();
  });
});

describe('Calendário — abas e filtro por dia', () => {
  it('mostra a contagem de cada aba (sem duplicados nem pagamentos de outros meses)', () => {
    setup();
    expect(tab(/^Pagamentos/).textContent).toBe('Pagamentos (4)'); // p1,p2,p3,p6 (p4 duplicado sai, p5 fora do mês)
    expect(tab(/^Tarefas To-Do/).textContent).toBe('Tarefas To-Do (3)');
    expect(tab(/^Todos \(/).textContent).toBe('Todos (7)');
  });

  it('cartões: um só "Internet" (duplicado removido) e sem o de outro mês', () => {
    setup();
    expect(screen.getAllByText('Internet').filter(el => el.tagName === 'P')).toHaveLength(1);
    expect(screen.queryByText('Seguro Anual')).not.toBeInTheDocument();
  });

  it('o título muda conforme a aba', () => {
    setup();
    expect(screen.getByText('Pagamentos Fixos de Novembro')).toBeInTheDocument();
    fireEvent.click(tab(/^Tarefas To-Do/));
    expect(screen.getByText('Tarefas Agendadas de Novembro')).toBeInTheDocument();
    fireEvent.click(tab(/^Todos \(/));
    expect(screen.getByText('Visão Completa do Mês (Novembro)')).toBeInTheDocument();
  });

  it('botões de dia vêm de todos os pagamentos; clicar filtra e clicar de novo limpa', () => {
    setup();
    ['Dia 5', 'Dia 10', 'Dia 15', 'Dia 20'].forEach(l => expect(screen.getByRole('button', { name: l })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Dia 10' }));
    expect(tab(/^Pagamentos/).textContent).toBe('Pagamentos (1)');
    expect(tab(/^Tarefas To-Do/).textContent).toBe('Tarefas To-Do (0)');
    fireEvent.click(screen.getByRole('button', { name: 'Dia 10' }));
    expect(tab(/^Pagamentos/).textContent).toBe('Pagamentos (4)');
    fireEvent.click(screen.getByRole('button', { name: 'Dia 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(tab(/^Pagamentos/).textContent).toBe('Pagamentos (4)');
  });

  it('filtro por dia também filtra as tarefas', () => {
    setup({ fixedPayments: [...payments, { id: 'p7', day: 12, description: 'Dia 12 qualquer' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Dia 12' }));
    expect(tab(/^Tarefas To-Do/).textContent).toBe('Tarefas To-Do (2)'); // td1, td2
  });

  it('no mês seguinte a lista reflete o novo mês', () => {
    setup();
    const [, , next] = Array.from(document.querySelectorAll('button')).slice(0, 3);
    fireEvent.click(next);
    expect(screen.getByText('Pagamentos Fixos de Dezembro')).toBeInTheDocument();
    expect(tab(/^Tarefas To-Do/).textContent).toBe('Tarefas To-Do (1)'); // td3 (01/12)
  });
});

describe('Calendário — marcar pagamento', () => {
  it('clicar abre a confirmação; "Não" fecha sem marcar', () => {
    const { onToggleCheck } = setup();
    fireEvent.click(card('Aluguel Loja'));
    expect(screen.getByText('Confirmar Pagamento?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Não' }));
    expect(screen.queryByText('Confirmar Pagamento?')).not.toBeInTheDocument();
    expect(onToggleCheck).not.toHaveBeenCalled();
  });

  it('"Sim, Pago" marca (chave ano-mês-descrição), fecha e avisa', () => {
    const { onToggleCheck, showToast } = setup();
    fireEvent.click(card('Aluguel Loja'));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Pago' }));
    expect(onToggleCheck).toHaveBeenCalledWith(`${YEAR}-${MONTH}-Aluguel Loja`, true);
    expect(showToast).toHaveBeenCalledWith('Marcado como Pago!', 'success');
    expect(screen.queryByText('Confirmar Pagamento?')).not.toBeInTheDocument();
  });

  it('a caixinha também abre a confirmação', () => {
    setup();
    const box = cardRoot('Contabilidade').querySelector('.w-5.h-5') as HTMLElement;
    fireEvent.click(box);
    expect(screen.getByText('Confirmar Pagamento?')).toBeInTheDocument();
  });

  it('ESC fecha a confirmação', () => {
    setup();
    fireEvent.click(card('Contabilidade'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Confirmar Pagamento?')).not.toBeInTheDocument();
  });
});

describe('Calendário — pagamentos já pagos', () => {
  it('chave normalizada marca como pago e o clique não faz nada', () => {
    const { onToggleCheck } = setup({ checkedState: { [`${YEAR}-${MONTH}-Aluguel Loja`]: true } });
    const root = cardRoot('Aluguel Loja');
    expect(within(root).getByText('Pago')).toBeInTheDocument();
    expect(within(root).getByRole('button', { name: 'Corrigir' })).toBeInTheDocument();
    fireEvent.click(card('Aluguel Loja'));
    expect(screen.queryByText('Confirmar Pagamento?')).not.toBeInTheDocument();
    expect(onToggleCheck).not.toHaveBeenCalled();
  });

  it('descrição com alias: a chave normalizada vale; a legada ("crua") é só fallback', () => {
    // só a chave crua (legada): conta como pago
    const a = setup({ checkedState: { [`${YEAR}-${MONTH}-Energia Loja Kassouf`]: true } });
    expect(within(cardRoot('Energia Loja Kassouf')).getByText('Pago')).toBeInTheDocument();
    a.unmount();
    // normalizada = false tem precedência sobre a crua = true
    setup({ checkedState: { [`${YEAR}-${MONTH}-Energia Kassouf`]: false, [`${YEAR}-${MONTH}-Energia Loja Kassouf`]: true } });
    expect(within(cardRoot('Energia Loja Kassouf')).queryByText('Pago')).not.toBeInTheDocument();
  });

  it('o rodapé mostra pendentes e muda quando tudo está pago', () => {
    const a = setup({ checkedState: { [`${YEAR}-${MONTH}-Aluguel Loja`]: true } });
    expect(a.container.textContent).toContain('3 de 4 pagamentos pendentes neste filtro.');
    a.unmount();
    const all: Record<string, boolean> = {};
    ['Aluguel Loja', 'Contabilidade', 'Internet', 'Energia Kassouf'].forEach(d => { all[`${YEAR}-${MONTH}-${d}`] = true; });
    const b = setup({ checkedState: all });
    expect(b.container.textContent).toContain('Todos os 4 pagamentos do período estão confirmados!');
    expect(screen.getByRole('button', { name: /Selecionar Todos/ })).toBeDisabled();
  });
});

describe('Calendário — corrigir status (senha de admin)', () => {
  const openFix = () => {
    setup_ = setup({ checkedState: { [`${YEAR}-${MONTH}-Aluguel Loja`]: true } });
    fireEvent.click(within(cardRoot('Aluguel Loja')).getByRole('button', { name: 'Corrigir' }));
  };
  let setup_: ReturnType<typeof setup>;

  it('senha errada: avisa e mantém o modal', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(false);
    openFix();
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Corrigir' })[0]); // o do modal vem antes dos cartões
    await waitFor(() => expect(setup_.showToast).toHaveBeenCalledWith('Senha incorreta.', 'error'));
    expect(screen.getByText('Corrigir Status')).toBeInTheDocument();
    expect(setup_.onToggleCheck).not.toHaveBeenCalled();
  });

  it('senha correta: desmarca, fecha e avisa', async () => {
    vi.mocked(validateAnyAdminPassword).mockResolvedValue(true);
    openFix();
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'certa' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Corrigir' })[0]); // o do modal vem antes dos cartões
    await waitFor(() => expect(setup_.onToggleCheck).toHaveBeenCalledWith(`${YEAR}-${MONTH}-Aluguel Loja`, false));
    expect(setup_.showToast).toHaveBeenCalledWith('Correção realizada.', 'success');
    expect(screen.queryByText('Corrigir Status')).not.toBeInTheDocument();
    expect(validateAnyAdminPassword).toHaveBeenCalledWith('certa');
  });

  it('cancelar e reabrir limpa a senha digitada; ESC fecha', () => {
    openFix();
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Corrigir Status')).not.toBeInTheDocument();
    fireEvent.click(within(cardRoot('Aluguel Loja')).getByRole('button', { name: 'Corrigir' }));
    expect(screen.getByPlaceholderText('Senha')).toHaveValue('');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Corrigir Status')).not.toBeInTheDocument();
  });
});

describe('Calendário — selecionar todos', () => {
  const openSelectAll = () => fireEvent.click(screen.getByRole('button', { name: /Selecionar Todos/ }));

  it('lista os pendentes no modal e grava em lote (uma escrita)', () => {
    const batch = vi.fn();
    const { showToast, onToggleCheck } = setup({ setManyChecks: batch, checkedState: { [`${YEAR}-${MONTH}-Aluguel Loja`]: true } });
    openSelectAll();
    expect(screen.getByText('Confirmar Todos como Pagos?')).toBeInTheDocument();
    expect(screen.getByText('3 pagamento(s)')).toBeInTheDocument();
    expect(screen.getByText(/do filtro selecionado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Confirmar Todos' }));
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch).toHaveBeenCalledWith([
      { key: `${YEAR}-${MONTH}-Contabilidade`, status: true },
      { key: `${YEAR}-${MONTH}-Internet`, status: true },
      { key: `${YEAR}-${MONTH}-Energia Loja Kassouf`, status: true },
    ]);
    expect(onToggleCheck).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('3 pagamento(s) confirmado(s) como pago(s)!', 'success');
    expect(screen.queryByText('Confirmar Todos como Pagos?')).not.toBeInTheDocument();
  });

  it('com filtro de dia, o modal cita o dia', () => {
    setup({ setManyChecks: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: 'Dia 5' }));
    openSelectAll();
    expect(screen.getByText(/do Dia 5/)).toBeInTheDocument();
    expect(screen.getByText('2 pagamento(s)')).toBeInTheDocument();
  });

  it('usa o escritor em lote registrado pelo hook quando não há prop', () => {
    const registered = vi.fn();
    vi.mocked(getCalendarBatchWriter).mockReturnValue(registered);
    const { onToggleCheck } = setup();
    openSelectAll();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Confirmar Todos' }));
    expect(registered).toHaveBeenCalledTimes(1);
    expect(onToggleCheck).not.toHaveBeenCalled();
  });

  it('sem escritor em lote, cai para uma chamada por item', () => {
    const { onToggleCheck } = setup();
    openSelectAll();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Confirmar Todos' }));
    expect(onToggleCheck).toHaveBeenCalledTimes(4);
    expect(onToggleCheck).toHaveBeenCalledWith(`${YEAR}-${MONTH}-Aluguel Loja`, true);
  });

  it('cancelar e ESC fecham sem gravar', () => {
    const batch = vi.fn();
    setup({ setManyChecks: batch });
    openSelectAll();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    openSelectAll();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Confirmar Todos como Pagos?')).not.toBeInTheDocument();
    expect(batch).not.toHaveBeenCalled();
  });
});

describe('Calendário — tarefas (To-Do)', () => {
  const openTodoModal = (title = 'Reunião') => fireEvent.click(screen.getByTitle(new RegExp(`^Tarefa: ${title}`)));

  it('aviso de sincronização aparece só quando há erro', () => {
    const a = setup({ todos });
    expect(screen.queryByText('Aviso de Sincronização')).not.toBeInTheDocument();
    a.unmount();
    setup({ todos, syncError: 'Sem conexão com a nuvem' });
    expect(screen.getByText('Aviso de Sincronização')).toBeInTheDocument();
    expect(screen.getByText('Sem conexão com a nuvem')).toBeInTheDocument();
  });

  it('modal de detalhes: título, status, vencimento, responsável, notas e etapas', () => {
    setup({ todos });
    openTodoModal('Entrega');
    expect(screen.getByRole('heading', { name: 'Entrega' })).toBeInTheDocument();
    expect(screen.getByText('⏳ Pendente')).toBeInTheDocument();
    expect(screen.getByText('20/11/2026')).toBeInTheDocument();
    expect(screen.getByText('às 09:00')).toBeInTheDocument();
    expect(screen.getByText('Xis')).toBeInTheDocument();
    expect(screen.getByText('Levar contrato')).toBeInTheDocument();
    expect(screen.getByText('Etapas (1/2):')).toBeInTheDocument();
  });

  it('fecha pelo X e por ESC', () => {
    setup({ todos });
    openTodoModal();
    fireEvent.click(document.querySelector('.fixed.inset-0 button') as HTMLElement); // X do modal
    expect(screen.queryByRole('button', { name: 'Concluir Tarefa' })).not.toBeInTheDocument();
    openTodoModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Concluir Tarefa' })).not.toBeInTheDocument();
  });

  it('concluir pelo modal (caminho local): toca o alerta, grava e avisa', async () => {
    const { showToast } = setup({ todos });
    openTodoModal();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Tarefa' }));
    expect(playTodoAlertSound).toHaveBeenCalled();
    await waitFor(() => expect(updateTodoDoc).toHaveBeenCalledWith('td1', { completed: true, completedAt: expect.any(String) }));
    expect(showToast).toHaveBeenCalledWith('Tarefa concluída!', 'success');
    expect(screen.getByRole('button', { name: 'Reabrir Tarefa' })).toBeInTheDocument();
  });

  it('reabrir toca o bipe e grava sem data de conclusão', async () => {
    const { showToast } = setup({ todos });
    openTodoModal('Relatório pronto');
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir Tarefa' }));
    expect(playSynthesizedBeep).toHaveBeenCalled();
    await waitFor(() => expect(updateTodoDoc).toHaveBeenCalledWith('td2', { completed: false, completedAt: undefined }));
    expect(showToast).toHaveBeenCalledWith('Marcada como pendente', 'success');
  });

  it('com onToggleTodo, delega e NÃO toca som nem grava (evita duplicar)', async () => {
    const onToggleTodo = vi.fn();
    setup({ todos, onToggleTodo });
    openTodoModal();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Tarefa' }));
    await waitFor(() => expect(onToggleTodo).toHaveBeenCalledWith('td1'));
    expect(playTodoAlertSound).not.toHaveBeenCalled();
    expect(updateTodoDoc).not.toHaveBeenCalled();
  });

  it('Google Agenda e Gmail (só com responsável)', () => {
    const { showToast } = setup({ todos });
    openTodoModal();
    expect(screen.queryByTitle('Notificar por Gmail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Adicionar ao Google Agenda'));
    expect(openGoogleCalendar).toHaveBeenCalledWith(expect.objectContaining({ id: 'td1' }));
    expect(showToast).toHaveBeenCalledWith('Abrindo Google Agenda com evento configurado! 📅', 'info');
    fireEvent.keyDown(window, { key: 'Escape' });
    openTodoModal('Entrega');
    fireEvent.click(screen.getByTitle('Notificar por Gmail'));
    expect(openInGmail).toHaveBeenCalledWith(expect.objectContaining({ id: 'td4' }));
    expect(showToast).toHaveBeenCalledWith('Abrindo Gmail...', 'info');
  });

  it('aba de tarefas: lista do mês, vazio e ações rápidas', async () => {
    const { showToast } = setup({ todos });
    fireEvent.click(tab(/^Tarefas To-Do/));
    ['Reunião', 'Relatório pronto', 'Entrega'].forEach(t =>
      expect(screen.getAllByText(t).some(el => el.tagName === 'P')).toBe(true)
    );
    expect(screen.queryByText('Outro mês')).not.toBeInTheDocument();
    expect(screen.getByText('Dia 20 @ 09:00')).toBeInTheDocument();

    const root = (t: string) =>
      screen.getAllByText(t).find(el => el.tagName === 'P')!.closest('.rounded-xl.border') as HTMLElement;
    fireEvent.click(root('Reunião').querySelector('.cursor-pointer') as HTMLElement); // checkbox
    expect(showToast).toHaveBeenCalledWith('Tarefa concluída! 🎉', 'success');
    fireEvent.click(root('Relatório pronto').querySelector('.cursor-pointer') as HTMLElement);
    expect(showToast).toHaveBeenCalledWith('Tarefa reaberta', 'success');
    fireEvent.click(within(root('Entrega')).getByTitle('Abrir no Gmail'));
    expect(openInGmail).toHaveBeenCalledWith(expect.objectContaining({ id: 'td4' }));
    fireEvent.click(within(root('Entrega')).getByTitle('Adicionar / Abrir no Google Agenda'));
    expect(showToast).toHaveBeenCalledWith('Abrindo Google Agenda... 📅', 'info');
    await waitFor(() => expect(updateTodoDoc).toHaveBeenCalled());
  });

  it('aba de tarefas sem resultados mostra o estado vazio', () => {
    setup({ todos: [] });
    fireEvent.click(tab(/^Tarefas To-Do/));
    expect(screen.getByText('Nenhuma tarefa To-Do agendada para este filtro')).toBeInTheDocument();
  });

  it('aba "Todos" mostra pagamentos e tarefas juntos', () => {
    setup({ todos });
    fireEvent.click(tab(/^Todos \(/));
    expect(screen.getByText('Pagamentos Fixos')).toBeInTheDocument();
    expect(screen.getByText(/Tarefas To-Do Agendadas \(3\)/)).toBeInTheDocument();
  });

  it('as tarefas recebidas por prop atualizam a tela', () => {
    const { rerender, onToggleCheck, showToast } = setup({ todos: [] });
    expect(screen.queryByTitle(/^Tarefa: Reunião/)).not.toBeInTheDocument();
    rerender(<ExpenseCalendar fixedPayments={payments} checkedState={{}} onToggleCheck={onToggleCheck} showToast={showToast} todos={todos} />);
    expect(screen.getByTitle(/^Tarefa: Reunião/)).toBeInTheDocument();
  });
});
