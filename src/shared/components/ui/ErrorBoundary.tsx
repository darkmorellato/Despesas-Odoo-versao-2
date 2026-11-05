import React from 'react';
import { captureError } from '@/shared/utils/monitoring';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 'app' = tela cheia (erro global); 'view' = só a área de conteúdo */
  scope?: 'app' | 'view';
  /** Quando muda (ex.: troca de tela), o erro é limpo e o conteúdo tenta de novo */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Impede que um erro de renderização derrube o app inteiro em tela branca.
 * Mostra uma mensagem em português com opção de tentar de novo / recarregar e
 * registra o erro no monitoramento (se configurado).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Erro de renderização:', error, info.componentStack);
    captureError(error, { scope: this.props.scope ?? 'app', componentStack: info.componentStack });
  }

  override componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private retry = () => this.setState({ error: null });
  private reload = () => window.location.reload();

  override render() {
    if (!this.state.error) return this.props.children;

    const fullScreen = (this.props.scope ?? 'app') === 'app';
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center text-center p-8 ${fullScreen ? 'min-h-screen bg-[#f4f5f7]' : 'py-16'}`}
      >
        <div className="max-w-md bg-white border border-rose-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900">Algo deu errado</h2>
          <p className="text-sm text-slate-600 mt-2">
            {fullScreen
              ? 'O sistema encontrou um erro inesperado. Seus dados estão salvos. Recarregue a página para continuar.'
              : 'Esta tela encontrou um erro inesperado. Seus dados estão salvos. Você pode tentar de novo ou abrir outra tela.'}
          </p>
          <div className="mt-5 flex gap-3 justify-center">
            {!fullScreen && (
              <button
                type="button"
                onClick={this.retry}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                Tentar de novo
              </button>
            )}
            <button
              type="button"
              onClick={this.reload}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
