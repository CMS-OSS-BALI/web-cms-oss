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

export function consumeRateLimit(key, { limit = 60, windowMs = 60_000 } = {}) {
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
  };
}
