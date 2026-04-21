export interface CalendarCheck {
  [key: string]: boolean;
}

export interface FixedNotification {
  id?: string;
  day: number;
  description: string;
  months?: number[];
  customDate?: string;
}

export type CalendarCheckKey = `${number}-${number}-${string}`;

export interface CalendarState {
  checks: CalendarCheck;
  isLoading: boolean;
}

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const PAYMENT_DAYS = [5, 10, 15, 20, 25, 27] as const;
export type PaymentDay = typeof PAYMENT_DAYS[number];
