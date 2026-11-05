import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

const captureError = vi.fn();
vi.mock('./monitoring', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

describe('logger', () => {
  beforeEach(() => captureError.mockClear());
  afterEach(() => vi.restoreAllMocks());

  it('error: escreve no console e envia o Error original ao monitoramento', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('falha real');
    logger.error('Erro ao salvar:', err);
    expect(spy).toHaveBeenCalledWith('Erro ao salvar:', err);
    expect(captureError).toHaveBeenCalledWith(err, { message: 'Erro ao salvar:' });
  });

  it('error sem instância de Error: cria um Error com a mensagem', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('algo estranho', { code: 7 });
    const sent = captureError.mock.calls[0][0] as Error;
    expect(sent).toBeInstanceOf(Error);
    expect(sent.message).toBe('algo estranho');
  });

  it('warn e info só escrevem no console', () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.warn('aviso');
    logger.info('info');
    expect(w).toHaveBeenCalledWith('aviso');
    expect(i).toHaveBeenCalledWith('info');
    expect(captureError).not.toHaveBeenCalled();
  });
});
