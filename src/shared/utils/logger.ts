import { captureError } from './monitoring';

/**
 * Logger único do app. Em desenvolvimento e produção continua escrevendo no
 * console; erros reais (instâncias de Error) também vão para o monitoramento
 * quando ele está configurado (ver monitoring.ts).
 */
export const logger = {
  error(message: string, ...details: unknown[]): void {
    console.error(message, ...details);
    const err = details.find((d): d is Error => d instanceof Error);
    captureError(err ?? new Error(message), err ? { message } : undefined);
  },
  warn(message: string, ...details: unknown[]): void {
    console.warn(message, ...details);
  },
  info(message: string, ...details: unknown[]): void {
    console.info(message, ...details);
  },
};
