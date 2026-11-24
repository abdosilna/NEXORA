import test from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../src/security/rate-limit.js';

test('RateLimiter enforces threshold and resets cleanly', () => {
  const limiter = new RateLimiter();
  try {
    const r1 = limiter.check('user:1', { limit: 2, windowMs: 10_000 });
    const r2 = limiter.check('user:1', { limit: 2, windowMs: 10_000 });
    const r3 = limiter.check('user:1', { limit: 2, windowMs: 10_000 });

    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);
    assert.equal(r3.allowed, false);
    assert.ok(r3.retryAfterMs >= 1000);

    limiter.reset('user:1');
    const r4 = limiter.check('user:1', { limit: 2, windowMs: 10_000 });
    assert.equal(r4.allowed, true);
  } finally {
    limiter.destroy();
  }
});
