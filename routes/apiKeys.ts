import { FastifyInstance } from 'fastify';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController';
import { validateApiKey } from '../utils/apiKey';
import { verifyJwt } from '../utils/auth';

export default async function apiKeyRoutes(app: FastifyInstance) {
  // Create a new API key - requires JWT authentication
  app.post('/api-keys', { preHandler: verifyJwt }, createApiKey);
  
  // List all API keys for a user - requires JWT authentication
  app.get('/api-keys', { preHandler: verifyJwt }, listApiKeys);
  
  // Revoke an API key - requires JWT authentication
  app.delete('/api-keys/:keyId', { preHandler: verifyJwt }, revokeApiKey);
} 