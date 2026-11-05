import type { FixedNotification } from '@/shared/types';

/**
 * Regras puras do formulário de pagamentos fixos, sem React.
 * `months` usa 1–12 (janeiro = 1), como no restante do cadastro de pagamentos.
 */

export const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' },
];

/** Dias de vencimento oferecidos por padrão */
export const PAYMENT_DAYS = [5, 10, 15, 20, 25, 27, 29];

export interface PaymentFormData {
  description: string;
  day: number;
  months: number[];
  customDate?: string;
}

/** Formulário em branco (dia 5, todos os meses) — um objeto novo a cada chamada */
export const createEmptyPaymentForm = (): PaymentFormData => ({ description: '', day: 5, months: [] });

/** Rótulo curto do mês (1–12) */
export const getMonthLabel = (value: number): string | undefined => MONTHS.find(m => m.value === value)?.label;

/**
 * Dias do seletor: a lista fixa + o dia atual do formulário quando ele não está
 * nela (ex.: dia 30/31), para não exibir uma opção errada.
 */
export const getDayOptions = (day: number): number[] =>
  PAYMENT_DAYS.includes(day) ? PAYMENT_DAYS : [...PAYMENT_DAYS, day].sort((a, b) => a - b);

/** Dia do mês de uma data 'YYYY-MM-DD' (vazia = 5, o padrão do formulário) */
export const dayFromCustomDate = (value: string): number => (value ? parseInt(value.split('-')[2]) : 5);

/** Marca/desmarca um mês na lista */
export const toggleMonth = (months: number[], month: number): number[] =>
  months.includes(month) ? months.filter(m => m !== month) : [...months, month];

/** Escolhe um dia padrão (descarta a data específica, se houver) */
export const selectStandardDay = (form: PaymentFormData, day: number): PaymentFormData => {
  const { customDate: _customDate, ...rest } = form;
  return { ...rest, day };
};

/** Formulário preenchido a partir de um pagamento existente */
export const formFromPayment = (payment: FixedNotification): PaymentFormData => ({
  description: payment.description,
  day: payment.day,
  months: payment.months || [],
  ...(payment.customDate ? { customDate: payment.customDate } : {}),
});

/** Dados gravados: descrição sem espaços nas pontas; `months`/`customDate` só se informados */
export const buildPaymentData = (form: PaymentFormData): Omit<FixedNotification, 'id'> => ({
  description: form.description.trim(),
  day: form.day,
  ...(form.months.length > 0 ? { months: form.months } : {}),
  ...(form.customDate ? { customDate: form.customDate } : {}),
});
