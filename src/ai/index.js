import { GeminiProvider } from './providers/gemini.js';
import { OpenAICompatibleProvider } from './providers/openai-compatible.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { DeterministicFallbackProvider } from './providers/fallback.js';

const SYSTEM_PROMPT_BASE = `أنت "NEXORA BOT"، معلم تعليمي ذكي ناطق بالعربية.
القواعد الصارمة:
1. اشرح المفاهيم بالعربية الفصحى الواضحة وبأسلوب تربوي منظم ومشجع.
2. كيّف الشرح والأمثلة مع مستوى المتعلم (مبتدئ / متوسط / متقدم).
3. لا تختلق أبداً حقائق أو مصادر أو روابط أو إحصاءات غير متأكدة؛ وإذا لم تتوفر المعلومة فاذكر ذلك بوضوح.
4. عند تقديم مساعدة برمجية، وضّح الخطأ ومنطق الإصلاح بأمان دون تشغيل أو تشجيع أكواد ضارة.
5. حافظ على إيجاز مناسب لشاشة واتساب مع نقاط مرقمة وأمثلة عملية.`;

export class AiService {
  constructor(config, { repos = null, logger = null, customProvider = null } = {}) {
    this.config = config;
    this.repos = repos;
    this.logger = logger;
    this.customProvider = customProvider;
    this.fallback = new DeterministicFallbackProvider();
    this.dailyCounters = new Map();
    this.lastStatus = {
      ok: true,
      provider: config.ai.provider,
      configured: Boolean(config.ai.apiKey),
      lastError: null,
      lastCheckedAt: null,
    };
  }

  getActiveProvider() {
    if (this.customProvider) return this.customProvider;
    const providerName = this.repos?.admin?.getSetting('ai_provider_override', null) || this.config.ai.provider;
    const model = this.repos?.admin?.getSetting('ai_model_override', null) || this.config.ai.model;
    const apiKey = this.config.ai.apiKey;
    const timeoutMs = this.config.ai.timeoutMs;
    const maxRetries = this.config.ai.maxRetries;

    if (providerName === 'disabled' || !apiKey) {
      return this.fallback;
    }
    if (providerName === 'openai') {
      return new OpenAICompatibleProvider({
        apiKey,
        model: model || 'gpt-4o-mini',
        baseUrl: this.config.ai.baseUrl,
        timeoutMs,
        maxRetries,
      });
    }
    if (providerName === 'anthropic') {
      return new AnthropicProvider({
        apiKey,
        model: model || 'claude-3-5-sonnet-latest',
        timeoutMs,
        maxRetries,
      });
    }
    return new GeminiProvider({
      apiKey,
      model: model || 'gemini-2.5-flash',
      timeoutMs,
      maxRetries,
    });
  }

  checkUserBudget(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${userId}:${today}`;
    const limit = Number(this.repos?.admin?.getSetting('max_daily_ai_requests', null) ?? this.config.ai.dailyUserBudget) || 40;
    const used = this.dailyCounters.get(key) || 0;
    return {
      allowed: used < limit,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  incrementUserBudget(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${userId}:${today}`;
    this.dailyCounters.set(key, (this.dailyCounters.get(key) || 0) + 1);
  }

  async complete({ userId = 0, systemAddon = '', messages = [], maxTokens = 900, temperature = 0.4, context = {} }) {
    const budget = this.checkUserBudget(userId);
    if (!budget.allowed) {
      return {
        text: `وصلت إلى الحد اليومي المسموح به لطلبات المعلم الذكي (${budget.limit} طلباً). يمكنك متابعة الدروس والاختبارات المنظمة في الأكاديميات أو العودة غداً.`,
        provider: 'budget-limit',
        model: 'none',
        isFallback: true,
        budgetExceeded: true,
      };
    }

    const provider = this.getActiveProvider();
    const systemPrompt = systemAddon ? `${SYSTEM_PROMPT_BASE}\n\n${systemAddon}` : SYSTEM_PROMPT_BASE;

    if (provider === this.fallback || !provider.isConfigured()) {
      return this.fallback.generate({ systemPrompt, messages, context });
    }

    try {
      const result = await provider.generateWithResilience({
        systemPrompt,
        messages,
        maxTokens,
        temperature,
        context,
      });
      this.incrementUserBudget(userId);
      this.lastStatus = {
        ok: true,
        provider: result.provider,
        configured: true,
        lastError: null,
        lastCheckedAt: new Date().toISOString(),
      };
      return result;
    } catch (err) {
      this.logger?.warn?.('ai', `AI provider ${provider.name} failed, using safe fallback`, err.message);
      this.lastStatus = {
        ok: false,
        provider: provider.name,
        configured: provider.isConfigured(),
        lastError: err.message,
        lastCheckedAt: new Date().toISOString(),
      };
      const fallbackResult = await this.fallback.generate({ systemPrompt, messages, context });
      return {
        ...fallbackResult,
        errorRecovered: true,
      };
    }
  }

  getHealth() {
    const provider = this.getActiveProvider();
    return {
      configuredProvider: this.config.ai.provider,
      activeProvider: provider.name,
      model: provider.model,
      hasApiKey: Boolean(this.config.ai.apiKey),
      status: this.config.ai.provider === 'disabled' ? 'disabled' : this.config.ai.apiKey ? (this.lastStatus.ok ? 'healthy' : 'degraded') : 'unconfigured',
      lastError: this.lastStatus.lastError,
      lastCheckedAt: this.lastStatus.lastCheckedAt,
    };
  }
}
