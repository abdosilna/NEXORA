import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeIncomingText } from '../../security/sanitize.js';

export class AudioService {
  constructor(config, { cleanupService = null, logger = null, fetchImpl = fetch } = {}) {
    this.config = config;
    this.cleanupService = cleanupService;
    this.logger = logger;
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    const provider = this.config.tts.provider;
    return provider !== 'disabled' && Boolean(this.config.tts.apiKey);
  }

  getHealth() {
    return {
      provider: this.config.tts.provider,
      enabled: this.isConfigured(),
      maxChars: this.config.tts.maxChars,
      maxDurationSec: this.config.tts.maxDurationSec,
    };
  }

  async synthesizeSpeech({ text, lang = 'ar', userId = 0 }) {
    if (!this.isConfigured()) {
      return {
        ok: false,
        disabled: true,
        reason: 'خدمة التحويل الصوتي (TTS) غير مفعّلة حالياً من إعدادات المزود.',
      };
    }

    const clean = sanitizeIncomingText(text, this.config.tts.maxChars);
    if (!clean) {
      return { ok: false, reason: 'النص المطلوب تحويله إلى صوت فارغ.' };
    }

    // Approximate speech duration guard (~14 chars/sec)
    const estimatedSec = Math.ceil(clean.length / 12);
    if (estimatedSec > this.config.tts.maxDurationSec) {
      return {
        ok: false,
        reason: `النص يتجاوز الحد الأقصى لمدة الصوت (${this.config.tts.maxDurationSec} ثانية).`,
      };
    }

    await fs.mkdir(this.config.tts.tempMediaDir, { recursive: true });
    const filePath = path.join(
      this.config.tts.tempMediaDir,
      `tts_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp3`
    );

    try {
      let audioBuffer = null;
      if (this.config.tts.provider === 'openai') {
        audioBuffer = await this._synthesizeOpenAI(clean);
      } else if (this.config.tts.provider === 'elevenlabs') {
        audioBuffer = await this._synthesizeElevenLabs(clean);
      } else if (this.config.tts.provider === 'google') {
        audioBuffer = await this._synthesizeGoogle(clean, lang);
      } else {
        return { ok: false, disabled: true, reason: 'مزود الصوت غير مدعوم.' };
      }

      if (!audioBuffer || audioBuffer.byteLength === 0) {
        return { ok: false, reason: 'تعذر توليد الملف الصوتي من المزود.' };
      }
      if (audioBuffer.byteLength > 2 * 1024 * 1024) {
        return { ok: false, reason: 'حجم الملف الصوتي تجاوز الحد المسموح (2MB).' };
      }

      await fs.writeFile(filePath, audioBuffer);
      return {
        ok: true,
        filePath,
        mimetype: 'audio/mpeg',
        seconds: Math.min(this.config.tts.maxDurationSec, Math.max(2, estimatedSec)),
        cleanup: () => this.cleanupService?.removeFileSafe(filePath),
      };
    } catch (err) {
      this.logger?.warn?.('tts', 'TTS synthesis failed', err.message);
      await this.cleanupService?.removeFileSafe(filePath);
      return {
        ok: false,
        reason: 'تعذر توليد الصوت حالياً، تم عرض النص البديل.',
      };
    }
  }

  async _synthesizeOpenAI(text) {
    const res = await this.fetchImpl('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.tts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: this.config.tts.voiceId || 'alloy',
        input: text,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async _synthesizeElevenLabs(text) {
    const voiceId = this.config.tts.voiceId || '21m00Tcm4TlvDq8ikWAM';
    const res = await this.fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.config.tts.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`ElevenLabs TTS HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async _synthesizeGoogle(text, lang) {
    const languageCode =
      lang === 'ja' ? 'ja-JP' : lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'cmn-CN' : lang === 'en' ? 'en-US' : 'ar-XA';
    const res = await this.fetchImpl(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(this.config.tts.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode, ssmlGender: 'NEUTRAL' },
          audioConfig: { audioEncoding: 'MP3' },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
    const data = await res.json();
    if (!data.audioContent) throw new Error('Missing audioContent');
    return Buffer.from(data.audioContent, 'base64');
  }

  async handleMenuAction({ user, text, repos }) {
    const trimmed = String(text || '').trim();
    const prefs = repos.users.getPreferences(user.id);

    if (trimmed === '1' || trimmed === 'تبديل') {
      const next = !prefs.voice_replies_enabled;
      repos.users.updatePreferences(user.id, { voice_replies_enabled: next });
      return {
        text: next
          ? '🔊 تم تفعيل الردود الصوتية لحسابك (عند توفر مزود صوت مفعّل في الخادم).'
          : '🔇 تم إيقاف الردود الصوتية والعودة إلى الردود النصية.',
      };
    }

    if (trimmed === '2' || trimmed.startsWith('نطق ')) {
      const sample = trimmed.startsWith('نطق ')
        ? trimmed.slice(4).trim()
        : 'Welcome to Nexora Bot. Practice daily for steady progress.';
      const synth = await this.synthesizeSpeech({ text: sample, lang: 'en', userId: user.id });
      if (!synth.ok) {
        return {
          text: [
            `🎙️ *قسم الصوت والنطق*`,
            `النص التدريبي: "${sample}"`,
            `⚠️ ${synth.reason}`,
            `يمكنك نطق الجملة ببطء ثم الانتقال إلى *أكاديمية اللغات* لتدريبات الاستماع والنطق.`,
          ].join('\n'),
        };
      }
      return {
        text: `🔊 تم تجهيز ملف النطق للجملة:\n"${sample}"`,
        audio: synth,
      };
    }

    const statusLine = this.isConfigured()
      ? `✅ مزود الصوت مفعّل (${this.config.tts.provider})`
      : '⚪ مزود الصوت غير مفعّل في الإعدادات حالياً (الوضع النصي الآمن نشط)';

    return {
      text: [
        `🎙️ *الصوت والنطق — NEXORA BOT*`,
        statusLine,
        `حالة الرد الصوتي في حسابك: ${prefs.voice_replies_enabled ? 'مفعّل' : 'متوقف'}`,
        ``,
        `الأوامر المتاحة هنا:`,
        `• أرسل *1* لتبديل الرد الصوتي التلقائي`,
        `• أرسل *2* أو *نطق [جملة]* لتجربة النطق الصوتي`,
        `• أرسل *رئيسية* للعودة للقائمة`,
      ].join('\n'),
    };
  }
}
