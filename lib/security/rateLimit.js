// In-memory fallback bucket (kept for dev/local)
const buckets = new Map();

function scheduleCleanup(key, windowMs) {
  const timeout = setTimeout(() => {
    const bucket = buckets.get(key);
    if (bucket && bucket.expiresAt <= Date.now()) {
      buckets.delete(key);
    }
  }, windowMs + 1000);
  if (typeof timeout.unref === "function") {
    timeout.unref();
  }
}

function consumeRateLimitMemory(
  key,
  { limit = 60, windowMs = 60_000 } = {}
) {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    bucket = { count: 0, expiresAt: now + windowMs };
    scheduleCleanup(key, windowMs);
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    success: bucket.count <= limit,
    remaining: Math.max(limit - bucket.count, 0),
    reset: bucket.expiresAt,
    limit,
    backend: "memory",
  };
}

// --- Optional Redis (Upstash REST) backend ---
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);
const REDIS_DISABLED_ENV =
  String(process.env.RATE_LIMIT_DISABLE_REDIS || "false").toLowerCase() ===
  "true";
const REDIS_COOLDOWN_MS = Number(
  process.env.RATE_LIMIT_REDIS_COOLDOWN_MS || 60_000
);
let redisDisabledUntil = 0;
let lastRedisFallbackLog = 0;

function shouldUseRedis() {
  if (REDIS_DISABLED_ENV) return false;
  return Date.now() >= redisDisabledUntil;
}

function markRedisFailure(reason) {
  redisDisabledUntil = Date.now() + Math.max(REDIS_COOLDOWN_MS, 5_000);
  // Log sekali per 30s agar tidak memenuhi log
  if (Date.now() - lastRedisFallbackLog > 30_000) {
    lastRedisFallbackLog = Date.now();
    console.warn(
      "[rateLimit] Redis fallback to memory",
      reason ? `(${reason})` : ""
    );
  }
}

async function consumeRateLimitRedis(
  key,
  { limit = 60, windowMs = 60_000 } = {}
) {
  // Fixed window using INCR + PEXPIRE (TTL reset each hit; acceptable for anti-spam)
  const now = Date.now();
  const body = JSON.stringify({
    commands: [
      ["INCR", key],
      ["PEXPIRE", key, windowMs],
    ],
  });

  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    markRedisFailure(`status ${res.status}`);
    return consumeRateLimitMemory(key, { limit, windowMs });
  }

  const json = await res.json().catch(() => null);
  const incrResult = Array.isArray(json) ? json[0] : null;
  const countRaw =
    incrResult?.result ??
    incrResult?.data ??
    (Array.isArray(incrResult) ? incrResult[1] : null);
  const count = Number(countRaw || 0);

  return {
    success: count <= limit,
    remaining: Math.max(limit - count, 0),
    reset: now + windowMs,
    limit,
    backend: "redis",
  };
}

/**
 * Legacy synchronous limiter (memory-only).
 * Kept untuk callsite lama (analytics tracker).
 */
export function consumeRateLimit(key, opts) {
  return consumeRateLimitMemory(key, opts);
}

/**
 * Distribusi: gunakan Redis REST jika tersedia, fallback ke memori.
 * @returns {Promise<{success:boolean,remaining:number,reset:number,limit:number,backend:string}>}
 */
export async function consumeRateLimitDistributed(key, opts) {
  if (hasRedis && shouldUseRedis()) {
    try {
      return await consumeRateLimitRedis(key, opts);
    } catch (err) {
      markRedisFailure(err?.message || "exception");
    }
  }
  return consumeRateLimitMemory(key, opts);
}

export function rateLimitHeaders(meta) {
  return {
    "X-RateLimit-Limit": String(meta.limit),
    "X-RateLimit-Remaining": String(Math.max(meta.remaining, 0)),
    "X-RateLimit-Reset": String(Math.floor(meta.reset / 1000)),
    ...(meta.backend ? { "X-RateLimit-Backend": meta.backend } : {}),
  };
}
