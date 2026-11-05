import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const makeSentryMock = () => {
  const init = vi.fn();
  const captureException = vi.fn();
  const scope = { setContext: vi.fn() };
  return {
    init,
    captureException,
    scope,
    mod: {
      init,
      captureException,
      withScope: (fn: (s: typeof scope) => void) => fn(scope),
      getDefaultIntegrations: () => [
        { name: 'Console' }, { name: 'Breadcrumbs' }, { name: 'GlobalHandlers' }, { name: 'Dedupe' },
      ],
    },
  };
};

describe('monitoring', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock('@sentry/browser'); });

  it('sem DSN: desligado, não carrega o SDK e captureError é no-op', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const sentry = makeSentryMock();
    vi.doMock('@sentry/browser', () => sentry.mod);
    const m = await import('./monitoring');

    expect(m.isMonitoringEnabled()).toBe(false);
    await m.initMonitoring();
    m.captureError(new Error('x'));
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('com DSN: inicia uma vez, remove Console/Breadcrumbs e envia erros', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://chave@o1.ingest.sentry.io/2');
    const sentry = makeSentryMock();
    vi.doMock('@sentry/browser', () => sentry.mod);
    const m = await import('./monitoring');

    await m.initMonitoring();
    await m.initMonitoring(); // idempotente
    expect(sentry.init).toHaveBeenCalledTimes(1);

    const opts = sentry.init.mock.calls[0][0];
    expect(opts.dsn).toBe('https://chave@o1.ingest.sentry.io/2');
    expect(opts.defaultIntegrations.map((i: { name: string }) => i.name)).toEqual(['GlobalHandlers', 'Dedupe']);

    const err = new Error('falhou');
    m.captureError(err, { scope: 'view' });
    expect(sentry.captureException).toHaveBeenCalledWith(err);
    expect(sentry.scope.setContext).toHaveBeenCalledWith('app', { scope: 'view' });
  });

  it('beforeSend remove usuário, cookies, headers e query da URL', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://chave@o1.ingest.sentry.io/2');
    const sentry = makeSentryMock();
    vi.doMock('@sentry/browser', () => sentry.mod);
    const m = await import('./monitoring');
    await m.initMonitoring();

    const event = {
      user: { email: 'a@b.com' },
      request: { url: 'https://app.web.app/?token=segredo', cookies: { a: '1' }, headers: { h: '1' } },
    };
    const out = sentry.init.mock.calls[0][0].beforeSend(event);
    expect(out.user).toBeUndefined();
    expect(out.request.cookies).toBeUndefined();
    expect(out.request.headers).toBeUndefined();
    expect(out.request.url).toBe('https://app.web.app/');
  });

  it('erros anteriores ao carregamento do SDK entram na fila e são enviados depois', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://chave@o1.ingest.sentry.io/2');
    const sentry = makeSentryMock();
    vi.doMock('@sentry/browser', () => sentry.mod);
    const m = await import('./monitoring');

    const early = new Error('cedo');
    m.captureError(early);
    expect(sentry.captureException).not.toHaveBeenCalled();

    await m.initMonitoring();
    expect(sentry.captureException).toHaveBeenCalledWith(early);
  });

  it('falha ao carregar o SDK não derruba o app e permite nova tentativa', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://chave@o1.ingest.sentry.io/2');
    const sentry = makeSentryMock();
    sentry.init.mockImplementationOnce(() => { throw new Error('bloqueado'); });
    vi.doMock('@sentry/browser', () => sentry.mod);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = await import('./monitoring');

    await expect(m.initMonitoring()).resolves.toBeUndefined();
    await m.initMonitoring(); // segunda tentativa funciona
    expect(sentry.init).toHaveBeenCalledTimes(2);
  });
});
