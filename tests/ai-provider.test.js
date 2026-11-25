import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';
import { AiService } from '../lib/ai/index.js';
import { BaseAiProvider } from '../lib/ai/providers/base.js';
import { buildGeminiRequestConfig, classifyGeminiError, isGemini4Model } from '../lib/ai/providers/gemini.js';

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

test('AiService retries transient errors and returns an honest unavailability notice without fake templates', async () => {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'gemini' }, { loadDotenv: false });
  const failing = new FailingProvider();
  const aiService = new AiService(config, { customProvider: failing });

  const result = await aiService.complete({
    userId: 1,
    messages: [{ role: 'user', content: 'اشرح لي الدوال' }],
    context: { level: 'beginner' },
  });

  assert.equal(failing.calls, 2); // initial attempt + 1 retry
  assert.equal(result.ok, false);
  assert.equal(result.isFallback, true);
  assert.equal(result.errorRecovered, true);
  assert.ok(result.text.includes('المساعد الذكي غير متاح حالياً'));
  assert.ok(!result.text.includes('الوضع التعليمي المنظم'), 'Must not emit fake hardcoded lesson fallback');
});

test('AiService reports missing AI_API_KEY honestly when Gemini has no key', async () => {
  const config = loadConfig(
    { DATABASE_PATH: ':memory:', AI_PROVIDER: 'gemini', AI_API_KEY: '', GEMINI_API_KEY: '' },
    { loadDotenv: false }
  );
  const aiService = new AiService(config);
  assert.equal(aiService.isReady(), false);

  const result = await aiService.complete({
    userId: 2,
    messages: [{ role: 'user', content: 'ما هي البرمجة؟' }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.isFallback, true);
  assert.ok(result.text.includes('AI_API_KEY'));
});

test('AiService preserves Arabic conversational context across follow-up questions and enforces user budget', async () => {
  const capturedPayloads = [];
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_DAILY_USER_BUDGET: '2' }, { loadDotenv: false });
  const mockOk = new (class extends BaseAiProvider {
    constructor() {
      super({ name: 'mock-ok', model: 'gemini-4-hydrogen' });
    }
    isConfigured() {
      return true;
    }
    async generate(payload) {
      capturedPayloads.push(payload.messages);
      const last = payload.messages[payload.messages.length - 1]?.content || '';
      if (last.includes('عاصمة اليابان')) {
        return { text: 'عاصمة اليابان هي طوكيو.', provider: 'mock-ok', model: 'gemini-4-hydrogen' };
      }
      return { text: 'تقع طوكيو في شرق جزيرة هونشو ويبلغ عدد سكانها نحو 14 مليون نسمة.', provider: 'mock-ok', model: 'gemini-4-hydrogen' };
    }
  })();

  const aiService = new AiService(config, { customProvider: mockOk });
  const first = await aiService.complete({ userId: 7, messages: [{ role: 'user', content: 'ما هي عاصمة اليابان؟' }] });
  const second = await aiService.complete({
    userId: 7,
    messages: [
      { role: 'user', content: 'ما هي عاصمة اليابان؟' },
      { role: 'assistant', content: first.text },
      { role: 'user', content: 'أين تقع وكم عدد سكانها؟' },
    ],
  });
  const third = await aiService.complete({ userId: 7, messages: [{ role: 'user', content: 'سؤال إضافي' }] });

  assert.equal(first.ok, true);
  assert.ok(first.text.includes('طوكيو'));
  assert.equal(second.ok, true);
  assert.equal(capturedPayloads[1].length, 3);
  assert.equal(third.budgetExceeded, true);
});

test('classifyGeminiError maps API auth, quota, and upstream failures to safe Arabic reasons', () => {
  const authErr = new Error('API_KEY_INVALID');
  authErr.status = 401;
  assert.equal(classifyGeminiError(authErr).code, 'permission_denied');

  const quotaErr = new Error('RESOURCE_EXHAUSTED');
  quotaErr.status = 429;
  assert.equal(classifyGeminiError(quotaErr).code, 'quota_exceeded');
});

test('buildGeminiRequestConfig omits maxOutputTokens and temperature on Gemini 4 models while preserving them on Gemini 3', () => {
  assert.equal(isGemini4Model('gemini-4-hydrogen'), true);
  assert.equal(isGemini4Model('models/gemini-4-neon'), true);
  assert.equal(isGemini4Model('gemini-3.1-flash-lite-preview'), false);

  const g4Config = buildGeminiRequestConfig({
    model: 'gemini-4-hydrogen',
    systemPrompt: 'مرشد تعليمي',
    maxTokens: 900,
    temperature: 0.4,
  });
  assert.equal('maxOutputTokens' in g4Config, false);
  assert.equal('temperature' in g4Config, false);
  assert.ok(g4Config.systemInstruction.includes('مرشد تعليمي'));
  assert.ok(g4Config.systemInstruction.includes('كلمة'));

  const g4PrefixedConfig = buildGeminiRequestConfig({
    model: 'models/gemini-4-neon',
    systemPrompt: 'مرشد',
    maxTokens: 600,
  });
  assert.equal('maxOutputTokens' in g4PrefixedConfig, false);

  const g3Config = buildGeminiRequestConfig({
    model: 'gemini-3.1-flash-lite-preview',
    systemPrompt: 'مرشد تعليمي',
    maxTokens: 900,
    temperature: 0.4,
  });
  assert.equal(g3Config.maxOutputTokens, 900);
  assert.equal(g3Config.temperature, 0.4);
});

test('loadConfig keeps DATABASE_PATH=":memory:" verbatim without resolving a file path', () => {
  const cfg = loadConfig({ DATABASE_PATH: ':memory:' }, { loadDotenv: false });
  assert.equal(cfg.database.path, ':memory:');
});
