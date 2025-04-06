import { FastifyRequest, FastifyReply } from 'fastify';
import apiKeyUtil, { generateApiKey } from '../utils/apiKey';
import mongoose from 'mongoose';

const { ApiKey } = apiKeyUtil;

// Rate limiting configuration
const RATE_LIMIT = {
  keysPerUser: 5, // Maximum number of API keys per user
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
};

// Generate a new API key for a user
export async function createApiKey(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Request body type definition
    interface CreateKeyRequest {
      name: string;
      userId: string;
    }

    const { name, userId } = request.body as CreateKeyRequest;

    // Validate required fields
    if (!name || !userId) {
      return reply.status(400).send({ error: 'Name and userId are required' });
    }

    // Validate name length
    if (name.length > 50) {
      return reply.status(400).send({ error: 'Invalid name length' });
    }

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return reply.status(400).send({ error: 'Invalid userId format' });
    }

    // Check rate limit
    const keyCount = await ApiKey.countDocuments({ owner: userId });
    if (keyCount >= RATE_LIMIT.keysPerUser) {
      return reply.status(429).send({ error: 'Rate limit exceeded' });
    }

    // Generate a new API key
    const key = generateApiKey();

    // Create a new API key document
    const apiKey = new ApiKey({
      key,
      name,
      owner: userId,
      createdAt: new Date(),
      lastUsed: null,
      enabled: true,
    });

    // Save the API key to the database
    await apiKey.save();

    // Return the API key (this is the only time the full key will be shown)
    return reply.status(201).send({
      key,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      id: apiKey._id,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return reply.status(500).send({ error: 'Failed to create API key' });
  }
}

// List all API keys for a user
export async function listApiKeys(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = request.query as { userId: string };

    if (!userId) {
      return reply.status(400).send({ error: 'userId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return reply.status(400).send({ error: 'Invalid userId format' });
    }

    // Find all API keys for the user
    const keys = await ApiKey.find({ owner: userId }).select('-key').sort({ createdAt: -1 });

    return reply.send(keys);
  } catch (error) {
    console.error('Error listing API keys:', error);
    return reply.status(500).send({ error: 'Failed to list API keys' });
  }
}

// Revoke an API key
export async function revokeApiKey(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { keyId } = request.params as { keyId: string };

    if (!keyId) {
      return reply.status(400).send({ error: 'Valid keyId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(keyId)) {
      return reply.status(400).send({ error: 'Invalid keyId format' });
    }

    // Find and update the API key
    const result = await ApiKey.findByIdAndUpdate(keyId, { enabled: false }, { new: true });

    if (!result) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    return reply.send({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return reply.status(500).send({ error: 'Failed to revoke API key' });
  }
}
