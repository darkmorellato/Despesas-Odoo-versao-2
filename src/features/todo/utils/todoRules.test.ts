import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { TodoItem } from '../types';
import { getNextRecurrenceDate, hasNextOccurrence } from './todoRecurrence';
import { deduplicateTodos, normalizeCreatedAt, parseTodoDoc, patchTodo, removeTodo, sortByCreatedAtDesc } from './todoDocument';
import {
  buildReminderNotification, formatCurrentTime, isReminderDue, loadNotifiedForToday, saveNotifiedForToday,
} from './todoReminders';

const T = (o: Partial<TodoItem> & { id: string }): TodoItem => ({
  title: o.id, completed: false, important: false, employeeName: 'Ana', userEmail: 'ana@x.com', createdAt: '2026-11-01T00:00:00.000Z', ...o,
});

describe('todoRecurrence', () => {
  it('getNextRecurrenceDate cobre fins de semana, virada de mês/ano e fevereiro', () => {
    expect(getNextRecurrenceDate('2026-11-13', 'weekdays')).toBe('2026-11-16'); // sexta → segunda
    expect(getNextRecurrenceDate('2026-12-31', 'daily')).toBe('2027-01-01');
    expect(getNextRecurrenceDate('2028-01-31', 'monthly')).toBe('2028-02-29');
    expect(getNextRecurrenceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(getNextRecurrenceDate('2026-11-15', 'none')).toBe('2026-11-15');
  });

  describe('hasNextOccurrence', () => {
    const target = T({ id: 'r', title: 'Backup', userEmail: 'ana@x.com' });
    it('mesmo título (caixa/espaços), data e dono → existe', () => {
      expect(hasNextOccurrence([T({ id: 'p', title: ' BACKUP ', dueDate: '2026-11-16' })], target, '2026-11-16')).toBe(true);
    });
    it('data, título ou dono diferentes → não existe', () => {
      expect(hasNextOccurrence([T({ id: 'p', title: 'Backup', dueDate: '2026-11-17' })], target, '2026-11-16')).toBe(false);
      expect(hasNextOccurrence([T({ id: 'p', title: 'Outro', dueDate: '2026-11-16' })], target, '2026-11-16')).toBe(false);
      expect(hasNextOccurrence([T({ id: 'p', title: 'Backup', dueDate: '2026-11-16', userEmail: 'bia@x.com' })], target, '2026-11-16')).toBe(false);
    });
    it('sem e-mail do criador, o dono é o responsável', () => {
      const t = T({ id: 'r', title: 'X', userEmail: '', assignedTo: 'Maria@x.com' });
      expect(hasNextOccurrence([T({ id: 'p', title: 'X', dueDate: '2026-11-16', userEmail: '', assignedTo: ' maria@x.com ' })], t, '2026-11-16')).toBe(true);
    });
  });
});

describe('todoDocument', () => {
  it('normalizeCreatedAt aceita Timestamp, texto e toDate; nulo caso contrário', () => {
    expect(normalizeCreatedAt({ seconds: 1767225600 })).toBe('2026-01-01T00:00:00.000Z');
    expect(normalizeCreatedAt('2026-03-01T00:00:00.000Z')).toBe('2026-03-01T00:00:00.000Z');
    expect(normalizeCreatedAt({ toDate: () => new Date('2026-06-01T00:00:00Z') })).toBe('2026-06-01T00:00:00.000Z');
    expect(normalizeCreatedAt(undefined)).toBeNull();
    expect(normalizeCreatedAt(null)).toBeNull();
    expect(normalizeCreatedAt({})).toBeNull();
  });

  it('parseTodoDoc: padrões e fallback legado de título', () => {
    expect(parseTodoDoc('a', {})).toMatchObject({ id: 'a', title: 'Tarefa sem título', repeat: 'none', steps: [], employeeName: 'Funcionário', userEmail: '', createdAt: null });
    expect(parseTodoDoc('b', { description: 'D' }).title).toBe('D');
    expect(parseTodoDoc('c', { text: 'T' }).title).toBe('T');
    expect(parseTodoDoc('d', { name: 'N' }).title).toBe('N');
    expect(parseTodoDoc('e', { nome: 'No' }).title).toBe('No');
    expect(parseTodoDoc('f', { title: 'Novo', description: 'Velho' }).title).toBe('Novo');
    expect(parseTodoDoc('g', { completed: 1, important: 'sim', dueDate: '' }).dueDate).toBeUndefined();
    expect(parseTodoDoc('g', { completed: 1, important: 'sim' })).toMatchObject({ completed: true, important: true });
  });

  it('sortByCreatedAtDesc: mais novo primeiro, sem data no fim, sem alterar o original', () => {
    const list = [T({ id: 'velha', createdAt: '2026-01-01T00:00:00Z' }), { ...T({ id: 'sem' }), createdAt: null as unknown as string }, T({ id: 'nova', createdAt: '2026-06-01T00:00:00Z' })];
    expect(sortByCreatedAtDesc(list).map(t => t.id)).toEqual(['nova', 'velha', 'sem']);
    expect(list.map(t => t.id)).toEqual(['velha', 'sem', 'nova']);
  });

  it('deduplicateTodos, patchTodo e removeTodo', () => {
    expect(deduplicateTodos([T({ id: 'a', title: '1' }), T({ id: 'a', title: '2' }), { ...T({ id: 'x' }), id: '' }]).map(t => t.title)).toEqual(['1']);
    const list = [T({ id: 'a' }), T({ id: 'b' })];
    expect(patchTodo(list, 'a', { important: true }).map(t => t.important)).toEqual([true, false]);
    expect(patchTodo(list, 'zzz', { important: true })).toEqual(list);
    expect(list[0].important).toBe(false); // imutável
    expect(removeTodo(list, 'a').map(t => t.id)).toEqual(['b']);
  });
});

describe('todoReminders', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 15, 9, 5, 0)); localStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('formatCurrentTime completa com zeros', () => {
    expect(formatCurrentTime(new Date(2026, 0, 1, 9, 5))).toBe('09:05');
    expect(formatCurrentTime(new Date(2026, 0, 1, 23, 59))).toBe('23:59');
  });

  it('isReminderDue exige pendente + hoje + minuto exato', () => {
    const base = T({ id: 'a', dueDate: '2026-11-15', dueTime: '09:05' });
    expect(isReminderDue(base, '2026-11-15', '09:05')).toBe(true);
    expect(isReminderDue({ ...base, completed: true }, '2026-11-15', '09:05')).toBe(false);
    expect(isReminderDue(base, '2026-11-15', '09:06')).toBe(false);
    expect(isReminderDue(base, '2026-11-16', '09:05')).toBe(false);
    expect(isReminderDue(T({ id: 'b', dueDate: '2026-11-15' }), '2026-11-15', '09:05')).toBe(false);
  });

  it('buildReminderNotification: anotação > responsável > horário', () => {
    expect(buildReminderNotification(T({ id: 'a', title: 'Reunião', notes: 'Levar' }), '09:05')).toEqual({ title: '🔔 Lembrete To-Do: Reunião', body: 'Levar' });
    expect(buildReminderNotification(T({ id: 'a', title: 'R', assignedTo: 'm@x.com', assignedToName: 'Maria' }), '09:05').body).toBe('Atribuído a: Maria');
    expect(buildReminderNotification(T({ id: 'a', title: 'R', assignedTo: 'm@x.com' }), '09:05').body).toBe('Atribuído a: m@x.com');
    expect(buildReminderNotification(T({ id: 'a', title: 'R' }), '09:05').body).toBe('Horário agendado: 09:05');
  });

  it('notificados: grava e lê só os do dia; outro dia ou lixo recomeça', () => {
    saveNotifiedForToday('2026-11-15', new Set(['a', 'b']));
    expect([...loadNotifiedForToday().ids].sort()).toEqual(['a', 'b']);
    saveNotifiedForToday('2026-11-14', new Set(['velho']));
    expect(loadNotifiedForToday().ids.size).toBe(0);
    localStorage.setItem('miplace_todo_notified', '{lixo');
    expect(loadNotifiedForToday().ids.size).toBe(0);
  });
});
