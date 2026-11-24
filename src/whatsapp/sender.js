import fs from 'node:fs/promises';
import { splitWhatsAppMessage } from '../utils/text.js';

export class WhatsAppSender {
  constructor({ logger = null } = {}) {
    this.logger = logger;
  }

  async sendResponse(sock, jid, payload, { quoted = undefined } = {}) {
    if (!sock || !jid || !payload) return;

    try {
      // Optional audio pronunciation / voice reply with guaranteed cleanup
      if (payload.audio?.ok && payload.audio.filePath) {
        try {
          const audioBuffer = await fs.readFile(payload.audio.filePath);
          await sock.sendMessage(
            jid,
            {
              audio: audioBuffer,
              mimetype: payload.audio.mimetype || 'audio/mpeg',
              ptt: true,
              seconds: payload.audio.seconds,
            },
            { quoted }
          );
        } catch (audioErr) {
          this.logger?.warn?.('whatsapp-sender', 'Failed to send audio PTT, continuing with text', audioErr.message);
        } finally {
          await payload.audio.cleanup?.();
        }
      }

      // Always send clear text (chunked safely for WhatsApp limits).
      // Interactive lists/buttons on unofficial WhatsApp Web clients vary by recipient client version;
      // sending full numbered Arabic text guarantees 100% reliability on every WhatsApp client.
      if (payload.text) {
        const chunks = splitWhatsAppMessage(payload.text, 3500);
        for (let i = 0; i < chunks.length; i += 1) {
          await sock.sendMessage(
            jid,
            { text: chunks[i] },
            i === 0 && quoted ? { quoted } : undefined
          );
        }
      }
    } catch (err) {
      this.logger?.error?.('whatsapp-sender', 'Error sending WhatsApp message', err);
    }
  }
}
