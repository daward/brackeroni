const requestBuckets = new Map();

export function takeRequestRateLimit({ key, limit = 15, windowMs = 10000, now = () => Date.now() }) {
  const currentTime = now();
  const cutoff = currentTime - windowMs;
  const requests = (requestBuckets.get(key) || []).filter((requestedAt) => requestedAt >= cutoff);

  if (requests.length >= limit) {
    const oldestRequest = requests[0] ?? currentTime;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldestRequest + windowMs - currentTime) / 1000))
    };
  }

  requests.push(currentTime);
  requestBuckets.set(key, requests);

  return { allowed: true, retryAfterSeconds: 0 };
}