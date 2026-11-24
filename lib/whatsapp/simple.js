import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { sanitizeIncomingText } from '../security/sanitize.js';

export function decodeJid(jid) {
  if (!jid || typeof jid !== 'string') return '';
  try {
    return jidNormalizedUser(jid);
  } catch {
    return jid;
  }
}

export function isBaileysMessageId(id) {
  if (!id || typeof id !== 'string') return false;
  return (id.startsWith('BAE5') && id.length === 16) || (id.startsWith('3EB0') && id.length >= 12);
}

export async function resolveSenderJid(sock, key) {
  const isGroup = Boolean(key?.remoteJid?.endsWith('@g.us'));
  const candidate = isGroup
    ? key?.participantAlt || key?.participant || key?.remoteJidAlt || key?.remoteJid || ''
    : key?.remoteJidAlt || key?.participantAlt || key?.remoteJid || '';

  if (!candidate) return '';
  if (candidate.endsWith('@lid') && sock?.signalRepository?.lidMapping?.getPNForLID) {
    try {
      const mapped = await sock.signalRepository.lidMapping.getPNForLID(candidate);
      if (mapped) return decodeJid(mapped);
    } catch {
      // Fallback to normalized LID below
    }
  }
  return decodeJid(candidate);
}

export function unwrapMessagePayload(message) {
  if (!message || typeof message !== 'object') return null;
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.documentWithCaptionMessage?.message ||
    message
  );
}

export function extractIncomingMessageContent(msg) {
  if (!msg || !msg.message) {
    return { text: '', selectedId: null, kind: 'empty' };
  }

  const inner = unwrapMessagePayload(msg.message);
  if (!inner) {
    return { text: '', selectedId: null, kind: 'empty' };
  }

  if (inner.listResponseMessage?.singleSelectReply?.selectedRowId) {
    const selectedId = inner.listResponseMessage.singleSelectReply.selectedRowId;
    const title = inner.listResponseMessage.title || selectedId;
    return {
      text: sanitizeIncomingText(title),
      selectedId: sanitizeIncomingText(selectedId, 100),
      kind: 'list_response',
    };
  }

  if (inner.buttonsResponseMessage?.selectedButtonId) {
    const selectedId = inner.buttonsResponseMessage.selectedButtonId;
    const display = inner.buttonsResponseMessage.selectedDisplayText || selectedId;
    return {
      text: sanitizeIncomingText(display),
      selectedId: sanitizeIncomingText(selectedId, 100),
      kind: 'button_response',
    };
  }

  if (inner.templateButtonReplyMessage?.selectedId) {
    const selectedId = inner.templateButtonReplyMessage.selectedId;
    const display = inner.templateButtonReplyMessage.selectedDisplayText || selectedId;
    return {
      text: sanitizeIncomingText(display),
      selectedId: sanitizeIncomingText(selectedId, 100),
      kind: 'template_button',
    };
  }

  if (inner.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const parsed = JSON.parse(inner.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
      const id = parsed.id || parsed.selectedRowId || '';
      return {
        text: sanitizeIncomingText(id),
        selectedId: sanitizeIncomingText(id, 100),
        kind: 'interactive_response',
      };
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

  const kind = rawText
    ? 'text'
    : inner.audioMessage
      ? 'audio'
      : inner.imageMessage
        ? 'image'
        : inner.videoMessage
          ? 'video'
          : inner.documentMessage
            ? 'document'
            : 'other';

  return {
    text: sanitizeIncomingText(rawText, 4000),
    selectedId: null,
    kind,
  };
}

export async function serializeMessage(sock, msg, { senderHelper = null } = {}) {
  if (!msg || !msg.key) return null;

  const chat = msg.key.remoteJid || '';
  const isGroup = chat.endsWith('@g.us');
  const isBroadcast = chat === 'status@broadcast' || chat.endsWith('@newsletter');
  const sender = await resolveSenderJid(sock, msg.key);
  const inner = unwrapMessagePayload(msg.message);
  const extracted = extractIncomingMessageContent(msg);
  const contextInfo =
    inner?.extendedTextMessage?.contextInfo ||
    inner?.imageMessage?.contextInfo ||
    inner?.videoMessage?.contextInfo ||
    inner?.documentMessage?.contextInfo ||
    inner?.listResponseMessage?.contextInfo ||
    inner?.buttonsResponseMessage?.contextInfo ||
    {};

  const mentionedJid = Array.isArray(contextInfo?.mentionedJid)
    ? contextInfo.mentionedJid.map((j) => decodeJid(j)).filter(Boolean)
    : [];

  const botJid = decodeJid(sock?.user?.id || '');
  const isBotMentioned = Boolean(botJid && mentionedJid.includes(botJid));

  const m = {
    id: msg.key.id || '',
    chat,
    sender,
    botJid,
    isGroup,
    isBroadcast,
    fromMe: Boolean(msg.key.fromMe),
    isBaileys: isBaileysMessageId(msg.key.id),
    pushName: sanitizeIncomingText(msg.pushName || '', 120),
    text: extracted.text,
    selectedId: extracted.selectedId,
    kind: extracted.kind,
    mentionedJid,
    isBotMentioned,
    quoted: contextInfo?.quotedMessage
      ? {
          id: contextInfo.stanzaId || '',
          sender: decodeJid(contextInfo.participant || ''),
          text: extractIncomingMessageContent({ message: contextInfo.quotedMessage }).text,
        }
      : null,
    msg,
    async reply(payloadOrText) {
      const payload = typeof payloadOrText === 'string' ? { text: payloadOrText } : payloadOrText;
      if (senderHelper) {
        return senderHelper.sendResponse(sock, chat, payload, { quoted: msg });
      }
      if (sock?.sendMessage && payload?.text) {
        return sock.sendMessage(chat, { text: payload.text }, { quoted: msg });
      }
      return null;
    },
  };

  return m;
}
