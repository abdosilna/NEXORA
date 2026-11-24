import { BaseAiProvider } from './base.js';

export class DeterministicFallbackProvider extends BaseAiProvider {
  constructor() {
    super({ name: 'fallback', model: 'offline-curriculum-ar', timeoutMs: 1000, maxRetries: 0 });
  }

  isConfigured() {
    return true;
  }

  async generate({ messages, context = {} }) {
    const lastUserMessage = [...(messages || [])].reverse().find((m) => m.role === 'user')?.content || '';
    const topic = lastUserMessage.slice(0, 120) || 'الموضوع المطلوب';
    const levelLabel =
      context.level === 'advanced' ? 'متقدم' : context.level === 'intermediate' ? 'متوسط' : 'مبتدئ';

    const text = [
      `📘 *الوضع التعليمي المنظم (بدون اتصال بمزود ذكاء اصطناعي خارجي)*`,
      `الموضوع: ${topic}`,
      `مستواك الحالي: ${levelLabel}`,
      ``,
      `1) *فكرة أساسية*: ابدأ بتحديد المصطلحات الرئيسة في "${topic}" ثم اربطها بمثال عملي واحد.`,
      `2) *تمرين سريع*: اكتب جملة أو مثالاً تطبيقياً من عندك وسأسجّل تقدّمك في المسار.`,
      `3) *تنويه شفاف*: مزوّد الذكاء الاصطناعي الخارجي غير مفعّل أو تعذّر الوصول إليه حالياً؛ يمكنك الاستفادة الكاملة من دروس وأسئلة *أكاديمية اللغات* و*أكاديمية البرمجة* و*البحث المستقل* و*المكتبة*.`,
    ].join('\n');

    return {
      text,
      provider: 'fallback',
      model: this.model,
      isFallback: true,
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}
