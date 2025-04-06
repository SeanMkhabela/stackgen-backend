import { FastifyInstance } from 'fastify';
import { generateCode, optimizeCode, getJobStatus } from '../controllers/generationController';
import { validateApiKey } from '../utils/apiKey';

// Import FastifySchemaHandler type (or equivalent) to help with type checking
import type { RouteHandlerMethod } from 'fastify';

export default async function jobRoutes(app: FastifyInstance) {
  // Handle preflight CORS requests
  app.options('/jobs/*', (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    reply.send();
  });

  // Routes for code generation and optimization
  app.post(
    '/jobs/generate-code',
    {
      preHandler: validateApiKey,
      schema: {
        body: {
          type: 'object',
          required: ['prompt', 'language'],
          properties: {
            prompt: { type: 'string' },
            language: { type: 'string' },
            maxTokens: { type: 'number' },
          },
        },
      },
    },
    generateCode as RouteHandlerMethod
  );

  app.post(
    '/jobs/optimize-code',
    {
      preHandler: validateApiKey,
      schema: {
        body: {
          type: 'object',
          required: ['code', 'language'],
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
          },
        },
      },
    },
    optimizeCode as RouteHandlerMethod
  );

  app.get(
    '/jobs/:id',
    {
      preHandler: validateApiKey,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getJobStatus as RouteHandlerMethod
  );
}
