import fs from 'node:fs/promises';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import { splitWhatsAppMessage } from '../utils/text.js';

export class WhatsAppSender {
  constructor({ logger = null, maxTrackedSentIds = 500, interactiveMenus = true } = {}) {
    this.logger = logger;
    this.maxTrackedSentIds = maxTrackedSentIds;
    this.interactiveMenus = interactiveMenus;
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
      if (payload.image?.ok && payload.image.filePath) {
        try {
          const imageBuffer = await fs.readFile(payload.image.filePath);
          const sentImg = await sock.sendMessage(
            jid,
            {
              image: imageBuffer,
              mimetype: payload.image.mimetype || 'image/png',
              caption: payload.image.caption || payload.text || undefined,
            },
            { quoted }
          );
          this.trackSentMessage(sentImg);

          if (Array.isArray(payload.buttons) && payload.buttons.length > 0 && this.interactiveMenus && typeof sock.relayMessage === 'function') {
            await this._trySendNativeInteractive(
              sock,
              jid,
              {
                text: 'اختر إجراءً تالياً:',
                buttons: payload.buttons,
              },
              undefined
            );
          }
          return;
        } catch (imgErr) {
          this.logger?.warn?.('whatsapp-sender', 'Failed to send generated image, falling back to text', imgErr.message);
        } finally {
          await payload.image.cleanup?.();
        }
      }

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

      const canTryInteractive =
        this.interactiveMenus &&
        typeof sock.relayMessage === 'function' &&
        (payload.interactiveList || (Array.isArray(payload.buttons) && payload.buttons.length > 0));

      if (canTryInteractive) {
        const sentInteractive = await this._trySendNativeInteractive(sock, jid, payload, quoted);
        if (sentInteractive) {
          return;
        }
      }

      if (payload.text) {
        await this._sendPlainText(sock, jid, payload.text, quoted);
      }
    } catch (err) {
      this.logger?.error?.('whatsapp-sender', 'Error sending WhatsApp message', err);
    }
  }

  async _trySendNativeInteractive(sock, jid, payload, quoted) {
    try {
      const nativeButtons = [];

      if (payload.interactiveList?.sections?.length) {
        const sections = payload.interactiveList.sections.map((sec) => ({
          title: String(sec.title || '').slice(0, 24),
          rows: (sec.rows || []).map((r) => ({
            title: String(r.title || '').slice(0, 24),
            description: String(r.description || '').slice(0, 72),
            id: String(r.rowId || r.id || '').slice(0, 100),
          })),
        }));

        nativeButtons.push({
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: String(payload.interactiveList.buttonText || 'فتح القائمة').slice(0, 20),
            sections,
          }),
        });
      }

      if (Array.isArray(payload.buttons)) {
        const limit = payload.interactiveList?.sections?.length ? 2 : 3;
        for (const btn of payload.buttons.slice(0, limit)) {
          nativeButtons.push({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: String(btn.title || btn.text || '').slice(0, 20),
              id: String(btn.id || '').slice(0, 100),
            }),
          });
        }
      }

      if (!nativeButtons.length) return false;

      const bodyText = payload.text || payload.interactiveList?.text || '';
      const headerTitle = payload.interactiveList?.title || '✦ NEXORA BOT';
      const footerText = payload.interactiveList?.footer || 'نيكسورا · رئيسية | رجوع | مساعدة';

      const waMsg = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                header: proto.Message.InteractiveMessage.Header.create({
                  title: String(headerTitle).slice(0, 60),
                  hasMediaAttachment: false,
                }),
                body: proto.Message.InteractiveMessage.Body.create({
                  text: String(bodyText).slice(0, 3200),
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: String(footerText).slice(0, 60),
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: nativeButtons,
                }),
              }),
            },
          },
        },
        {
          userJid: sock.user?.id || jid,
          quoted,
        }
      );

      await sock.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
      this.trackSentMessage(waMsg);
      return true;
    } catch (err) {
      this.logger?.warn?.(
        'whatsapp-sender',
        'Native interactive message unsupported or rejected; falling back to numbered text',
        err.message
      );
      return false;
    }
  }

  async _sendPlainText(sock, jid, text, quoted) {
    const chunks = splitWhatsAppMessage(text, 3200);
    for (let i = 0; i < chunks.length; i += 1) {
      const sent = await sock.sendMessage(
        jid,
        { text: chunks[i] },
        i === 0 && quoted ? { quoted } : undefined
      );
      this.trackSentMessage(sent);
    }
  }
}
