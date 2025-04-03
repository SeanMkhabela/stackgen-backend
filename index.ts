// server/index.ts
import Fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import fastifyCors from '@fastify/cors';

const app = Fastify({ logger: true });

// Enable CORS
app.register(fastifyCors, { origin: true });

// Health check
app.get('/ping', async (request, reply) => {
  return { message: 'pong 🏓' };
});

// Endpoint: Generate boilerplate by stack type
app.get('/generate/:stack', async (request, reply) => {
  const { stack } = request.params as { stack: string };
  const supportedStacks = ['react', 'django', 'shopify', 'hubspot'];

  if (!supportedStacks.includes(stack)) {
    return reply.status(400).send({ error: 'Unsupported stack type' });
  }

  const filePath = path.join(__dirname, 'boilerplates', `${stack}.zip`);
  if (!fs.existsSync(filePath)) {
    return reply.status(404).send({ error: 'Boilerplate not found' });
  }

  reply.header('Content-Type', 'application/zip');
  reply.header('Content-Disposition', `attachment; filename=${stack}.zip`);
  return fs.createReadStream(filePath);
});

// Start the server
app.listen({ port: 3001 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`✅ Backend running at ${address}`);
});
