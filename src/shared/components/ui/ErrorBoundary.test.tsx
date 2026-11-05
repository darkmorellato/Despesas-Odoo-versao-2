import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const captureError = vi.fn();
vi.mock('@/shared/utils/monitoring', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

const Bomb: React.FC<{ explode: boolean }> = ({ explode }) => {
  if (explode) throw new Error('boom');
  return <div>conteúdo ok</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    captureError.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React loga o erro capturado
  });
  afterEach(() => vi.restoreAllMocks());

  it('renderiza os filhos quando não há erro', () => {
    render(<ErrorBoundary><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText('conteúdo ok')).toBeInTheDocument();
    expect(captureError).not.toHaveBeenCalled();
  });

  it('mostra mensagem amigável e registra o erro (escopo app)', () => {
    render(<ErrorBoundary scope="app"><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado');
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    expect(captureError).toHaveBeenCalledTimes(1);
    expect((captureError.mock.calls[0][0] as Error).message).toBe('boom');
    expect(captureError.mock.calls[0][1]).toMatchObject({ scope: 'app' });
  });

  it('escopo view oferece "Tentar de novo" e volta ao normal se o erro sumiu', () => {
    let explode = true;
    const Flaky = () => <Bomb explode={explode} />;
    render(<ErrorBoundary scope="view"><Flaky /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    explode = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(screen.getByText('conteúdo ok')).toBeInTheDocument();
  });

  it('trocar o resetKey (ex.: mudar de tela) limpa o erro automaticamente', () => {
    const { rerender } = render(<ErrorBoundary scope="view" resetKey="dashboard"><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<ErrorBoundary scope="view" resetKey="calendar"><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText('conteúdo ok')).toBeInTheDocument();
  });
});
