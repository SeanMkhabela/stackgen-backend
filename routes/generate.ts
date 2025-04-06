import { FastifyInstance } from 'fastify';
import { generateStack } from '../controllers/generateController';
import { validateApiKey } from '../utils/apiKey';

export default async function generateRoutes(app: FastifyInstance) {
  // Handle preflight CORS requests
  app.options('/generate-stack', (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    reply.send();
  });

  // Main handler for generate-stack - requires API key authentication
  app.get('/generate-stack', { preHandler: validateApiKey }, generateStack);
}
