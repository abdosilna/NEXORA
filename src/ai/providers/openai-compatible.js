import { BaseAiProvider } from './base.js';

export class OpenAICompatibleProvider extends BaseAiProvider {
  constructor({
    apiKey,
    model = 'gpt-4o-mini',
    baseUrl = 'https://api.openai.com/v1',
    timeoutMs = 20000,
    maxRetries = 2,
    fetchImpl = fetch,
  }) {
    super({ name: 'openai', model, timeoutMs, maxRetries });
    this.apiKey = apiKey || '';
    this.baseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generate({ systemPrompt, messages, maxTokens = 900, temperature = 0.4 }) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI-compatible API key is not configured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ],
        }),
      });

      if (!response.ok) {
        const err = new Error(`OpenAI API error: HTTP ${response.status}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim?.() || '';
      if (!text) {
        throw new Error('Empty response from OpenAI-compatible provider');
      }

      return {
        text,
        provider: this.name,
        model: this.model,
        usage: {
          promptTokens: data?.usage?.prompt_tokens || 0,
          completionTokens: data?.usage?.completion_tokens || 0,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
