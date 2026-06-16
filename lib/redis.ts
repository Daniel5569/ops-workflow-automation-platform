import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";

  // Upstash uses rediss:// (TLS). ioredis handles the protocol automatically;
  // we add tls:{} only when the scheme is rediss to avoid cert errors on local.
  const tls = url.startsWith("rediss://") ? {} : undefined;

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    tls,
  });

  client.on("error", (err) => {
    // Log but never throw — Redis unavailability must not crash API routes.
    console.error("[redis] connection error:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
