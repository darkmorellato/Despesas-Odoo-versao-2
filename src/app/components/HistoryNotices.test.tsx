import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentHistoryBanner, HistoryRequiredView } from './HistoryNotices';
import { ExpenseSummaryCards } from '@/features/dashboard';

describe('RecentHistoryBanner', () => {
  it('informa o período carregado e oferece carregar o histórico completo', () => {
    const onLoadFull = vi.fn();
    render(<RecentHistoryBanner windowStart="2026-09-01" isLoading={false} failed={false} onLoadFull={onLoadFull} />);
    expect(screen.getByRole('status')).toHaveTextContent('últimos 3 meses');
    expect(screen.getByRole('status')).toHaveTextContent('01/09/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Carregar histórico completo' }));
    expect(onLoadFull).toHaveBeenCalledTimes(1);
  });

  it('durante o carregamento, o botão fica desabilitado', () => {
    render(<RecentHistoryBanner windowStart="2026-09-01" isLoading failed={false} onLoadFull={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
  });

  it('em falha, avisa e oferece tentar de novo', () => {
    render(<RecentHistoryBanner windowStart="2026-09-01" isLoading={false} failed onLoadFull={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível carregar');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeEnabled();
  });
});

describe('HistoryRequiredView', () => {
  it('mostra o carregamento (sem números parciais)', () => {
    render(<HistoryRequiredView failed={false} onRetry={vi.fn()} />);
    expect(screen.getByText(/Carregando o histórico completo/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('em falha, mostra o motivo e permite tentar de novo', () => {
    const onRetry = vi.fn();
    render(<HistoryRequiredView failed onRetry={onRetry} />);
    expect(screen.getByText('Histórico completo indisponível')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ExpenseSummaryCards — rótulos com histórico parcial', () => {
  const expenses = [
    { id: '1', date: '2026-10-01', description: 'a', amount: 100, category: 'c', store: 'Realme', employeeName: 'x' },
    { id: '2', date: '2026-11-01', description: 'b', amount: 50, category: 'c', store: 'Realme', employeeName: 'x' },
  ] as never;
  const props = { expenses, filteredExpenses: expenses, totalsByStore: { Realme: 150 }, totalGeneral: 150, currency: 'R$' };

  it('histórico completo: mantém "Volume Geral Acumulado" e "Histórico Completo"', () => {
    render(<ExpenseSummaryCards {...props} />);
    expect(screen.getByText('Volume Geral Acumulado')).toBeInTheDocument();
    expect(screen.getByText('Histórico Completo')).toBeInTheDocument();
    expect(screen.getByText(/Total Geral/)).toBeInTheDocument();
  });

  it('janela parcial: rotula como período carregado, nunca como total geral', () => {
    render(<ExpenseSummaryCards {...props} partialSince="2026-09-01" />);
    expect(screen.getByText('Volume do Período Carregado')).toBeInTheDocument();
    expect(screen.getByText('Desde 01/09/2026')).toBeInTheDocument();
    expect(screen.queryByText('Volume Geral Acumulado')).not.toBeInTheDocument();
    expect(screen.queryByText('Histórico Completo')).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Geral/)).not.toBeInTheDocument();
  });
});
