import Fastify from 'fastify';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import generateRoutes from './routes/generate';

// Load environment variables
dotenv.config();

// Create Fastify instance
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    app.log.info('✅ MongoDB connected');
  } catch (err) {
    app.log.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}

// Configure CORS
app.register(fastifyCors, {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true
});

// Add a global hook for all routes to ensure CORS headers
app.addHook('onRequest', (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  done();
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  
  // Set CORS headers on error responses too
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message
  });
});

// Register routes
app.get('/ping', async () => ({ message: 'pong 🎳' }));
app.register(authRoutes);
app.register(generateRoutes);

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
      message: 'Failed to download the requested template'
    });
  }
});

// Start server function
async function startServer() {
  try {
    await connectToDatabase();
    
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen({ port, host: '0.0.0.0' });
    
    const address = app.server.address();
    const serverPort = typeof address === 'string' 
      ? address 
      : address?.port || port;
      
    app.log.info(`✅ Backend running at port ${serverPort}`);
  } catch (err) {
    app.log.error('Error starting server:', err);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  app.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  app.log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
