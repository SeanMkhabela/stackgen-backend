import Fastify from 'fastify';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import path from 'path';
import fs from 'fs';
import { initSentry, setupSentryFastifyPlugin, captureException } from './utils/sentry';
import { initRedis, setCache, getCache } from './utils/redis';
import { setupSwagger } from './utils/swagger';
import { initWorkers, shutdownWorkers } from './workers';

import authRoutes from './routes/auth';
import generateRoutes from './routes/generate';
import apiKeyRoutes from './routes/apiKeys';
import debugRoutes from './routes/debug';
import jobRoutes from './routes/jobs';

// Load environment variables
dotenv.config();

// Initialize Sentry
initSentry();

// Create Fastify instance
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Connect to MongoDB and Redis
async function connectToDatabases() {
  // Connect to MongoDB - this is required
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    app.log.info('✅ MongoDB connected');
  } catch (err) {
    captureException(err as Error, { context: 'MongoDB connection' });
    app.log.error('❌ MongoDB connection failed:', err);
    process.exit(1); // Exit if MongoDB fails - it's required
  }

  // Connect to Redis - this is optional
  try {
    await initRedis();
    app.log.info('Redis initialized');
  } catch (err) {
    captureException(err as Error, { context: 'Redis connection' });
    app.log.warn('⚠️ Redis initialization failed - continuing without caching');
    // Don't exit the app if Redis fails - it's optional
  }
}

// Configure CORS
app.register(fastifyCors, {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true,
});

// Configure rate limiting
app.register(fastifyRateLimit, {
  global: true,
  max: 100, // Default max requests per window
  timeWindow: '1 minute',
  skipOnError: true, // Continue if something fails
  keyGenerator: request => {
    // Use API key or IP address as rate limit key
    return (
      request.headers['x-api-key']?.toString() ??
      request.headers['authorization']?.toString() ??
      request.ip
    );
  },
});

// Add a global hook for all routes to ensure CORS headers
app.addHook('onRequest', (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  done();
});

// Setup Sentry error tracking for Fastify
setupSentryFastifyPlugin(app);

// Error handler - This will be used if Sentry plugin's error handler doesn't catch it
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  captureException(error, { path: request.url });

  // Set CORS headers on error responses too
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
  });
});

// Start server function
async function startServer() {
  try {
    await connectToDatabases();

    // Initialize worker system
    await initWorkers(parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10));
    app.log.info('👷 Worker system initialized');

    // Setup OpenAPI/Swagger documentation before registering routes
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
      await setupSwagger(app);
      app.log.info('📚 Swagger documentation initialized');
    }

    // Register routes
    app.get(
      '/ping',
      {
        schema: {
          description: 'Health check endpoint',
          tags: ['health'],
          response: {
            200: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async () => ({ message: 'pong 🎳' })
    );
    app.register(authRoutes);
    app.register(generateRoutes);
    app.register(apiKeyRoutes);
    app.register(debugRoutes);
    app.register(jobRoutes);

    // Static boilerplate download route
    app.get('/generate/:stack', async (request, reply) => {
      try {
        const { stack } = request.params as { stack: string };
        const supportedStacks = ['react', 'django', 'shopify', 'hubspot'];

        if (!supportedStacks.includes(stack)) {
          return reply.status(400).send({ error: 'Unsupported stack type' });
        }

        const filePath = path.join(__dirname, 'boilerplates', `${stack}.zip`);

        if (!fs.existsSync(filePath)) {
          return reply.status(404).send({ error: 'Boilerplate not found' });
        }

        // Set CORS headers
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Set content headers for file download
        reply.header('Content-Type', 'application/zip');
        reply.header('Content-Disposition', `attachment; filename=${stack}.zip`);

        // Stream the file
        return fs.createReadStream(filePath);
      } catch (error) {
        app.log.error('Error serving static boilerplate:', error);
        return reply.status(500).send({
          error: 'Server error',
          message: 'Failed to download the requested template',
        });
      }
    });

    const port = parseInt(process.env.PORT ?? '3001', 10);
    await app.listen({ port, host: '0.0.0.0' });

    const address = app.server.address();
    const serverPort = typeof address === 'string' ? address : (address?.port ?? port);

    app.log.info(`✅ Backend running at port ${serverPort}`);

    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
      app.log.info(`📚 API Documentation: http://localhost:${serverPort}/documentation`);
    }
  } catch (err) {
    app.log.error('Error starting server:', err);
    process.exit(1);
  }
}

// Handle process shutdown
function handleShutdown() {
  console.log('Shutting down server...');

  // Shut down worker system first
  shutdownWorkers().catch(err => {
    console.error('Error shutting down workers:', err);
  });

  // Close Redis connection
  import('./utils/redis')
    .then(({ closeRedis }) => closeRedis())
    .catch(err => console.error('Error closing Redis connection:', err));

  // Close MongoDB connection
  mongoose.connection
    .close()
    .then(() => console.log('MongoDB connection closed'))
    .catch(err => console.error('Error closing MongoDB connection:', err));

  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  app.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  app.log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
