import { createClient, type RedisClientType } from "redis";

type CacheValue = { expiresAt: number; value: string };

type CacheClient = RedisClientType;

const redisUrl = process.env.REDIS_URL?.trim();
const redis = redisUrl ? createClient({ url: redisUrl }) : null;
const memory = new Map<string, CacheValue>();
const pending = new Map<string, Promise<unknown>>();
let redisReady: Promise<CacheClient | null> | undefined;

if (redis) {
  redis.on("error", (error) => console.error("redis_cache_error", error instanceof Error ? error.message : "unknown"));
}

async function getRedis(): Promise<CacheClient | null> {
  if (!redis) return null;
  if (!redisReady) {
    redisReady = redis.connect().then(() => redis).catch((error) => {
      console.error("redis_cache_unavailable", error instanceof Error ? error.message : "unknown");
      return null;
    });
  }
  return redisReady;
}

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<{ value: T; cached: boolean; stale: boolean }> {
  const client = await getRedis();
  if (client) {
    const hit = await client.get(key);
    if (hit) return { value: JSON.parse(hit) as T, cached: true, stale: false };
  } else {
    const hit = memory.get(key);
    if (hit && hit.expiresAt > Date.now()) return { value: JSON.parse(hit.value) as T, cached: true, stale: false };
    if (hit) memory.delete(key);
  }

  const current = pending.get(key);
  if (current) return { value: await current as T, cached: false, stale: false };

  const request = loader().then(async (value) => {
    const serialized = JSON.stringify(value);
    if (client) await client.setEx(key, ttlSeconds, serialized);
    else memory.set(key, { expiresAt: Date.now() + ttlSeconds * 1000, value: serialized });
    return value;
  }).finally(() => pending.delete(key));

  pending.set(key, request);
  return { value: await request, cached: false, stale: false };
}

export function cacheStats() {
  return { backend: redisUrl ? "redis" : "memory", memoryKeys: memory.size, pendingKeys: pending.size };
}
