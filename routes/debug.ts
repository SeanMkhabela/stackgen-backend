import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { isRedisAvailable, setCache, getCache } from '../utils/redis';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { getCircuitBreakersHealth } from '../utils/circuitBreaker';

// Declare a global interface to properly type the devApiKey
declare global {
  var devApiKey:
    | {
        value: string;
        expiresAt: Date;
      }
    | undefined;
}

/**
 * Debug routes - only available in development mode
 */
export default async function debugRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Register routes only if not in production
  if (process.env.NODE_ENV === 'production') {
    fastify.log.info('Debug routes disabled in production');
    return;
  }

  fastify.log.info('Debug routes enabled');

  // Test route for basic health check
  fastify.get('/debug/ping', async () => {
    return { message: 'debug pong 🎳', timestamp: new Date().toISOString() };
  });

  // Health check endpoint with circuit breaker status
  fastify.get(
    '/debug/health',
    {
      schema: {
        description: 'Advanced health check including circuit breaker status',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              status: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                  redis: { type: 'string' },
                },
              },
              circuitBreakers: { type: 'object' },
              uptime: { type: 'number' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      const redisStatus = isRedisAvailable() ? 'connected' : 'disconnected';

      // Check status of all circuit breakers
      const circuitBreakers = getCircuitBreakersHealth();

      return {
        timestamp: new Date().toISOString(),
        status: 'ok',
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
        circuitBreakers,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      };
    }
  );

  // Test Sentry error reporting
  fastify.get('/debug/test-sentry', async () => {
    throw new Error('Test error for Sentry from debug route');
  });

  // Redis test endpoint
  fastify.get('/debug/redis', async (request, reply) => {
    try {
      const cacheKey = 'debug-test-key';
      const testData = { message: 'Redis test successful', timestamp: new Date().toISOString() };

      if (!isRedisAvailable()) {
        return {
          success: false,
          message: 'Redis is not available',
          status: 'disconnected',
          info: 'The application will continue to function without caching',
        };
      }

      // Set data in Redis with 60s expiration
      await setCache(cacheKey, testData, 60);

      // Retrieve from Redis
      const cachedData = await getCache(cacheKey);

      return {
        success: true,
        message: 'Redis test completed',
        status: 'connected',
        data: cachedData,
      };
    } catch (error) {
      fastify.log.error('Redis test error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Redis test failed',
        message: (error as Error).message,
      });
    }
  });

  // Environment variables overview (sanitized)
  fastify.get('/debug/env', async () => {
    // Filter out sensitive information
    const safeEnv = { ...process.env };

    // Remove sensitive keys
    const sensitiveKeys = [
      'JWT_SECRET',
      'REDIS_PASSWORD',
      'MONGO_URI',
      'API_KEY',
      'SECRET',
      'PASSWORD',
      'TOKEN',
      'KEY',
    ];

    for (const key of Object.keys(safeEnv)) {
      // Check if any sensitive key pattern exists in the env var name
      if (sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))) {
        safeEnv[key] = '[REDACTED]';
      }
    }

    return { env: safeEnv };
  });

  // Server stats
  fastify.get('/debug/stats', async () => {
    const memoryUsage = process.memoryUsage();
    const stats = {
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      },
      mongodb: {
        connected: mongoose.connection.readyState === 1,
      },
    };

    return stats;
  });

  // Development API key generator
  fastify.get(
    '/debug/dev-api-key',
    {
      schema: {
        description: 'Generate a development API key for testing',
        tags: ['debug'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              apiKey: { type: 'string' },
              note: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Generate a random API key
      const devApiKey = `dev_${crypto.randomBytes(16).toString('hex')}`;

      // Store it in Redis with a 24-hour expiration
      if (isRedisAvailable()) {
        await setCache('dev_api_key', devApiKey, 60 * 60 * 24);
        fastify.log.info('Generated development API key (stored in Redis)');
      } else {
        // If Redis is not available, store it in memory (app variable)
        global.devApiKey = {
          value: devApiKey,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
        fastify.log.info('Generated development API key (stored in memory)');
      }

      return {
        success: true,
        apiKey: devApiKey,
        note: 'This key is valid for 24 hours and only works in development mode',
      };
    }
  );

  // Check current authentication status
  fastify.get(
    '/debug/auth-status',
    {
      schema: {
        description: 'Check the current authentication status',
        tags: ['debug'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              authenticated: { type: 'boolean' },
              user: {
                type: 'object',
                additionalProperties: true,
              },
              devMode: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: {
              authenticated: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const authenticated = !!request.user;

      if (!authenticated) {
        return reply.status(401).send({
          authenticated: false,
          error: 'Not authenticated',
        });
      }

      return {
        authenticated: true,
        user: request.user,
        devMode: process.env.NODE_ENV !== 'production',
      };
    }
  );
}
