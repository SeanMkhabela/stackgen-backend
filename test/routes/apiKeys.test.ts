import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import apiKeyRoutes from '../../routes/apiKeys';
import { verifyJwt } from '../../utils/auth';

// Mock JWT verification
vi.mock('../../utils/auth', () => ({
  verifyJwt: vi.fn().mockImplementation((request, reply, done) => {
    request.user = { id: 'test_user_id', email: 'test@example.com' };
    if (done) done();
  })
}));

// Mock API key controller
vi.mock('../../controllers/apiKeyController', () => ({
  createApiKey: vi.fn().mockImplementation(async (request, reply) => {
    const { name, userId } = request.body;
    if (!name || !userId) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    return reply.status(201).send({ 
      key: 'test_api_key', 
      name, 
      id: 'api_key_123',
      createdAt: new Date()
    });
  }),
  listApiKeys: vi.fn().mockImplementation(async (request, reply) => {
    const { userId } = request.query;
    if (!userId) {
      return reply.status(400).send({ error: 'userId is required' });
    }
    return reply.send([
      { _id: 'key1', name: 'Key 1', createdAt: new Date() },
      { _id: 'key2', name: 'Key 2', createdAt: new Date() }
    ]);
  }),
  revokeApiKey: vi.fn().mockImplementation(async (request, reply) => {
    const { keyId } = request.params;
    if (!keyId) {
      return reply.status(400).send({ error: 'keyId is required' });
    }
    if (keyId === 'not_found') {
      return reply.status(404).send({ error: 'API key not found' });
    }
    return reply.send({ success: true, message: 'API key revoked successfully' });
  })
}));

describe('API Key Routes', () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();
    await app.register(apiKeyRoutes);
    vi.clearAllMocks();
  });

  describe('POST /api-keys', () => {
    it('should create a new API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        payload: {
          name: 'Test Key',
          userId: 'user123'
        }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual({
        key: 'test_api_key',
        name: 'Test Key',
        id: 'api_key_123',
        createdAt: expect.any(String)
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        payload: {
          name: 'Test Key'
          // Missing userId
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Missing required fields'
      });
    });
  });

  describe('GET /api-keys', () => {
    it('should list all API keys for a user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?userId=user123'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(2);
      expect(payload[0]).toHaveProperty('_id', 'key1');
      expect(payload[1]).toHaveProperty('_id', 'key2');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-keys'
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({
        error: 'userId is required'
      });
    });
  });

  describe('DELETE /api-keys/:keyId', () => {
    it('should revoke an API key', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api-keys/key123'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        success: true,
        message: 'API key revoked successfully'
      });
    });

    it('should return 404 if API key is not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api-keys/not_found'
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({
        error: 'API key not found'
      });
    });
  });
}); 