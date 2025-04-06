import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initRedis, setCache, getCache, isRedisAvailable, closeRedis } from '../../utils/redis';

// Create a mock for the redis client
vi.mock('redis', () => {
  const createClientMock = vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(JSON.stringify({ data: 'test-data' })),
    quit: vi.fn().mockResolvedValue('OK'),
    isReady: true
  }));
  
  return {
    createClient: createClientMock
  };
});

describe('Redis Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize Redis connection', async () => {
    await expect(initRedis()).resolves.not.toThrow();
  });
  
  it('should set cache with a key, value and expiration', async () => {
    await initRedis(); // Initialize first
    
    const testKey = 'test-key';
    const testValue = { data: 'test-data' };
    const expiration = 60;
    
    await expect(setCache(testKey, testValue, expiration)).resolves.not.toThrow();
  });
  
  it('should get cached value by key', async () => {
    await initRedis(); // Initialize first
    
    const testKey = 'test-key';
    const result = await getCache(testKey);
    
    expect(result).toEqual({ data: 'test-data' });
  });
  
  it('should check if Redis is available', async () => {
    await initRedis(); // Initialize first
    
    expect(isRedisAvailable()).toBe(true);
  });
  
  it('should close Redis connection', async () => {
    await initRedis(); // Initialize first
    
    await expect(closeRedis()).resolves.not.toThrow();
  });
}); 