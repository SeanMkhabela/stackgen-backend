import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { startTestServer, stopTestServer } from '../utils/test-server';

describe('Server Routes', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    app = await startTestServer();
  });
  
  afterAll(async () => {
    await stopTestServer(app);
  });
  
  it('should respond with pong on ping endpoint', async () => {
    const response = await request(app.server)
      .get('/ping')
      .expect(200);
    
    expect(response.body).toEqual({ message: 'pong 🎳' });
  });
}); 