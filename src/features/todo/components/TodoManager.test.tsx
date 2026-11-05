/**
 * Testes de caracterização do To-Do: fixam o comportamento observável da tela
 * (filtros, contagens, seções de "Meu Dia", criação, cartões, painel de
 * detalhes) para que a refatoração em partes não mude nada sem perceber.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { useTodo } from '../hooks/useTodo';
import type { TodoItem } from '../types';
import { TodoManager } from './TodoManager';
import { getTodayLocal, formatDateBR } from '@/shared/utils/formatters';
import { playCalendarAlertSound, playTodoAlertSound } from '@/shared/utils/audio';
import { openGoogleCalendar, openInGmail, downloadIcsFile } from '../utils/calendarIntegration';

vi.mock('../hooks/useTodo', () => ({ useTodo: vi.fn(() => ({})) }));
vi.mock('@/shared/utils/audio', () => ({
  playCalendarAlertSound: vi.fn(),
  playTodoAlertSound: vi.fn(),
}));
vi.mock('../utils/calendarIntegration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/calendarIntegration')>()),
  openGoogleCalendar: vi.fn(),
  openInGmail: vi.fn(),
  downloadIcsFile: vi.fn(),
}));

const ME = 'eu@miplace.com';
const TODAY = getTodayLocal();
const addDays = (date: string, n: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const task = (over: Partial<TodoItem> & { id: string; title: string }): TodoItem => ({
  completed: false,
  important: false,
  employeeName: 'Ana',
  userEmail: 'outro@miplace.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const makeTodos = (): TodoItem[] => [
  task({ id: 't1', title: 'Atrasada A', dueDate: addDays(TODAY, -2) }),
  task({
    id: 't2', title: 'Hoje B', dueDate: TODAY, important: true, assignedTo: 'EU@miplace.com',
    steps: [
      { id: 's1', title: 'Passo um', completed: false },
      { id: 's2', title: 'Passo dois', completed: true },
    ],
  }),
  task({ id: 't3', title: 'Sem data C', notes: 'Ligar fornecedor' }),
  task({
    id: 't4', title: 'Futura D', dueDate: addDays(TODAY, 3), dueTime: '10:30', repeat: 'weekly',
    assignedTo: 'maria@gmail.com', assignedToName: 'Maria',
  }),
  task({ id: 't5', title: 'Feita E', completed: true, dueDate: TODAY }),
  task({ id: 't6', title: 'Feita antiga F', completed: true, dueDate: addDays(TODAY, -10) }),
  task({ id: 't7', title: 'Minha G', dueDate: addDays(TODAY, 1), userEmail: ME }),
];

const makeActions = () => ({
  addTodo: vi.fn().mockResolvedValue(undefined),
  toggleComplete: vi.fn(),
  toggleImportant: vi.fn(),
  deleteTodo: vi.fn(),
  updateTodo: vi.fn(),
  addStep: vi.fn().mockResolvedValue(undefined),
  toggleStep: vi.fn(),
  deleteStep: vi.fn(),
});

type Setup = { todos?: TodoItem[]; isLoading?: boolean };
const setup = ({ todos = makeTodos(), isLoading = false }: Setup = {}) => {
  const actions = makeActions();
  const showToast = vi.fn();
  const build = (t: TodoItem[], loading = isLoading) =>
    (
      <TodoManager
        employeeName="Ana"
        userEmail={ME}
        showToast={showToast}
        todoData={{ todos: t, isLoading: loading, ...actions } as unknown as ReturnType<typeof useTodo>}
      />
    );
  const utils = render(build(todos));
  return { ...utils, actions, showToast, rerenderWith: (t: TodoItem[]) => utils.rerender(build(t)) };
};

const clickFilter = (label: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
const filterButton = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });
const visible = (titles: string[]) => titles.forEach(t => expect(screen.getByText(t)).toBeInTheDocument());
const hidden = (titles: string[]) => titles.forEach(t => expect(screen.queryByText(t)).not.toBeInTheDocument());
const card = (title: string) => screen.getByText(title).closest('.group') as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('TodoManager — contagens da barra lateral', () => {
  it('conta cada lista com as regras atuais', () => {
    setup();
    expect(filterButton('Meu Dia').textContent).toBe('Meu Dia3'); // t1,t2,t3 (concluídas não contam)
    expect(filterButton('Importantes').textContent).toBe('Importantes1');
    expect(filterButton('Planejadas').textContent).toBe('Planejadas4'); // t1,t2,t4,t7
    expect(filterButton('Atribuídas / Gmail').textContent).toBe('Atribuídas / Gmail2'); // e-mail sem diferenciar caixa + criadas por mim
    expect(filterButton('Todas as Tarefas').textContent).toBe('Todas as Tarefas5');
    expect(filterButton('Concluídas').textContent).toBe('Concluídas2');
  });
});

describe('TodoManager — "Meu Dia" (padrão)', () => {
  it('mostra atrasadas, hoje/sem data e concluídas; esconde as futuras', () => {
    setup();
    visible(['Atrasada A', 'Hoje B', 'Sem data C', 'Feita E', 'Feita antiga F']);
    hidden(['Futura D', 'Minha G']);
    expect(screen.getByText(/Atrasadas \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tarefas de Hoje \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Concluídas \(2\)/)).toBeInTheDocument();
  });

  it('avisa das tarefas futuras e o botão leva para Planejadas', () => {
    setup();
    expect(screen.getByText(/tarefa\(s\) agendada\(s\) para datas futuras/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver Planejadas/ }));
    visible(['Atrasada A', 'Hoje B', 'Futura D', 'Minha G']);
    hidden(['Sem data C', 'Feita E']);
  });

  it('sem pendências hoje: parabeniza quando há concluídas', () => {
    setup({ todos: [task({ id: 'x', title: 'Só concluída', completed: true, dueDate: TODAY })] });
    expect(screen.getByText(/Todas as tarefas de hoje foram concluídas/)).toBeInTheDocument();
  });

  it('sem nada: mostra o estado vazio', () => {
    setup({ todos: [] });
    expect(screen.getByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
  });

  it('carregando: mostra o indicador de sincronização', () => {
    setup({ isLoading: true });
    expect(screen.getByText('Sincronizando tarefas...')).toBeInTheDocument();
    hidden(['Atrasada A']);
  });
});

describe('TodoManager — filtros', () => {
  it.each([
    ['Importantes', ['Hoje B'], ['Atrasada A', 'Sem data C', 'Futura D', 'Feita E']],
    ['Planejadas', ['Atrasada A', 'Hoje B', 'Futura D', 'Minha G'], ['Sem data C', 'Feita E']],
    ['Atribuídas / Gmail', ['Hoje B', 'Minha G'], ['Atrasada A', 'Futura D']],
    ['Todas as Tarefas', ['Atrasada A', 'Hoje B', 'Sem data C', 'Futura D', 'Minha G'], ['Feita E', 'Feita antiga F']],
    ['Concluídas', ['Feita E', 'Feita antiga F'], ['Atrasada A', 'Hoje B']],
  ])('%s', (label, shown, notShown) => {
    setup();
    clickFilter(label);
    visible(shown);
    hidden(notShown);
  });

  it('o cabeçalho acompanha a lista ativa', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Meu Dia' })).toBeInTheDocument();
    clickFilter('Importantes');
    expect(screen.getByRole('heading', { name: 'Importantes' })).toBeInTheDocument();
    clickFilter('Concluídas');
    expect(screen.getByRole('heading', { name: 'Concluídas' })).toBeInTheDocument();
  });
});

describe('TodoManager — busca', () => {
  const search = (q: string) => fireEvent.change(screen.getByPlaceholderText('Pesquisar...'), { target: { value: q } });

  it.each([
    ['atrasada', ['Atrasada A'], ['Hoje B']], // título, sem diferenciar caixa
    ['fornecedor', ['Sem data C'], ['Hoje B']], // anotações
    ['maria', ['Futura D'], ['Hoje B']], // nome do responsável (em "Todas")
    ['passo dois', ['Hoje B'], ['Atrasada A']], // título de etapa
  ])('busca por "%s"', (q, shown, notShown) => {
    setup();
    clickFilter('Todas as Tarefas');
    search(q);
    visible(shown);
    hidden(notShown);
  });

  it('combina a busca com a lista ativa', () => {
    setup();
    clickFilter('Concluídas');
    search('atrasada'); // existe, mas não está concluída
    expect(screen.getByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
  });
});

describe('TodoManager — cartões', () => {
  it('mostra selos de data, atraso, repetição, responsável e etapas', () => {
    setup();
    clickFilter('Todas as Tarefas');
    expect(within(card('Atrasada A')).getByText(`Atrasada: ${formatDateBR(addDays(TODAY, -2))}`)).toBeInTheDocument();
    expect(within(card('Hoje B')).getByText('Hoje')).toBeInTheDocument();
    expect(within(card('Hoje B')).getByText('1 de 2 etapas')).toBeInTheDocument();
    const d = card('Futura D');
    expect(within(d).getByText(`Agendada: ${formatDateBR(addDays(TODAY, 3))} @ 10:30`)).toBeInTheDocument();
    expect(within(d).getByText('Semanal')).toBeInTheDocument();
    expect(within(d).getByText('Maria')).toBeInTheDocument();
  });

  it('o botão de concluir não abre o painel', () => {
    const { actions } = setup();
    fireEvent.click(within(card('Atrasada A')).getByTitle('Concluir tarefa'));
    expect(actions.toggleComplete).toHaveBeenCalledWith('t1');
    expect(screen.queryByText(/Checklist de Etapas/)).not.toBeInTheDocument();
  });

  it('a estrela alterna a prioridade sem abrir o painel', () => {
    const { actions } = setup();
    fireEvent.click(within(card('Atrasada A')).getByTitle('Alternar prioridade importante'));
    expect(actions.toggleImportant).toHaveBeenCalledWith('t1');
    expect(screen.queryByText(/Checklist de Etapas/)).not.toBeInTheDocument();
  });

  it('Google Agenda: abre o evento e avisa', () => {
    const { showToast } = setup();
    fireEvent.click(within(card('Atrasada A')).getByTitle('Adicionar ao Google Agenda / Google Calendar'));
    expect(openGoogleCalendar).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    expect(showToast).toHaveBeenCalledWith('Abrindo Google Agenda com evento configurado! 📅', 'info');
  });

  it('Gmail só existe para tarefas atribuídas', () => {
    const { showToast } = setup();
    clickFilter('Todas as Tarefas');
    expect(within(card('Sem data C')).queryByTitle(/Abrir e-mail no Gmail/)).not.toBeInTheDocument();
    fireEvent.click(within(card('Futura D')).getByTitle('Abrir e-mail no Gmail para maria@gmail.com'));
    expect(openInGmail).toHaveBeenCalledWith(expect.objectContaining({ id: 't4' }));
    expect(showToast).toHaveBeenCalledWith('Abrindo rascunho no Gmail para maria@gmail.com... ✉️', 'info');
  });
});

describe('TodoManager — nova tarefa', () => {
  const titleInput = () => screen.getByPlaceholderText('Adicionar uma tarefa...');
  const submit = () => fireEvent.click(screen.getByRole('button', { name: /Adicionar$/ }));

  it('o botão fica desabilitado com título vazio ou só espaços', () => {
    setup();
    expect(screen.getByRole('button', { name: /Adicionar$/ })).toBeDisabled();
    fireEvent.change(titleInput(), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /Adicionar$/ })).toBeDisabled();
  });

  it('em "Meu Dia", agenda para hoje, limpa o campo e avisa', async () => {
    const { actions, showToast } = setup();
    fireEvent.change(titleInput(), { target: { value: 'Comprar café' } });
    submit();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalledTimes(1));
    expect(actions.addTodo).toHaveBeenCalledWith('Comprar café', TODAY, undefined, false, '', 'none', undefined, undefined);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Tarefa adicionada com sucesso! ✨', 'success'));
    expect(titleInput()).toHaveValue('');
  });

  it('fora de "Meu Dia", não define data automática', async () => {
    const { actions } = setup();
    clickFilter('Todas as Tarefas');
    fireEvent.change(titleInput(), { target: { value: 'Sem data' } });
    submit();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalled());
    expect(actions.addTodo.mock.calls[0][1]).toBeUndefined();
  });

  it('com data futura: agenda e avisa a data', async () => {
    const { actions, showToast } = setup();
    const future = addDays(TODAY, 5);
    fireEvent.focus(titleInput());
    fireEvent.change(titleInput(), { target: { value: 'Reunião' } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: future } });
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '09:15' } });
    submit();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalled());
    expect(actions.addTodo).toHaveBeenCalledWith('Reunião', future, '09:15', false, '', 'none', undefined, undefined);
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(`Tarefa adicionada e agendada para ${formatDateBR(future)}! 📅`, 'success')
    );
  });

  it('importante e repetição seguem para o addTodo', async () => {
    const { actions } = setup();
    fireEvent.focus(titleInput());
    fireEvent.change(titleInput(), { target: { value: 'Relatório' } });
    fireEvent.click(screen.getByTitle('Marcar como importante'));
    fireEvent.change(screen.getByDisplayValue('Não repetir'), { target: { value: 'weekly' } });
    submit();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalled());
    expect(actions.addTodo).toHaveBeenCalledWith('Relatório', TODAY, undefined, true, '', 'weekly', undefined, undefined);
  });

  it('atribuir a um contato salvo', async () => {
    localStorage.setItem('miplace_todo_saved_contacts', JSON.stringify(['maria@gmail.com']));
    const { actions } = setup();
    fireEvent.focus(titleInput());
    fireEvent.change(titleInput(), { target: { value: 'Revisar' } });
    const select = screen.getByDisplayValue('Atribuir a (Gmail)...');
    fireEvent.change(select, { target: { value: 'maria@gmail.com' } });
    submit();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalled());
    expect(actions.addTodo.mock.calls[0].slice(6)).toEqual(['maria@gmail.com', 'maria@gmail.com']);
  });

  it('digitar outro e-mail: usa o digitado e o salva como contato', async () => {
    const { actions } = setup();
    fireEvent.focus(titleInput());
    fireEvent.change(titleInput(), { target: { value: 'Enviar proposta' } });
    fireEvent.change(screen.getByDisplayValue('Atribuir a (Gmail)...'), { target: { value: 'CUSTOM_EMAIL' } });
    fireEvent.change(screen.getByPlaceholderText('exemplo@gmail.com'), { target: { value: 'novo@gmail.com' } });
    submit();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalled());
    expect(actions.addTodo.mock.calls[0].slice(6)).toEqual(['novo@gmail.com', 'novo@gmail.com']);
    expect(JSON.parse(localStorage.getItem('miplace_todo_saved_contacts') || '[]')).toContain('novo@gmail.com');
  });

  it('falha ao salvar: avisa o erro e NÃO limpa o campo', async () => {
    const { actions, showToast } = setup();
    actions.addTodo.mockRejectedValueOnce(new Error('sem permissão'));
    fireEvent.change(titleInput(), { target: { value: 'Vai falhar' } });
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Erro ao adicionar tarefa: sem permissão', 'error'));
    expect(titleInput()).toHaveValue('Vai falhar');
  });

  it('clique duplo não cria duas tarefas', async () => {
    const { actions } = setup();
    let release!: () => void;
    actions.addTodo.mockReturnValueOnce(new Promise<void>(r => { release = r; }));
    fireEvent.change(titleInput(), { target: { value: 'Uma só' } });
    submit();
    fireEvent.submit(titleInput().closest('form') as HTMLFormElement);
    release();
    await waitFor(() => expect(actions.addTodo).toHaveBeenCalledTimes(1));
  });
});

describe('TodoManager — painel de detalhes', () => {
  const open = (title = 'Hoje B') => fireEvent.click(screen.getByText(title));
  const drawer = () => screen.getByText(/Checklist de Etapas/).closest('.sticky') as HTMLElement;

  it('abre ao clicar no cartão e mostra etapas e responsável', () => {
    setup();
    open();
    expect(screen.getByText('Checklist de Etapas (1/2)')).toBeInTheDocument();
    expect(screen.getByText('Passo um')).toBeInTheDocument();
    expect(screen.getByText('Criado por Ana')).toBeInTheDocument();
  });

  it('trocar a lista fecha o painel', () => {
    setup();
    open();
    clickFilter('Importantes');
    expect(screen.queryByText(/Checklist de Etapas/)).not.toBeInTheDocument();
  });

  it('o botão Fechar fecha o painel', () => {
    setup();
    open();
    fireEvent.click(screen.getByTitle('Fechar detalhes'));
    expect(screen.queryByText(/Checklist de Etapas/)).not.toBeInTheDocument();
  });

  it('se a tarefa deixa de existir, o painel fecha sozinho', () => {
    const { rerenderWith } = setup();
    open();
    rerenderWith(makeTodos().filter(t => t.id !== 't2'));
    expect(screen.queryByText(/Checklist de Etapas/)).not.toBeInTheDocument();
  });

  it('edita título, anotações, data, horário e repetição', () => {
    const { actions } = setup();
    open();
    const d = within(drawer());
    fireEvent.change(d.getByPlaceholderText('Título da tarefa...'), { target: { value: 'Novo título' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { title: 'Novo título' });
    fireEvent.change(d.getByPlaceholderText('Adicionar anotação...'), { target: { value: 'nota' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { notes: 'nota' });
    fireEvent.change(drawer().querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2030-01-02' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { dueDate: '2030-01-02' });
    fireEvent.change(drawer().querySelector('input[type="time"]') as HTMLInputElement, { target: { value: '08:00' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { dueTime: '08:00' });
    fireEvent.change(d.getByDisplayValue('Não repetir'), { target: { value: 'daily' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { repeat: 'daily' });
  });

  it('remove a data de vencimento', () => {
    const { actions } = setup();
    open();
    fireEvent.click(screen.getByTitle('Remover data'));
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { dueDate: undefined });
  });

  it('etapas: adicionar (sem espaços nas pontas), alternar e remover', async () => {
    const { actions } = setup();
    open();
    const input = screen.getByPlaceholderText('Adicionar etapa...');
    expect(screen.getByRole('button', { name: 'Ok' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '  Novo passo  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }));
    await waitFor(() => expect(actions.addStep).toHaveBeenCalledWith('t2', 'Novo passo'));
    await waitFor(() => expect(input).toHaveValue(''));

    fireEvent.click(screen.getByText('Passo um').previousElementSibling as HTMLElement);
    expect(actions.toggleStep).toHaveBeenCalledWith('t2', 's1');
    fireEvent.click(screen.getAllByTitle('Remover etapa')[1]);
    expect(actions.deleteStep).toHaveBeenCalledWith('t2', 's2');
  });

  it('atribuição por e-mail salva o contato; apagar o campo limpa o responsável', () => {
    const { actions } = setup();
    open();
    const input = screen.getByPlaceholderText(/Digite qualquer e-mail/);
    fireEvent.change(input, { target: { value: 'ana@gmail.com' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { assignedTo: 'ana@gmail.com', assignedToName: 'ana@gmail.com' });
    expect(JSON.parse(localStorage.getItem('miplace_todo_saved_contacts') || '[]')).toContain('ana@gmail.com');
    fireEvent.change(input, { target: { value: '' } });
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { assignedTo: undefined, assignedToName: undefined });
  });

  it('contatos recentes atribuem com um clique (até 4)', () => {
    localStorage.setItem('miplace_todo_saved_contacts', JSON.stringify(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com']));
    const { actions } = setup();
    open();
    expect(screen.getByText('Contatos recentes:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'e@x.com' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'b@x.com' }));
    expect(actions.updateTodo).toHaveBeenLastCalledWith('t2', { assignedTo: 'b@x.com', assignedToName: 'b@x.com' });
  });

  it('integrações: Google Agenda, .ics e Gmail', () => {
    const { showToast } = setup();
    open();
    fireEvent.click(within(drawer()).getByRole('button', { name: /Adicionar ao Google Agenda/ }));
    expect(openGoogleCalendar).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    fireEvent.click(screen.getByTitle('Baixar arquivo .ics para Outlook ou Apple Calendar'));
    expect(downloadIcsFile).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    expect(showToast).toHaveBeenCalledWith('Arquivo de calendário (.ics) baixado! 📥', 'success');
    fireEvent.click(screen.getByRole('button', { name: /Notificar no Gmail/ }));
    expect(openInGmail).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    expect(showToast).toHaveBeenCalledWith('Abrindo rascunho no Gmail para EU@miplace.com... ✉️', 'info');
    const mail = screen.getByTitle('Enviar por aplicativo de e-mail padrão') as HTMLAnchorElement;
    expect(mail.getAttribute('href')).toBe(`mailto:EU@miplace.com?subject=${encodeURIComponent('Tarefa: Hoje B')}`);
  });

  it('sem responsável, não há botões de Gmail no painel', () => {
    setup();
    open('Sem data C');
    expect(screen.queryByRole('button', { name: /Notificar no Gmail/ })).not.toBeInTheDocument();
  });

  it('concluir e priorizar pelo painel', () => {
    const { actions } = setup();
    open('Atrasada A');
    const d = within(drawer());
    fireEvent.click(d.getByTitle('Marcar como importante'));
    expect(actions.toggleImportant).toHaveBeenCalledWith('t1');
    fireEvent.click(drawer().querySelector('button.text-slate-300') as HTMLElement); // marcador de concluída
    expect(actions.toggleComplete).toHaveBeenCalledWith('t1');
  });

  it('excluir: remove, fecha o painel e avisa', () => {
    const { actions, showToast } = setup();
    open();
    fireEvent.click(screen.getByTitle('Excluir tarefa'));
    expect(actions.deleteTodo).toHaveBeenCalledWith('t2');
    expect(showToast).toHaveBeenCalledWith('Tarefa excluída', 'info');
    expect(screen.queryByText(/Checklist de Etapas/)).not.toBeInTheDocument();
  });
});

describe('TodoManager — sons de teste', () => {
  it('testa os dois alertas sonoros e avisa', () => {
    const { showToast } = setup();
    fireEvent.click(screen.getByTitle('Testar som do Calendário (hey_listen.mp3)'));
    expect(playCalendarAlertSound).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Som do Calendário (Hey Listen) testado! 🔔', 'info');
    fireEvent.click(screen.getByTitle('Testar som do To-Do (todo.mp3)'));
    expect(playTodoAlertSound).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Som do To-Do (todo.mp3) testado! 🔔', 'info');
  });
});
