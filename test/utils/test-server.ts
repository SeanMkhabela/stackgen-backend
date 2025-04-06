import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { setupSentryFastifyPlugin } from '../../utils/sentry';
import authRoutes from '../../routes/auth';
import generateRoutes from '../../routes/generate';

// Ensure all required mocks are loaded
import '../setup';

// Create test server without connecting to real databases
export function createTestServer(): FastifyInstance {
  const app = Fastify({
    logger: false, // Disable logging during tests
  });

  // Add custom error handler for tests
  app.setErrorHandler((error, request, reply) => {
    console.error('Test server error:', error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
  });

  // Configure CORS
  app.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
  });

  // Setup Sentry (mocked in test/setup.ts)
  setupSentryFastifyPlugin(app);

  // Register routes
  app.get('/ping', async () => ({ message: 'pong 🎳' }));
  app.register(authRoutes);
  app.register(generateRoutes);

  return app;
}

// Create and start the server for integration tests
export async function startTestServer(): Promise<FastifyInstance> {
  const app = createTestServer();
  await app.ready();
  return app;
}

// Helper to stop the server after tests
export async function stopTestServer(app: FastifyInstance): Promise<void> {
  await app.close();
}
