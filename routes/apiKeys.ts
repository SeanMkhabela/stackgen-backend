import { FastifyInstance, RouteHandlerMethod, FastifyPluginOptions } from 'fastify';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController';
import { verifyJwt, verifyJwtOrDevApiKey } from '../utils/auth';

export default async function apiKeyRoutes(app: FastifyInstance, options: FastifyPluginOptions) {
  // Choose the appropriate auth middleware based on environment
  const authMiddleware = process.env.NODE_ENV === 'production' ? verifyJwt : verifyJwtOrDevApiKey;

  // Create a new API key - requires JWT authentication
  app.post(
    '/api-keys',
    {
      preHandler: authMiddleware,
      schema: {
        description: 'Create a new API key',
        tags: ['api-keys'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'A friendly name for the API key' },
            expiresIn: { type: 'string', description: 'Expiration period (e.g., "30d", "1y")' },
          },
        },
        response: {
          201: {
            description: 'Successfully created API key',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              key: { type: 'string', description: 'The API key (only shown once)' },
              keyId: { type: 'string', description: 'The ID of the API key' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    createApiKey as RouteHandlerMethod
  );

  // List all API keys for a user - requires JWT authentication
  app.get(
    '/api-keys',
    {
      preHandler: authMiddleware,
      schema: {
        description: 'List all API keys for the authenticated user',
        tags: ['api-keys'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        response: {
          200: {
            description: 'List of API keys',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              keys: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    prefix: { type: 'string', description: 'First few characters of the key' },
                    createdAt: { type: 'string', format: 'date-time' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    lastUsed: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    listApiKeys as RouteHandlerMethod
  );

  // Revoke an API key - requires JWT authentication
  app.delete(
    '/api-keys/:keyId',
    {
      preHandler: authMiddleware,
      schema: {
        description: 'Revoke an API key',
        tags: ['api-keys'],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        params: {
          type: 'object',
          required: ['keyId'],
          properties: {
            keyId: { type: 'string', description: 'The ID of the API key to revoke' },
          },
        },
        response: {
          200: {
            description: 'API key revoked successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'API key not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    revokeApiKey as RouteHandlerMethod
  );
}
