import { BaseAiProvider } from './base.js';

export class AnthropicProvider extends BaseAiProvider {
  constructor({ apiKey, model = 'claude-3-5-sonnet-latest', timeoutMs = 20000, maxRetries = 2, fetchImpl = fetch }) {
    super({ name: 'anthropic', model, timeoutMs, maxRetries });
    this.apiKey = apiKey || '';
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generate({ systemPrompt, messages, maxTokens = 900, temperature = 0.4 }) {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key is not configured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const err = new Error(`Anthropic API error: HTTP ${response.status}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const text = (data?.content || [])
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
        .trim();

      if (!text) {
        throw new Error('Empty response from Anthropic');
      }

      return {
        text,
        provider: this.name,
        model: this.model,
        usage: {
          promptTokens: data?.usage?.input_tokens || 0,
          completionTokens: data?.usage?.output_tokens || 0,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
