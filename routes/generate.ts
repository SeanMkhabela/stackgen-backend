import { FastifyInstance } from 'fastify';
import { generateStack } from '../controllers/generateController';

export default async function generateRoutes(app: FastifyInstance) {
  // Handle preflight CORS requests
  app.options('/generate-stack', (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.send();
  });

  // Main handler for generate-stack
  app.get('/generate-stack', generateStack);
}
