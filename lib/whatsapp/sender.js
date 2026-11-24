import fs from 'node:fs/promises';
import { splitWhatsAppMessage } from '../utils/text.js';

export class WhatsAppSender {
  constructor({ logger = null, maxTrackedSentIds = 500 } = {}) {
    this.logger = logger;
    this.maxTrackedSentIds = maxTrackedSentIds;
    this.sentMessageIds = new Set();
  }

  trackSentMessage(result) {
    const id = result?.key?.id;
    if (!id) return;
    this.sentMessageIds.add(id);
    if (this.sentMessageIds.size > this.maxTrackedSentIds) {
      const oldest = this.sentMessageIds.values().next().value;
      this.sentMessageIds.delete(oldest);
    }
  }

  hasRecentlySent(id) {
    return Boolean(id && this.sentMessageIds.has(id));
  }

  async sendResponse(sock, jid, payload, { quoted = undefined } = {}) {
    if (!sock || !jid || !payload) return;

    try {
      if (payload.audio?.ok && payload.audio.filePath) {
        try {
          const audioBuffer = await fs.readFile(payload.audio.filePath);
          const sent = await sock.sendMessage(
            jid,
            {
              audio: audioBuffer,
              mimetype: payload.audio.mimetype || 'audio/mpeg',
              ptt: true,
              seconds: payload.audio.seconds,
            },
            { quoted }
          );
          this.trackSentMessage(sent);
        } catch (audioErr) {
          this.logger?.warn?.('whatsapp-sender', 'Failed to send audio PTT, continuing with text', audioErr.message);
        } finally {
          await payload.audio.cleanup?.();
        }
      }

      if (payload.text) {
        const chunks = splitWhatsAppMessage(payload.text, 3500);
        for (let i = 0; i < chunks.length; i += 1) {
          const sent = await sock.sendMessage(
            jid,
            { text: chunks[i] },
            i === 0 && quoted ? { quoted } : undefined
          );
          this.trackSentMessage(sent);
        }
      }
    } catch (err) {
      this.logger?.error?.('whatsapp-sender', 'Error sending WhatsApp message', err);
    }
  }
}
