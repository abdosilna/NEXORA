import { GoogleGenAI } from '@google/genai';
import { BaseAiProvider } from './base.js';

export function classifyGeminiError(err) {
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const msg = String(err?.message || '').toLowerCase();

  if (msg.includes('timeout')) {
    return { code: 'timeout', messageAr: 'انتهت مهلة الاتصال بخدمة Gemini قبل وصول الرد.' };
  }
  if (status === 400 && (msg.includes('api_key') || msg.includes('api key'))) {
    return { code: 'invalid_api_key', messageAr: 'مفتاح Gemini API غير صالح (API_KEY_INVALID).' };
  }
  if (status === 401 || status === 403 || msg.includes('permission_denied')) {
    return { code: 'permission_denied', messageAr: 'تم رفض صلاحية الوصول إلى Gemini API — تحقق من المفتاح وصلاحياته.' };
  }
  if (status === 429 || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return { code: 'quota_exceeded', messageAr: 'تم استنفاد حصة الاستخدام الحالية (429 RESOURCE_EXHAUSTED) لمزوّد Gemini.' };
  }
  if (status === 404 || msg.includes('not_found')) {
    return { code: 'model_not_found', messageAr: 'النموذج المحدد غير متاح أو غير مدعوم حالياً (404).' };
  }
  return { code: 'upstream_error', messageAr: 'حدث تعذّر مؤقت في الاتصال بمزوّد Gemini.' };
}

export class GeminiProvider extends BaseAiProvider {
  constructor({ apiKey, model = 'gemini-4-hydrogen', timeoutMs = 20000, maxRetries = 2 }) {
    super({ name: 'gemini', model, timeoutMs, maxRetries });
    this.apiKey = apiKey || '';
    this.client = this.apiKey
      ? new GoogleGenAI({
          apiKey: this.apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })
      : null;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.client);
  }

  async generate({ systemPrompt, messages, maxTokens = 900, temperature = 0.4 }) {
    if (!this.isConfigured()) {
      const err = new Error('Gemini API key is not configured');
      err.code = 'missing_api_key';
      throw err;
    }

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const isGemini4 = /^gemini-4-/i.test(this.model);
    const generationConfig = {
      systemInstruction: systemPrompt,
    };

    // Gemini 4 series rejects legacy sampling fields; guide length via systemInstruction instead.
    if (!isGemini4) {
      generationConfig.maxOutputTokens = maxTokens;
      generationConfig.temperature = temperature;
    }

    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => {
        const timeoutErr = new Error('Gemini request timeout');
        timeoutErr.code = 'timeout';
        reject(timeoutErr);
      }, this.timeoutMs);
      if (typeof id.unref === 'function') id.unref();
    });

    try {
      const response = await Promise.race([
        this.client.models.generateContent({
          model: this.model,
          contents,
          config: generationConfig,
        }),
        timeoutPromise,
      ]);

      const text = response?.text?.trim?.() || '';
      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return {
        text,
        provider: this.name,
        model: this.model,
        usage: {
          promptTokens: response?.usageMetadata?.promptTokenCount || 0,
          completionTokens: response?.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (err) {
      const classified = classifyGeminiError(err);
      err.aiReasonCode = classified.code;
      err.aiMessageAr = classified.messageAr;
      throw err;
    }
  }
}
