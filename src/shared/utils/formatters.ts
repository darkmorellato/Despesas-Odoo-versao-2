/**
 * Obtém a data atual no formato YYYY-MM-DD (timezone local)
 * 
 * @returns String com a data atual formatada
 * 
 * @example
 * ```ts
 * const today = getTodayLocal(); // '2026-01-15'
 * ```
 */
export const getTodayLocal = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata data de YYYY-MM-DD para DD/MM/YYYY (padrão brasileiro)
 * 
 * @param dateString - Data no formato ISO (YYYY-MM-DD)
 * @returns Data formatada ou string vazia se inválida
 * 
 * @example
 * ```ts
 * formatDateBR('2026-01-15'); // '15/01/2026'
 * formatDateBR(''); // ''
 * ```
 */
export const formatDateBR = (dateString: string): string => {
  if (!dateString) return "";
  // Só formata se casar com YYYY-MM-DD... — caso contrário devolve o original
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) return dateString;
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Formata ano-mês (YYYY-MM) para "Mês Ano" em português
 * 
 * @param yearMonth - Mês no formato YYYY-MM
 * @returns Mês formatado com primeira letra maiúscula
 * 
 * @example
 * ```ts
 * formatMonthBR('2026-01'); // 'Janeiro 2026'
 * formatMonthBR('2026-12'); // 'Dezembro 2026'
 * ```
 */
export const formatMonthBR = (yearMonth: string): string => {
  if (!yearMonth) return "";
  // Valida o formato antes de parsear — evita NaN/"Invalid Date"
  const match = /^(\d{4})-(\d{1,2})$/.exec(yearMonth);
  if (!match) return yearMonth;
  const year = match[1];
  const monthIndex = parseInt(match[2], 10) - 1;
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return yearMonth;
  const date = new Date(parseInt(year, 10), monthIndex, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
};

/**
 * Formata número como moeda brasileira (sem símbolo R$)
 * 
 * Usa separador decimal vírgula e separador de milhar ponto.
 * 
 * @param value - Valor numérico a formatar
 * @returns String formatada com 2 casas decimais
 * 
 * @example
 * ```ts
 * formatCurrency(1234.5); // '1.234,50'
 * formatCurrency(0); // '0,00'
 * ```
 */
export const formatCurrency = (value: number): string => {
  // Protege NaN/Infinity/undefined antes de formatar
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};
