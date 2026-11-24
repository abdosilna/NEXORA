import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/env.js';
import { AiService } from '../src/ai/index.js';
import { BaseAiProvider } from '../src/ai/providers/base.js';

class FailingProvider extends BaseAiProvider {
  constructor() {
    super({ name: 'mock-fail', model: 'mock-1', timeoutMs: 1000, maxRetries: 1 });
    this.calls = 0;
  }
  isConfigured() {
    return true;
  }
  async generate() {
    this.calls += 1;
    const err = new Error('Simulated 503 upstream outage');
    err.status = 503;
    throw err;
  }
}

test('AiService retries transient errors and recovers with deterministic Arabic fallback', async () => {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'gemini' }, { loadDotenv: false });
  const failing = new FailingProvider();
  const aiService = new AiService(config, { customProvider: failing });

  const result = await aiService.complete({
    userId: 1,
    messages: [{ role: 'user', content: 'اشرح لي الدوال' }],
    context: { level: 'beginner' },
  });

  assert.equal(failing.calls, 2); // initial attempt + 1 retry
  assert.equal(result.isFallback, true);
  assert.equal(result.errorRecovered, true);
  assert.ok(result.text.includes('الوضع التعليمي المنظم'));
});

test('AiService enforces per-user daily request budget', async () => {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_DAILY_USER_BUDGET: '1' }, { loadDotenv: false });
  const mockOk = new (class extends BaseAiProvider {
    constructor() {
      super({ name: 'mock-ok', model: 'mock-1' });
    }
    isConfigured() {
      return true;
    }
    async generate() {
      return { text: 'إجابة تعليمية', provider: 'mock-ok', model: 'mock-1' };
    }
  })();

  const aiService = new AiService(config, { customProvider: mockOk });
  const first = await aiService.complete({ userId: 7, messages: [{ role: 'user', content: 'سؤال 1' }] });
  const second = await aiService.complete({ userId: 7, messages: [{ role: 'user', content: 'سؤال 2' }] });

  assert.equal(first.text, 'إجابة تعليمية');
  assert.equal(second.budgetExceeded, true);
});
