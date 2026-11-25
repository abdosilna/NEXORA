import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { sharedRateLimiter } from '../security/rate-limit.js';
import { sanitizeIncomingText } from '../security/sanitize.js';
import { ARABIC_DIVIDER, formatErrorNotice, formatHeader, normalizeCommandText } from '../utils/text.js';

export const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const ALLOWED_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

const UNSAFE_IMAGE_PROMPT =
  /(إباح|اباح|عري|عنف دموي|انتحار|أسلحة|سلاح|مخدرات|porn|nsfw|nude|gore|weapon|self[- ]?harm|18\+)/i;

const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const ASPECT_LABELS_AR = {
  '1:1': 'مربع (1:1)',
  '16:9': 'أفقي عريض (16:9)',
  '9:16': 'عمودي للهاتف (9:16)',
  '4:3': 'عرض تقديمي (4:3)',
  '3:4': 'ملصق (3:4)',
};

const PROMPT_TEMPLATES = [
  {
    id: 'creative:tpl:diagram',
    title: '📐 مخطط تعليمي مبسط',
    description: 'إنفوجرافيك نظيف يشرح مفهوماً علمياً أو برمجياً',
    prompt: 'Clean dark-midnight vector infographic explaining how an HTTP API request and response work, violet and cyan accents, high clarity, minimal labels',
  },
  {
    id: 'creative:tpl:space',
    title: '🪐 مشهد علمي فضائي',
    description: 'لوحة تعليمية للنظام الشمسي بأسلوب حديث',
    prompt: 'Detailed educational illustration of the solar system planets orbiting the sun against a deep midnight space backdrop, crisp scientific art style',
  },
  {
    id: 'creative:tpl:coding',
    title: '💻 غلاف مشروع برمجي',
    description: 'تصميم عصري لغلاف عرض أو تطبيق تعليمي',
    prompt: 'Modern minimalist dark workspace illustration with floating geometric purple and cyan code cards, soft ambient glow, clean digital art',
  },
];

export class CreativeStudioModule {
  constructor(config, { repos = null, cleanupService = null, logger = null, aiClient = null, fetchImpl = fetch } = {}) {
    this.config = config;
    this.repos = repos;
    this.cleanupService = cleanupService;
    this.logger = logger;
    this.aiClient = aiClient;
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    const provider = this.config?.creative?.provider || 'disabled';
    return provider !== 'disabled' && Boolean(this.config?.creative?.apiKey);
  }

  getHealth() {
    const provider = this.config?.creative?.provider || 'disabled';
    return {
      provider,
      model: this.config?.creative?.model || 'gemini-3.1-flash-lite-image',
      enabled: this.isConfigured(),
      maxBytes: this.config?.creative?.maxBytes || 5 * 1024 * 1024,
      allowedMimeTypes: [...ALLOWED_IMAGE_MIMES],
    };
  }

