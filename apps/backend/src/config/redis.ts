import IORedis from 'ioredis';
import { config } from './index';

let redisClient: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (!redisClient) {
    redisClient = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) =>
      console.error('❌ Redis error:', err.message)
    );
  }
  return redisClient;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  const client = getRedisClient();
  await client.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const data = await client.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}

export const CACHE_KEYS = {
  assignment: (id: string) => `assignment:${id}`,
  assignments: () => `assignments:all`,
  paper: (id: string) => `paper:${id}`,
};
