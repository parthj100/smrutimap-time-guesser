// Optional error tracking. The Sentry SDK is dynamically imported so that when
// VITE_SENTRY_DSN is not set (e.g. local dev, or before a DSN is provisioned),
// the SDK is never fetched and adds zero bytes to the running app.

type SentryModule = typeof import('@sentry/react');

let sentry: SentryModule | null = null;

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  try {
    const mod = await import('@sentry/react');
    mod.init({
      dsn,
      environment: import.meta.env.MODE,
      // Only a sample of transactions to keep within free-tier quotas.
      tracesSampleRate: 0.1,
      // Don't send PII (IP, headers) unless explicitly enabled later.
      sendDefaultPii: false,
    });
    sentry = mod;
  } catch (err) {
    // Never let observability setup break the app.
    console.warn('Sentry failed to initialize:', err);
  }
}

/** Report an error to Sentry if it is configured; otherwise a no-op. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}