  openHome(user, aspect = '1:1') {
    const safeAspect = ALLOWED_ASPECT_RATIOS.includes(aspect) ? aspect : '1:1';
    this.repos?.users?.setState(user.id, {
      menu: 'creative',
      data: { step: 'await_prompt', aspectRatio: safeAspect },
    });

    const health = this.getHealth();
    const statusLine = health.enabled
      ? `✅ *الاستوديو جاهز* — المزوّد: *${health.provider}* (${health.model})`
      : `⚠️ *توليد الصور غير مفعّل حالياً* — أضف *IMAGE_PROVIDER* و *IMAGE_API_KEY* (أو *GEMINI_API_KEY*) في إعدادات الخادم.`;

    return {
      text: [
        formatHeader('🎨', 'الاستوديو الإبداعي وتوليد الصور — NEXORA', 'تصميم بصري تعليمي آمن بدقة عالية'),
        statusLine,
        `📐 نسبة الأبعاد المختارة: *${ASPECT_LABELS_AR[safeAspect] || safeAspect}*`,
        '',
        `✦ *اكتب وصف الصورة المطلوبة* مباشرة (بالعربية أو الإنجليزية) لتوليدها، أو اختر قالباً جاهزاً:`,
        `*1.* تغيير الأبعاد إلى مربع (1:1)`,
        `*2.* تغيير الأبعاد إلى أفقي (16:9)`,
        `*3.* تغيير الأبعاد إلى عمودي (9:16)`,
        `*4.* أفكار وقوالب تعليمية جاهزة`,
        ARABIC_DIVIDER,
        `🛡️ الصيغ المدعومة: PNG / JPEG / WebP · الحد الأقصى 5MB · محتوى آمن فقط.`,
      ].join('\n'),
      interactiveList: {
        title: '🎨 الاستوديو الإبداعي',
        text: 'اختر قالباً جاهزاً أو اضبط أبعاد الصورة، أو أرسل وصفك نصياً:',
        buttonText: 'خيارات الاستوديو',
        footer: 'NEXORA Studio · أرسل وصفاً أو اختر من القائمة',
        sections: [
          {
            title: '📐 أبعاد الصورة',
            rows: [
              { rowId: 'creative:aspect:1:1', title: 'مربع (1:1)', description: 'مناسب للأيقونات والمنشورات التعليمية' },
              { rowId: 'creative:aspect:16:9', title: 'أفقي عريض (16:9)', description: 'مناسب للعروض التقديمية والمخططات' },
              { rowId: 'creative:aspect:9:16', title: 'عمودي (9:16)', description: 'مناسب لشاشة الهاتف والقصص التعليمية' },
            ],
          },
          {
            title: '✨ قوالب تعليمية سريعة',
            rows: PROMPT_TEMPLATES.map((t) => ({
              rowId: t.id,
              title: t.title.slice(0, 24),
              description: t.description.slice(0, 72),
            })),
          },
        ],
      },
      buttons: [
        { id: 'creative:examples', title: '✨ أمثلة أوامر' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
        { id: 'nav:help', title: '❓ مساعدة' },
      ],
    };
  }

  async handleInput({ user, text, selectedId = null, state = {} }) {
    const raw = sanitizeIncomingText(selectedId || text, 600);
    const norm = normalizeCommandText(raw);
    const currentAspect = state?.data?.aspectRatio || '1:1';

    if (raw.startsWith('creative:aspect:')) {
      const ratio = raw.slice('creative:aspect:'.length);
      return this.openHome(user, ratio);
    }
    if (norm === '1') return this.openHome(user, '1:1');
    if (norm === '2') return this.openHome(user, '16:9');
    if (norm === '3') return this.openHome(user, '9:16');

    if (raw === 'creative:examples' || norm === '4' || norm === 'امثله' || norm === 'أمثلة') {
      return {
        text: [
          formatHeader('✨', 'أمثلة لوصف الصور التعليمية'),
          ...PROMPT_TEMPLATES.map((t, idx) => `*${idx + 1}.* ${t.title}\n   _${t.prompt}_`),
          ARABIC_DIVIDER,
          `أرسل وصفاً مشابهاً الآن لتوليد الصورة، أو اختر من الأزرار أدناه.`,
        ].join('\n'),
        buttons: [
          { id: 'creative:tpl:diagram', title: '📐 تجربة المخطط' },
          { id: 'menu:creative', title: '🎨 الاستوديو' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    const templateMatch = PROMPT_TEMPLATES.find((t) => t.id === raw);
    const promptToRun = templateMatch ? templateMatch.prompt : raw;

    if (!promptToRun || promptToRun.length < 3) {
      return {
        text: '⚠️ يرجى كتابة وصف أوضح للصورة (3 أحرف على الأقل)، أو اختيار قالب من القائمة.',
        buttons: [
          { id: 'creative:examples', title: '✨ أمثلة أوامر' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    return this.generateAndFormat({ user, prompt: promptToRun, aspectRatio: currentAspect });
  }

  async generateAndFormat({ user, prompt, aspectRatio = '1:1' }) {
    const result = await this.generateImage({
      userId: user.id,
      prompt,
      aspectRatio,
    });

    if (!result.ok) {
      const steps = result.disabled
        ? [
            'اضبط *IMAGE_PROVIDER=gemini* (أو *openai*) في ملف *.env*.',
            'أضف *IMAGE_API_KEY* (أو *GEMINI_API_KEY* لمزوّد Gemini) ثم أعد تشغيل البوت.',
            'بعد التفعيل أعد إرسال الوصف لتصلك الصورة مباشرة هنا.',
          ]
        : ['تأكد من سلامة الوصف وصلاحية مفتاح الصور ثم أعد المحاولة.'];

      return {
        text: formatErrorNotice('تعذّر توليد الصورة في الاستوديو الإبداعي', result.reason, steps),
        buttons: [
          { id: 'creative:examples', title: '✨ أمثلة أوامر' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    this.repos?.progress?.recordLearningEvent?.({
      userId: user.id,
      module: 'creative',
      eventType: 'image_generated',
      topic: prompt.slice(0, 80),
      payload: { provider: result.provider, model: result.model, aspectRatio },
    });

    return {
      text: `🎨 تم إنشاء التصميم (${result.aspectRatio}) بنجاح.`,
      image: {
        ok: true,
        filePath: result.filePath,
        mimetype: result.mimetype,
        caption: `🎨 *استوديو NEXORA الإبداعي*\n✦ الوصف: _${prompt.slice(0, 160)}_\n📐 الأبعاد: ${result.aspectRatio}`,
        cleanup: result.cleanup,
      },
      buttons: [
        { id: 'menu:creative', title: '🎨 تصميم جديد' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  async generateImage({ userId = 0, prompt, aspectRatio = '1:1' }) {
    const cleanPrompt = sanitizeIncomingText(prompt, 500);
    if (!cleanPrompt || cleanPrompt.length < 3) {
      return { ok: false, reason: 'وصف الصورة قصير جداً أو غير صالح.' };
    }
    if (UNSAFE_IMAGE_PROMPT.test(cleanPrompt)) {
      return {
        ok: false,
        unsafe: true,
        reason: 'لا يمكن توليد صور تحتوي على عنف أو محتوى غير لائق؛ الاستوديو مخصص للمحتوى التعليمي والإبداعي الآمن فقط.',
      };
    }

    if (!this.isConfigured()) {
      const provider = this.config?.creative?.provider || 'disabled';
      return {
        ok: false,
        disabled: true,
        reason:
          provider === 'disabled'
            ? 'الاستوديو الإبداعي معطّل حالياً من إعدادات النظام (IMAGE_PROVIDER=disabled).'
            : `مفتاح API لمزوّد الصور (${provider}) غير مضبوط في الإعدادات (IMAGE_API_KEY).`,
      };
    }

    const rate = sharedRateLimiter.check(`creative:${userId}`, { limit: 5, windowMs: 60_000 });
    if (!rate.allowed) {
      return {
        ok: false,
        reason: `تم بلوغ الحد المؤقت لطلبات الصور. انتظر ${Math.ceil(rate.retryAfterMs / 1000)} ثانية وحاول مجدداً.`,
      };
    }

    const safeRatio = ALLOWED_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : '1:1';
    const provider = this.config.creative.provider;
    const maxBytes = Number(this.config.creative.maxBytes) || 5 * 1024 * 1024;
    const timeoutMs = Number(this.config.creative.timeoutMs) || 25000;

    await fs.mkdir(this.config.creative.tempMediaDir, { recursive: true });
    let filePath = '';

    try {
      let generated = null;
      if (provider === 'gemini') {
        generated = await this._generateWithGemini({ prompt: cleanPrompt, aspectRatio: safeRatio, timeoutMs });
      } else if (provider === 'openai') {
        generated = await this._generateWithOpenAI({ prompt: cleanPrompt, aspectRatio: safeRatio, timeoutMs });
      } else {
        return { ok: false, disabled: true, reason: `مزود الصور غير مدعوم: ${provider}` };
      }

      if (!generated?.buffer || generated.buffer.byteLength === 0) {
        return { ok: false, reason: 'لم يُرجع مزوّد الصور ملفاً صالحاً.' };
      }
      if (!ALLOWED_IMAGE_MIMES.has(generated.mimetype)) {
        return { ok: false, reason: `نوع الملف الناتج غير مدعوم (${generated.mimetype}).` };
      }
      if (generated.buffer.byteLength > maxBytes) {
        return { ok: false, reason: `حجم الصورة الناتجة تجاوز الحد المسموح (${Math.round(maxBytes / (1024 * 1024))}MB).` };
      }

      const ext = MIME_TO_EXT[generated.mimetype] || 'png';
      filePath = path.join(
        this.config.creative.tempMediaDir,
        `img_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
      );
      await fs.writeFile(filePath, generated.buffer);

      return {
        ok: true,
        provider,
        model: this.config.creative.model,
        aspectRatio: safeRatio,
        mimetype: generated.mimetype,
        filePath,
        bytes: generated.buffer.byteLength,
        cleanup: () => this.cleanupService?.removeFileSafe(filePath) || fs.unlink(filePath).catch(() => {}),
      };
    } catch (err) {
      this.logger?.warn?.('creative', 'Image generation failed', err.message);
      if (filePath) {
        await (this.cleanupService?.removeFileSafe(filePath) || fs.unlink(filePath).catch(() => {}));
      }
      return {
        ok: false,
        reason: err.message?.includes('timeout')
          ? 'انتهت مهلة توليد الصورة قبل اكتمال الاستجابة من المزوّد.'
          : 'تعذّر توليد الصورة حالياً من المزوّد، تحقق من المفتاح والحصة ثم أعد المحاولة.',
      };
    }
  }

  async _generateWithGemini({ prompt, aspectRatio, timeoutMs }) {
    const client =
      this.aiClient ||
      new GoogleGenAI({
        apiKey: this.config.creative.apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

    const model = this.config.creative.model || 'gemini-3.1-flash-lite-image';
    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => reject(new Error('Image generation timeout')), timeoutMs);
      if (typeof id.unref === 'function') id.unref();
    });

    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio },
        },
      }),
      timeoutPromise,
    ]);

    const parts = response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return {
          buffer: Buffer.from(part.inlineData.data, 'base64'),
          mimetype: String(part.inlineData.mimeType || 'image/png').toLowerCase(),
        };
      }
    }
    throw new Error('No inline image data returned by Gemini');
  }

  async _generateWithOpenAI({ prompt, aspectRatio, timeoutMs }) {
    const size = aspectRatio === '16:9' ? '1536x1024' : aspectRatio === '9:16' ? '1024x1536' : '1024x1024';
    const res = await this.fetchImpl('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.creative.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.creative.model || 'gpt-image-1',
        prompt,
        size,
        response_format: 'b64_json',
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`OpenAI Image HTTP ${res.status}`);
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('Missing OpenAI image payload');
    return {
      buffer: Buffer.from(b64, 'base64'),
      mimetype: 'image/png',
    };
  }
}
