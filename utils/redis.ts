// utils/redis.ts
import { createClient, RedisClientType } from 'redis';
import { captureException } from './sentry';

let redisClient: RedisClientType | null = null;
let redisEnabled = true;

/**
 * Initializes the Redis client connection
 */
export async function initRedis() {
  try {
    if (!process.env.REDIS_URL) {
      console.warn('REDIS_URL not configured. Using default localhost:6379');
    }

    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: retries => {
          // Stop reconnecting after 5 attempts and disable Redis
          if (retries > 5) {
            console.warn(
              'Failed to connect to Redis after multiple attempts. Redis caching disabled.'
            );
            redisEnabled = false;
            return false; // stop reconnecting
          }
          return Math.min(retries * 50, 1000); // reconnect after increasing delay
        },
      },
    });

    redisClient.on('error', err => {
      console.error('Redis Client Error:', err);
      // Only capture the first few errors to avoid spamming Sentry
      if (redisEnabled) {
        captureException(err);
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      redisEnabled = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    captureException(error as Error, { context: 'Redis initialization' });
    console.warn('⚠️ Application will continue without Redis caching');
    redisEnabled = false;
    return null;
  }
}

/**
 * Get the Redis client instance
 */
export function getRedisClient() {
  if (!redisClient || !redisEnabled) {
    throw new Error('Redis client not initialized or disabled. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable() {
  return redisClient !== null && redisEnabled;
}

/**
 * Set a value in Redis with optional expiration
 */
export async function setCache(key: string, value: any, expireInSeconds?: number) {
  if (!isRedisAvailable()) {
    return; // Silently fail if Redis is not available
  }

  try {
    const client = getRedisClient();
    let stringValue;

    // Handle Buffer data differently
    if (Buffer.isBuffer(value)) {
      stringValue = value.toString('base64');
      // Add a prefix to identify this as base64-encoded buffer
      await client.set(`${key}:type`, 'buffer');
    } else {
      stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    }

    if (expireInSeconds) {
      await client.set(key, stringValue, { EX: expireInSeconds });
      if (Buffer.isBuffer(value)) {
        // Set the same expiration for the type
        await client.set(`${key}:type`, 'buffer', { EX: expireInSeconds });
      }
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    captureException(error as Error, { context: 'Redis setCache', key });
    // Don't throw the error to the caller - just log it
  }
}

/**
 * Get a value from Redis
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) {
    return null; // Redis not available, return null
  }

  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (!value) return null;

    // Check if this is a Buffer type
    const valueType = await client.get(`${key}:type`);
    if (valueType === 'buffer') {
      // Convert from base64 string back to Buffer
      return Buffer.from(value, 'base64') as unknown as T;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      // If not valid JSON, return as is
      return value as unknown as T;
    }
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    captureException(error as Error, { context: 'Redis getCache', key });
    return null; // Return null on error instead of throwing
  }
}

/**
 * Delete a key from Redis
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false; // Redis not available
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    captureException(error as Error, { context: 'Redis deleteCache', key });
    return false;
  }
}

/**
 * Close the Redis connection
 */
export async function closeRedis() {
  if (redisClient && redisEnabled) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}
