/**
 * In-memory sliding-window rate limiter for bot users, expensive AI/research/TTS calls, and admin auth.
 */

export class RateLimiter {
  constructor() {
    this.buckets = new Map();
    this.cleanupTimer = setInterval(() => this.prune(), 60_000);
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  check(key, { limit = 20, windowMs = 60_000 } = {}) {
    const now = Date.now();
    const cutoff = now - windowMs;
    const entries = this.buckets.get(key) || [];
    const active = entries.filter((ts) => ts > cutoff);

    if (active.length >= limit) {
      this.buckets.set(key, active);
      const oldest = active[0] || now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1000, oldest + windowMs - now),
      };
    }

    active.push(now);
    this.buckets.set(key, active);
    return {
      allowed: true,
      remaining: Math.max(0, limit - active.length),
      retryAfterMs: 0,
    };
  }

  reset(key) {
    this.buckets.delete(key);
  }

  prune(maxAgeMs = 300_000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, timestamps] of this.buckets.entries()) {
      const kept = timestamps.filter((ts) => ts > cutoff);
      if (kept.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, kept);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupTimer);
    this.buckets.clear();
  }
}

export const sharedRateLimiter = new RateLimiter();
