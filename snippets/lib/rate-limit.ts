// snippets/lib/rate-limit.ts
// Fixed-window rate limiter backed by Upstash Redis.
//
// Why Redis: the site runs on Vercel functions. An in-process Map resets on
// every cold start and is not shared across regions, so it is not a control.
// Upstash works over HTTP and is available from the Node and Edge runtimes.
//
// Install:
//   npm i @upstash/redis
//   UPSTASH_REDIS_REST_URL=...
//   UPSTASH_REDIS_REST_TOKEN=...
//
// Keys contain a SHA-256 digest, not a raw IP or email address.

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export type RateLimitResult =
  | { ok: true; remaining: number; resetSeconds: number }
  | { ok: false; retryAfter: number };

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function rateLimit(
  identifier: string,
  limit = 5,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  if (limit < 1 || windowSeconds < 1) {
    throw new Error('limit and windowSeconds must be positive');
  }

  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = `rl:${await digest(identifier)}:${bucket}`;

  // INCR is atomic. The EXPIRE is set only on the first hit, so a hot key
  // keeps its original window instead of extending forever.
  // Small race: if the process dies between INCR and EXPIRE, the key has no
  // TTL. A periodic cleanup job or Redis maxmemory policy should cover that;
  // use a Lua script if the key must never leak.
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const resetSeconds = Math.max(1, (bucket + 1) * windowSeconds - now);

  if (count > limit) {
    return { ok: false, retryAfter: resetSeconds };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - count),
    resetSeconds,
  };
}
