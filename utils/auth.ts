import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './jwt';

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

// Types for extending FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    user?: any;
  }
} 