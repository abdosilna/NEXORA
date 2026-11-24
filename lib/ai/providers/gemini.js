import { GoogleGenAI } from '@google/genai';
import { BaseAiProvider } from './base.js';

export class GeminiProvider extends BaseAiProvider {
  constructor({ apiKey, model = 'gemini-2.5-flash', timeoutMs = 20000, maxRetries = 2 }) {
    super({ name: 'gemini', model, timeoutMs, maxRetries });
    this.apiKey = apiKey || '';
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.client);
  }

  async generate({ systemPrompt, messages, maxTokens = 900, temperature = 0.4 }) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured');
    }

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => reject(new Error('Gemini request timeout')), this.timeoutMs);
      if (typeof id.unref === 'function') id.unref();
    });

    const response = await Promise.race([
      this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature,
        },
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
  }
}
