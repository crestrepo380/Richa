/**
 * Fixed-window rate limiter backed by an in-process Map.
 *
 * Adequate for protecting login and mutation endpoints on a single instance.
 * Note the tradeoff: serverless deployments run multiple isolated instances, so
 * the effective limit is (limit × instances). When traffic justifies it, swap
 * the body of `checkRateLimit` for Upstash Redis — the call signature is built
 * to keep that a one-file change.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    // Opportunistic sweep — keeps the map from growing without bound under a
    // wide spread of keys (e.g. spoofed IPs) without needing a timer.
    if (windows.size > MAX_TRACKED_KEYS) {
      for (const [k, w] of windows) {
        if (w.resetAt <= now) windows.delete(k);
      }
    }

    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: limit - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  const success = existing.count <= limit;

  return {
    success,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: success
      ? 0
      : Math.ceil((existing.resetAt - now) / 1000),
  };
}

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  magicLink: { limit: 4, windowMs: 15 * 60 * 1000 },
  inventoryUpdate: { limit: 120, windowMs: 60 * 1000 },
  reportSubmit: { limit: 10, windowMs: 60 * 1000 },
  import: { limit: 10, windowMs: 60 * 60 * 1000 },
  export: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;
