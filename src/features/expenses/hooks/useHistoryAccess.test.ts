import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHistoryAccess } from './useHistoryAccess';
import type { Expense } from '@/shared/types';

const resolved = () => vi.fn<() => Promise<Expense[]>>(() => Promise.resolve([]));

describe('useHistoryAccess', () => {
  it('não pede o histórico quando nenhuma tela precisa dele', () => {
    const load = resolved();
    renderHook(() => useHistoryAccess({ needed: false, isFullHistory: false, loadFullHistory: load }));
    expect(load).not.toHaveBeenCalled();
  });

  it('pede uma vez quando passa a ser necessário', () => {
    const load = resolved();
    const { rerender } = renderHook(
      ({ needed }) => useHistoryAccess({ needed, isFullHistory: false, loadFullHistory: load }),
      { initialProps: { needed: false } }
    );
    rerender({ needed: true });
    rerender({ needed: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('não pede se o histórico já está completo', () => {
    const load = resolved();
    renderHook(() => useHistoryAccess({ needed: true, isFullHistory: true, loadFullHistory: load }));
    expect(load).not.toHaveBeenCalled();
  });

  it('falha: marca historyFailed, não repete sozinho e retryHistory tenta de novo', async () => {
    const load = vi.fn<() => Promise<Expense[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => useHistoryAccess({ needed: true, isFullHistory: false, loadFullHistory: load }));

    await waitFor(() => expect(result.current.historyFailed).toBe(true));
    expect(load).toHaveBeenCalledTimes(1); // sem laço de tentativas

    act(() => result.current.retryHistory());
    expect(result.current.historyFailed).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('limpa a falha quando o histórico completo finalmente chega', async () => {
    const load = vi.fn<() => Promise<Expense[]>>().mockRejectedValue(new Error('offline'));
    const { result, rerender } = renderHook(
      ({ full }) => useHistoryAccess({ needed: true, isFullHistory: full, loadFullHistory: load }),
      { initialProps: { full: false } }
    );
    await waitFor(() => expect(result.current.historyFailed).toBe(true));
    rerender({ full: true });
    await waitFor(() => expect(result.current.historyFailed).toBe(false));
  });
});
