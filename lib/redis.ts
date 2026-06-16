import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });

  client.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
