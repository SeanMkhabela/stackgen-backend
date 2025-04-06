// utils/sentry.ts
import * as Sentry from '@sentry/node';

/**
 * Initializes Sentry error tracking if configured
 * @returns true if Sentry was initialized, false otherwise
 */
export function initSentry(): boolean {
  // Check if Sentry is explicitly disabled
  if (process.env.DISABLE_SENTRY === 'true') {
    console.log('Sentry error tracking is explicitly disabled via DISABLE_SENTRY env var.');
    return false;
  }

  // Check if Sentry DSN is properly configured
  if (!process.env.SENTRY_DSN || 
      process.env.SENTRY_DSN.includes('<your-sentry-key>') || 
      process.env.SENTRY_DSN.startsWith('#')) {
    console.log('Sentry DSN not configured. Error tracking is disabled.');
    return false;
  }

  // Initialize Sentry with the configured DSN
  try {
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
    console.log('✅ Sentry error tracking initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return false;
  }
}

/**
 * Captures an exception with optional context data
 * Falls back to console.error if Sentry is not initialized
 */
export function captureException(error: Error, context?: Record<string, any>) {
  // Always log to console for local debugging
  console.error('[ERROR]', error.message, context);
  
  // Check if Sentry should be used
  if (process.env.DISABLE_SENTRY === 'true') {
    return; // Explicitly disabled
  }
  
  if (!process.env.SENTRY_DSN || 
      process.env.SENTRY_DSN.includes('<your-sentry-key>') ||
      process.env.SENTRY_DSN.startsWith('#')) {
    return; // Not configured
  }
  
  try {
    Sentry.captureException(error, { 
      extra: context 
    });
  } catch (sentryError) {
    console.error('Failed to send error to Sentry:', sentryError);
  }
}

/**
 * Sets up Sentry error tracking for a Fastify application
 * Only adds the hooks if Sentry is initialized
 */
export function setupSentryFastifyPlugin(app: any) {
  // Skip if Sentry is disabled
  if (process.env.DISABLE_SENTRY === 'true') {
    return;
  }
  
  // Skip if Sentry is not configured
  if (!process.env.SENTRY_DSN || 
      process.env.SENTRY_DSN.includes('<your-sentry-key>') ||
      process.env.SENTRY_DSN.startsWith('#')) {
    return;
  }
  
  try {
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
    
    console.log('Sentry error tracking middleware attached to Fastify');
  } catch (error) {
    console.error('Failed to setup Sentry Fastify plugin:', error);
  }
}
