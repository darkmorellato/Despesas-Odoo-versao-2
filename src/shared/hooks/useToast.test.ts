import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';
import type { Toast } from '@/shared/types';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve inicializar sem toasts', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('deve adicionar toast com tipo success por padrão', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('deve adicionar toast com tipo info', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Info message', 'info');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('deve adicionar toast com tipo error', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Error message', 'error');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('deve adicionar múltiplos toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
      result.current.showToast('Message 2');
      result.current.showToast('Message 3');
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe('Message 1');
    expect(result.current.toasts[1].message).toBe('Message 2');
    expect(result.current.toasts[2].message).toBe('Message 3');
  });

  it('deve remover toast por ID', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      vi.advanceTimersByTime(1);
      result.current.showToast('Message 2');
    });

    // Avance o tempo um pouco para garantir que os toasts foram adicionados
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Message 2');
  });

  it('deve remover toast automaticamente após 4 segundos', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Auto-remove message');
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('deve remover toasts múltiplos automaticamente', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
      result.current.showToast('Message 2');
      result.current.showToast('Message 3');
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('deve gerar IDs únicos para cada toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
      vi.advanceTimersByTime(1);
      result.current.showToast('Message 2');
    });

    const ids = result.current.toasts.map(toast => toast.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(2);
  });

  it('deve manter toasts adicionados recentemente', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.showToast('Message 2');
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Message 2');
  });
});
