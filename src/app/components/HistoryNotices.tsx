import React from 'react';
import { formatDateBR } from '@/shared/utils/formatters';
import { RECENT_MONTHS } from '@/features/expenses/utils/historyWindow';

interface RecentHistoryBannerProps {
  /** Primeiro dia (YYYY-MM-DD) da janela carregada */
  windowStart: string;
  isLoading: boolean;
  failed: boolean;
  onLoadFull: () => void;
}

/** Aviso do painel: só os últimos meses estão carregados */
export const RecentHistoryBanner: React.FC<RecentHistoryBannerProps> = ({ windowStart, isLoading, failed, onLoadFull }) => (
  <div
    role="status"
    className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900"
  >
    <span>
      {failed
        ? 'Não foi possível carregar o histórico completo. Verifique a conexão.'
        : `Mostrando os últimos ${RECENT_MONTHS} meses (desde ${formatDateBR(windowStart)}). Totais e listas consideram só esse período.`}
    </span>
    <button
      type="button"
      onClick={onLoadFull}
      disabled={isLoading}
      className="px-3 py-1.5 rounded-lg font-bold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60 disabled:cursor-wait cursor-pointer"
    >
      {isLoading ? 'Carregando...' : failed ? 'Tentar de novo' : 'Carregar histórico completo'}
    </button>
  </div>
);

interface HistoryRequiredViewProps {
  failed: boolean;
  onRetry: () => void;
}

/**
 * Substitui telas que precisam de TODO o histórico (análises, fechamento)
 * enquanto ele carrega — nunca mostra números de um período parcial.
 */
export const HistoryRequiredView: React.FC<HistoryRequiredViewProps> = ({ failed, onRetry }) => (
  <div role="status" className="flex flex-col items-center justify-center py-20 text-center">
    {failed ? (
      <>
        <p className="text-sm font-bold text-slate-900">Histórico completo indisponível</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Esta tela precisa de todo o histórico e não foi possível carregá-lo. Verifique a conexão.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
        >
          Tentar de novo
        </button>
      </>
    ) : (
      <>
        <div className="w-8 h-8 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-3 text-sm font-medium text-slate-600">Carregando o histórico completo...</p>
      </>
    )}
  </div>
);
