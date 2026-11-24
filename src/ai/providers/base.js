/**
 * Base modular AI provider interface with timeout, retry limits, and error normalization.
 */
export class BaseAiProvider {
  constructor({ name, model, timeoutMs = 20000, maxRetries = 2 }) {
    this.name = name;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  isConfigured() {
    return false;
  }

  async generate(_payload) {
    throw new Error(`Provider ${this.name} must implement generate()`);
  }

  async generateWithResilience(payload) {
    let lastError = null;
    const attempts = Math.max(1, this.maxRetries + 1);

    for (let i = 0; i < attempts; i += 1) {
      try {
        return await this.generate(payload);
      } catch (err) {
        lastError = err;
        const retryable = isRetryableError(err);
        if (!retryable || i === attempts - 1) {
          throw err;
        }
        const delayMs = Math.min(2500, 350 * 2 ** i);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError || new Error('AI request failed');
  }
}

function isRetryableError(err) {
  const msg = String(err?.message || '');
  const status = Number(err?.status || err?.statusCode || 0);
  if (status === 429 || status >= 500) return true;
  if (/timeout|aborted|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg)) return true;
  return false;
}
