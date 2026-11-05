/**
 * Monitoramento de erros (Sentry) — OPCIONAL e desligado por padrão.
 *
 * Só é ativado se `VITE_SENTRY_DSN` estiver definido no .env / ambiente de build.
 * Sem DSN, nada é carregado nem enviado (zero custo no bundle).
 *
 * Privacidade (app financeiro): sem dados do usuário, sem breadcrumbs de console,
 * cliques e requisições (que poderiam carregar valores e descrições de despesas),
 * sem replay, sem tracing. Só vão o erro, o stack trace e o contexto técnico.
 */

type SentryModule = typeof import('@sentry/browser');

interface Queued {
  error: unknown;
  context?: Record<string, unknown> | undefined;
}

let sentry: SentryModule | null = null;
let initStarted = false;
const queue: Queued[] = [];
const MAX_QUEUE = 20;

const DSN: string | undefined = import.meta.env.VITE_SENTRY_DSN || undefined;

/** True quando o monitoramento está configurado (há DSN). */
export const isMonitoringEnabled = (): boolean => !!DSN;

const send = (mod: SentryModule, { error, context }: Queued) => {
  mod.withScope(scope => {
    if (context) scope.setContext('app', context);
    mod.captureException(error);
  });
};

/** Inicia o Sentry sob demanda. Seguro chamar mais de uma vez. */
export const initMonitoring = async (): Promise<void> => {
  if (!DSN || initStarted) return;
  initStarted = true;
  try {
    const mod = await import('@sentry/browser');
    mod.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || undefined,
      // Sem tracing nem replay: só erros. Remove as integrações que gravam
      // breadcrumbs de console, cliques e requisições (poderiam carregar
      // valores, descrições de despesas e URLs).
      defaultIntegrations: mod
        .getDefaultIntegrations({})
        .filter(i => i.name !== 'Console' && i.name !== 'Breadcrumbs'),
      beforeSend(event) {
        // Nunca enviar dados da sessão do usuário nem URLs com query
        delete event.user;
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
          if (event.request.url) event.request.url = event.request.url.split('?')[0];
        }
        return event;
      },
    });
    sentry = mod;
    // Envia o que aconteceu enquanto o SDK carregava
    for (const item of queue.splice(0)) send(mod, item);
  } catch (e) {
    // Falha ao carregar o SDK (offline, bloqueador de anúncios): o app segue normal
    initStarted = false;
    console.warn('Monitoramento indisponível:', e);
  }
};

/** Registra um erro no monitoramento (no-op sem DSN). */
export const captureError = (error: unknown, context?: Record<string, unknown>): void => {
  if (!DSN) return;
  if (sentry) {
    send(sentry, { error, context });
  } else if (queue.length < MAX_QUEUE) {
    queue.push({ error, context });
  }
};

/** Apenas para testes. */
export const __resetMonitoringForTests = (): void => {
  sentry = null;
  initStarted = false;
  queue.length = 0;
};
