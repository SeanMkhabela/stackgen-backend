import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

// Define API key schema
const apiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: null },
  enabled: { type: Boolean, default: true }
});

// Create model if it doesn't exist
const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);

// Generate a new API key
export function generateApiKey(): string {
  return randomBytes(24).toString('hex');
}

// Middleware to check API key
export async function validateApiKey(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get the API key from the header or query parameter
    const apiKey = 
      request.headers['x-api-key'] || 
      (request.query as Record<string, string | string[]>)['api_key'] as string;

    // If no API key is provided
    if (!apiKey) {
      reply.status(401).send({ error: 'API key is required' });
      return;
    }

    // Find the API key in the database
    const keyDoc = await ApiKey.findOne({ 
      key: apiKey,
      enabled: true
    });

    // If the API key is invalid
    if (!keyDoc) {
      reply.status(401).send({ error: 'Invalid API key' });
      return;
    }

    // Update the last used timestamp
    keyDoc.lastUsed = new Date();
    await keyDoc.save();

    // Add the API key info to the request for later use
    request.apiKey = keyDoc;
  } catch (error) {
    console.error('API key validation error:', error);
    reply.status(500).send({ error: 'Internal server error during API key validation' });
  }
}

// Types for extending FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: any;
  }
}

export default {
  ApiKey,
  generateApiKey,
  validateApiKey
}; 