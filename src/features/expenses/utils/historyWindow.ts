/**
 * Janela de histórico carregada por padrão no painel.
 *
 * O app não lê mais TODAS as despesas a cada abertura (custo de leitura do
 * Firestore cresce com o histórico). Carrega só os últimos meses; as telas que
 * precisam do histórico inteiro (análises, fechamento, busca, backup) pedem o
 * restante sob demanda — ver `useExpenses().loadFullHistory`.
 */

/** Meses carregados por padrão: o mês atual + os anteriores (3 = atual e 2 anteriores) */
export const RECENT_MONTHS = 3;

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Primeiro dia da janela recente, no formato 'YYYY-MM-DD' (mesmo formato do
 * campo `date` das despesas, então a comparação de texto equivale à de datas).
 *
 * Ex.: em 05/11/2026 com 3 meses → '2026-09-01'.
 */
export const getRecentWindowStart = (now: Date = new Date(), months: number = RECENT_MONTHS): string => {
  const d = new Date(now.getFullYear(), now.getMonth() - (Math.max(1, months) - 1), 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

/** True quando a data (YYYY-MM-DD) está fora da janela recente. */
export const isBeforeRecentWindow = (date: string, windowStart: string): boolean => date < windowStart;
