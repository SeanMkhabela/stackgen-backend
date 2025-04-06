import { FastifyReply } from 'fastify';
import { isRedisAvailable, getCache, setCache } from './redis';
import { StackName } from '../types/stack';

export async function tryGetFromCache<T>(key: string, reply: FastifyReply): Promise<T | null> {
  if (!isRedisAvailable()) {
    console.log('Redis not available, skipping cache check');
    return null;
  }

  const cachedData = await getCache<T>(key);

  if (!cachedData) {
    console.log(`Cache miss for ${key}`);
    return null;
  }

  console.log(`Cache hit for ${key}`);
  return cachedData;
}

export async function saveToCache<T>(key: string, data: T, ttl: number = 86400): Promise<void> {
  if (!isRedisAvailable()) {
    console.log('Redis not available, skipping cache save');
    return;
  }

  await setCache(key, data, ttl);
  console.log(`Saved ${key} to cache`);
}

export async function handleStackCache(
  stackName: StackName,
  data: Buffer,
  reply: FastifyReply
): Promise<void> {
  if (!isRedisAvailable()) {
    return;
  }

  const cacheKey = `stack:${stackName}`;

  // Set response headers for ZIP file
  reply.header('Content-Type', 'application/zip');
  reply.header('Content-Disposition', `attachment; filename=${stackName}.zip`);

  // Save to cache for 24 hours
  await saveToCache(cacheKey, data, 86400);

  // Send the response
  reply.send(data);
}
