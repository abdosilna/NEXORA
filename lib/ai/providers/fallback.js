import { formatErrorNotice } from '../../utils/text.js';
import { BaseAiProvider } from './base.js';

/**
 * Honest transparent status responder when an AI provider is unconfigured or fails.
 * Never fabricates answers or returns irrelevant hardcoded lesson templates.
 */
export class HonestUnavailableResponder extends BaseAiProvider {
  constructor() {
    super({ name: 'unconfigured', model: 'none', timeoutMs: 1000, maxRetries: 0 });
  }

  isConfigured() {
    return false;
  }

  async generate({ context = {} }) {
    const providerName = context.configuredProvider || 'gemini';
    const reasonCode = context.failureCode || (providerName === 'disabled' ? 'disabled' : 'missing_api_key');

    let reasonLine;
    let steps;

    if (reasonCode === 'disabled') {
      reasonLine = 'خدمة المحادثة بالذكاء الاصطناعي معطلة حالياً من إعدادات النظام (AI_PROVIDER=disabled).';
      steps = [
        'لتفعيل المساعد الذكي، اختر مزوّداً (gemini أو openai أو anthropic) وأضف مفتاح API في إعدادات البيئة.',
        'يمكنك الاستفادة الكاملة الآن من دروس *أكاديمية اللغات* و*أكاديمية البرمجة* و*المكتبة*.',
      ];
    } else if (reasonCode === 'missing_api_key') {
      reasonLine = `لم يتم ضبط مفتاح API لمزوّد الذكاء الاصطناعي (*${providerName}*)، لذلك لا يمكن توليد إجابة ذكية حالياً.`;
      steps = [
        `أضف المتغير *AI_API_KEY* (أو *GEMINI_API_KEY* لمزوّد Gemini) في ملف *.env* ثم أعد تشغيل البوت.`,
        'لا تقلق: جميع دروس *أكاديمية اللغات* و*أكاديمية البرمجة* والاختبارات تعمل بالكامل بدون مفتاح.',
      ];
    } else {
      const detail = context.failureMessageAr || 'حدث عطل مؤقت أثناء الاتصال بمزوّد الذكاء الاصطناعي.';
      reasonLine = `تعذّر إتمام الطلب عبر مزوّد الذكاء الاصطناعي (*${providerName}*): ${detail}`;
      steps = [
        'أعد المحاولة بعد لحظات، أو تحقّق من صلاحية مفتاح API وحصة الاستخدام في الإعدادات.',
        'يمكنك متابعة الدروس والاختبارات المنظمة في الأكاديميات أو البحث المستقل.',
      ];
    }

    return {
      ok: false,
      text: formatErrorNotice('المساعد الذكي غير متاح حالياً', reasonLine, steps),
      provider: reasonCode === 'missing_api_key' || reasonCode === 'disabled' ? 'unconfigured' : providerName,
      model: context.configuredModel || 'none',
      isFallback: true,
      unavailableReason: reasonCode,
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}

export const DeterministicFallbackProvider = HonestUnavailableResponder;
