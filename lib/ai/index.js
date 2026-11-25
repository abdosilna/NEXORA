import { GeminiProvider } from './providers/gemini.js';
import { OpenAICompatibleProvider } from './providers/openai-compatible.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { HonestUnavailableResponder } from './providers/fallback.js';

const SYSTEM_PROMPT_BASE = `أنت "NEXORA BOT"، مساعد تعليمي ومعلّم ذكي شامل ناطق بالعربية الفصحى.
القواعد الصارمة:
1. أجب على جميع الأسئلة التعليمية والمعرفية العامة بدقة ووضوح بالعربية (مثل مفاهيم البرمجة، العلوم، الجغرافيا، اللغات، والتاريخ) وبأسلوب منظم ومباشر.
2. استخدم سياق المحادثة السابقة لفهم أسئلة المتابعة دون تكرار الكلام غير الضروري.
3. كيّف مستوى الشرح والأمثلة مع مستوى المتعلم (مبتدئ / متوسط / متقدم).
4. لا تختلق أبداً حقائق أو روابط أو إحصاءات أو مصادر غير متأكدة؛ وإذا لم تتوفر معلومة محددة فاذكر ذلك بوضوح.
5. عند تقديم مساعدة برمجية، وضّح الخطأ ومنطق الإصلاح بأمان دون تشغيل أو تشجيع أكواد ضارة.
6. نسّق الإجابة لشاشة واتساب: عناوين واضحة بنجمتين *عنوان*، فقرات قصيرة، ونقاط مرقمة، وبدون حشو مفرط.`;

export class AiService {
  constructor(config, { repos = null, logger = null, customProvider = null } = {}) {
    this.config = config;
    this.repos = repos;
    this.logger = logger;
    this.customProvider = customProvider;
    this.unavailableResponder = new HonestUnavailableResponder();
    this.dailyCounters = new Map();
    this.lastStatus = {
      ok: Boolean(config.ai.apiKey) || Boolean(customProvider),
      provider: config.ai.provider,
      configured: Boolean(config.ai.apiKey) || Boolean(customProvider),
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
      return this.unavailableResponder;
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
      model: model || 'gemini-4-hydrogen',
      timeoutMs,
      maxRetries,
    });
  }

  isReady() {
    const provider = this.getActiveProvider();
    return provider !== this.unavailableResponder && provider.isConfigured();
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
        ok: false,
        text: `⏳ وصلت إلى الحد اليومي المسموح به لطلبات المساعد الذكي (${budget.limit} طلباً). يمكنك متابعة الدروس والاختبارات المنظمة في الأكاديميات أو العودة غداً.`,
        provider: 'budget-limit',
        model: 'none',
        isFallback: true,
        budgetExceeded: true,
      };
    }

    const provider = this.getActiveProvider();
    const configuredProvider =
      this.repos?.admin?.getSetting('ai_provider_override', null) || this.config.ai.provider;
    const configuredModel =
      this.repos?.admin?.getSetting('ai_model_override', null) || this.config.ai.model;

    const systemPrompt = systemAddon ? `${SYSTEM_PROMPT_BASE}\n\n${systemAddon}` : SYSTEM_PROMPT_BASE;

    if (provider === this.unavailableResponder || !provider.isConfigured()) {
      return this.unavailableResponder.generate({
        systemPrompt,
        messages,
        context: {
          ...context,
          configuredProvider,
          configuredModel,
          failureCode: configuredProvider === 'disabled' ? 'disabled' : 'missing_api_key',
        },
      });
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
      return {
        ok: true,
        isFallback: false,
        ...result,
      };
    } catch (err) {
      this.logger?.warn?.('ai', `AI provider ${provider.name} failed`, err.message);
      this.lastStatus = {
        ok: false,
        provider: provider.name,
        configured: provider.isConfigured(),
        lastError: err.message,
        lastCheckedAt: new Date().toISOString(),
      };
      const errorReport = await this.unavailableResponder.generate({
        systemPrompt,
        messages,
        context: {
          ...context,
          configuredProvider: provider.name,
          configuredModel: provider.model,
          failureCode: err.aiReasonCode || 'upstream_error',
          failureMessageAr: err.aiMessageAr || 'تعذّر الاتصال بمزوّد الذكاء الاصطناعي أو عاد باستجابة غير صالحة.',
        },
      });
      return {
        ...errorReport,
        errorRecovered: true,
        errorDetail: err.aiMessageAr || err.message,
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
      status:
        this.config.ai.provider === 'disabled'
          ? 'disabled'
          : this.config.ai.apiKey
            ? this.lastStatus.ok
              ? 'healthy'
              : 'degraded'
            : 'unconfigured',
      lastError: this.lastStatus.lastError,
      lastCheckedAt: this.lastStatus.lastCheckedAt,
    };
  }
}
