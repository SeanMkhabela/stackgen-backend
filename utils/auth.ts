import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './jwt';
import { getCache } from './redis';

// JWT verification middleware
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    // Add user info to request for later use
    request.user = decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

// Dev mode API key or JWT verification middleware
export async function verifyJwtOrDevApiKey(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Skip verification if we're not in development mode
    if (process.env.NODE_ENV === 'production') {
      // In production, fall back to normal JWT verification
      return verifyJwt(request, reply);
    }

    // Check for dev API key in header
    const apiKey = request.headers['x-api-key'];

    // If API key is provided, validate it
    if (apiKey) {
      // Try to get the dev API key from Redis
      const cachedDevApiKey = await getCache('dev_api_key');

      // Check if the provided key matches the cached dev key
      if (cachedDevApiKey && apiKey === cachedDevApiKey) {
        // Set a mock user for the request
        request.user = { id: 'dev-user', role: 'developer', isDev: true };
        return; // Authentication successful
      }

      // If Redis check failed, check memory storage
      if (global.devApiKey && apiKey === global.devApiKey.value) {
        // Check if the key is expired
        if (global.devApiKey.expiresAt > new Date()) {
          // Set a mock user for the request
          request.user = { id: 'dev-user', role: 'developer', isDev: true };
          return; // Authentication successful
        }
      }
    }

    // If dev API key validation failed, try JWT
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      request.user = decoded;
      return; // Authentication successful
    }

    // If we get here, authentication failed
    reply.status(401).send({ error: 'Authentication required' });
  } catch (error) {
    console.error('Authentication error:', error);
    reply.status(401).send({ error: 'Invalid or expired credentials' });
  }
}

// Types for extending FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    user?: any;
  }
}
