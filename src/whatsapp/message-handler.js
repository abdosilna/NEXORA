import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { sharedRateLimiter } from '../security/rate-limit.js';
import { sanitizeIncomingText } from '../security/sanitize.js';

export function extractIncomingMessageContent(msg) {
  if (!msg || !msg.message) {
    return { text: '', selectedId: null, kind: 'empty' };
  }

  // Unwrap ephemeral / viewOnce wrappers if present
  const inner =
    msg.message.ephemeralMessage?.message ||
    msg.message.viewOnceMessage?.message ||
    msg.message.viewOnceMessageV2?.message ||
    msg.message;

  if (inner.listResponseMessage?.singleSelectReply?.selectedRowId) {
    const selectedId = inner.listResponseMessage.singleSelectReply.selectedRowId;
    const title = inner.listResponseMessage.title || selectedId;
    return { text: sanitizeIncomingText(title), selectedId: sanitizeIncomingText(selectedId, 100), kind: 'list_response' };
  }

  if (inner.buttonsResponseMessage?.selectedButtonId) {
    const selectedId = inner.buttonsResponseMessage.selectedButtonId;
    const display = inner.buttonsResponseMessage.selectedDisplayText || selectedId;
    return { text: sanitizeIncomingText(display), selectedId: sanitizeIncomingText(selectedId, 100), kind: 'button_response' };
  }

  if (inner.templateButtonReplyMessage?.selectedId) {
    const selectedId = inner.templateButtonReplyMessage.selectedId;
    const display = inner.templateButtonReplyMessage.selectedDisplayText || selectedId;
    return { text: sanitizeIncomingText(display), selectedId: sanitizeIncomingText(selectedId, 100), kind: 'template_button' };
  }

  if (inner.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const parsed = JSON.parse(inner.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
      const id = parsed.id || parsed.selectedRowId || '';
      return { text: sanitizeIncomingText(id), selectedId: sanitizeIncomingText(id, 100), kind: 'interactive_response' };
    } catch {
      return { text: '', selectedId: null, kind: 'interactive_response' };
    }
  }

  const rawText =
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    '';

  return {
    text: sanitizeIncomingText(rawText, 4000),
    selectedId: null,
    kind: rawText ? 'text' : inner.audioMessage ? 'audio' : 'other',
  };
}

export class IncomingMessageHandler {
  constructor({ repos, router, sender, logger = null }) {
    this.repos = repos;
    this.router = router;
    this.sender = sender;
    this.logger = logger;
  }

  async handleUpsert({ sock, messages, type }) {
    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages || []) {
      try {
        if (!msg?.key || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid || '';
        if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@newsletter')) {
          continue;
        }
        // Ignore group chats by default so bot responds cleanly in private educational 1:1 chats
        if (remoteJid.endsWith('@g.us')) {
          continue;
        }

        const resolvedJid = jidNormalizedUser(msg.key.remoteJidAlt || remoteJid);
        const extracted = extractIncomingMessageContent(msg);

        if (extracted.kind === 'audio') {
          await this.sender.sendResponse(sock, remoteJid, {
            text: '🎙️ استلمت رسالة صوتية! حالياً أفهم الرسائل النصية وأزرار القوائم. يمكنك إرسال سؤالك نصياً أو إرسال *5* لفتح قسم الصوت والنطق.',
          });
          continue;
        }

        if (!extracted.text && !extracted.selectedId) {
          continue;
        }

        const rate = sharedRateLimiter.check(`wa:${resolvedJid}`, { limit: 25, windowMs: 60_000 });
        if (!rate.allowed) {
          await this.sender.sendResponse(sock, remoteJid, {
            text: `⏳ أرسلت عدة رسائل متتالية بسرعة. انتظر ${Math.ceil(rate.retryAfterMs / 1000)} ثوانٍ ثم حاول مجدداً.`,
          });
          continue;
        }

        const { user, isNew } = this.repos.users.registerOrTouch({
          whatsappJid: resolvedJid,
          displayName: msg.pushName || '',
        });

        const activeMenu = this.repos.users.getState(user.id)?.menu || 'home';
        this.repos.conversations.append({
          userId: user.id,
          role: 'user',
          module: activeMenu,
          messageText: extracted.selectedId || extracted.text,
        });

        const response = await this.router.route({
          user,
          text: isNew && !extracted.selectedId ? 'home' : extracted.text,
          selectedId: extracted.selectedId,
        });

        if (response?.text) {
          const nextMenu = this.repos.users.getState(user.id)?.menu || 'home';
          this.repos.conversations.append({
            userId: user.id,
            role: 'assistant',
            module: nextMenu,
            messageText: response.text,
          });
        }

        await this.sender.sendResponse(sock, remoteJid, response, { quoted: msg });
      } catch (err) {
        this.logger?.error?.('whatsapp-message', 'Failed processing incoming message', err);
      }
    }
  }
}
