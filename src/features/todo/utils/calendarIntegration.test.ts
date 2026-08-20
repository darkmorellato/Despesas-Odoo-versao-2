import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGoogleCalendarUrl,
  getGmailComposeUrl,
  getSavedContacts,
  saveContact,
  removeContact
} from './calendarIntegration';
import type { TodoItem } from '../types';

describe('calendarIntegration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockTask: TodoItem = {
    id: 'test-task-1',
    title: 'Pagar DAS Simples Nacional',
    completed: false,
    important: true,
    dueDate: '2026-08-20',
    dueTime: '15:00',
    repeat: 'monthly',
    notes: 'Emitir guia pelo portal do Simples',
    assignedTo: 'financeiro.miplace@gmail.com',
    assignedToName: 'Financeiro Real',
    steps: [
      { id: 's1', title: 'Gerar boleto', completed: true },
      { id: 's2', title: 'Agendar pagamento', completed: false }
    ],
    employeeName: 'Dark Morellato',
    userEmail: 'dark@gmail.com',
    createdAt: new Date().toISOString()
  };

  it('deve gerar a URL oficial do Google Calendar com data, hora, notas e convidado real', () => {
    const url = getGoogleCalendarUrl(mockTask);

    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=%F0%9F%93%8B%20Pagar%20DAS%20Simples%20Nacional');
    expect(url).toContain('20260820T150000');
    expect(url).toContain('add=financeiro.miplace%40gmail.com');
    expect(url).toContain('RRULE:FREQ=MONTHLY');
  });

  it('deve gerar a URL do Gmail com rascunho preenchido', () => {
    const url = getGmailComposeUrl(mockTask);

    expect(url).toContain('https://mail.google.com/mail/?view=cm&fs=1');
    expect(url).toContain('to=financeiro.miplace%40gmail.com');
    expect(url).toContain('Pagar%20DAS%20Simples%20Nacional');
  });

  it('deve gerenciar contatos e-mails reais no localStorage', () => {
    expect(getSavedContacts()).toEqual([]);

    saveContact('gerente@gmail.com');
    saveContact('loja1@gmail.com');
    expect(getSavedContacts()).toContain('gerente@gmail.com');
    expect(getSavedContacts()).toContain('loja1@gmail.com');

    removeContact('gerente@gmail.com');
    expect(getSavedContacts()).not.toContain('gerente@gmail.com');
    expect(getSavedContacts()).toContain('loja1@gmail.com');
  });
});
