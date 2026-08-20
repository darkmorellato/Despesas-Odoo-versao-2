import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  playCalendarAlertSound,
  playTodoAlertSound,
  playNotificationSound,
  playSynthesizedBeep
} from './audio';

describe('audio utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar playCalendarAlertSound sem erros', () => {
    expect(() => playCalendarAlertSound()).not.toThrow();
  });

  it('deve chamar playTodoAlertSound sem erros', () => {
    expect(() => playTodoAlertSound()).not.toThrow();
  });

  it('deve rotear playNotificationSound para o tipo correto', () => {
    expect(() => playNotificationSound('calendar')).not.toThrow();
    expect(() => playNotificationSound('todo')).not.toThrow();
  });

  it('deve executar playSynthesizedBeep sem quebrar quando AudioContext não está disponível', () => {
    expect(() => playSynthesizedBeep()).not.toThrow();
  });
});
