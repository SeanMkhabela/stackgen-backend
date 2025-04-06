// utils/sentry.ts
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN.includes('<your-sentry-key>')) {
    console.warn('Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express(),
      new Sentry.Integrations.Modules(),
    ],
    // This sets the sample rate to be 100%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV ?? 'development',
    // Set the context to the current working directory
    normalizeDepth: 10,
    initialScope: {
      tags: {
        rootDir: process.cwd(),
      },
    },
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('<your-sentry-key>')) {
    Sentry.captureException(error, { 
      extra: context 
    });
  }
}

export function setupSentryFastifyPlugin(app: any) {
  // Add hook to track requests
  app.addHook('onRequest', (request: any, reply: any, done: any) => {
    Sentry.withScope(scope => {
      scope.setTag('path', request.url);
      if (request.user) {
        scope.setUser({ id: request.user.id, username: request.user.username });
      }
    });
    done();
  });

  // Add hook to track errors
  app.setErrorHandler((error: Error, request: any, reply: any) => {
    Sentry.withScope(scope => {
      scope.setTag('path', request.url);
      if (request.user) {
        scope.setUser({ id: request.user.id, username: request.user.username });
      }
      Sentry.captureException(error);
    });
    
    reply.status(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message
    });
  });
}
