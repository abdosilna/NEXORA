/**
 * Text normalization, central Arabic WhatsApp formatting, and code-safe message splitting.
 */

const ARABIC_INDIC_DIGITS = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export const ARABIC_DIVIDER = '◈ ─────────────── ◈';
export const NEXORA_FRAME_TOP = '✦ ━━ *NEXORA BOT* ━━ ✦';

export function paginateItems(items = [], page = 1, pageSize = 6) {
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(pageSize) || 6);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const safePage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const start = (safePage - 1) * size;
  return {
    items: list.slice(start, start + size),
    page: safePage,
    pageSize: size,
    totalItems: list.length,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    startIndex: start,
  };
}

export function normalizeArabicDigits(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[٠-٩]/g, (d) => ARABIC_INDIC_DIGITS[d] || d);
}

export function normalizeCommandText(input) {
  if (typeof input !== 'string') return '';
  return normalizeArabicDigits(input)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

export function truncateText(text, max = 300) {
  if (typeof text !== 'string') return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

export function formatHeader(emoji, title, subtitle = '') {
  const head = emoji ? `✦ ${emoji} *${title}*` : `✦ *${title}*`;
  return subtitle ? `${head}\n_${subtitle}_\n${ARABIC_DIVIDER}` : `${head}\n${ARABIC_DIVIDER}`;
}

export function formatSection(title, items = []) {
  const cleanItems = (items || []).filter(Boolean);
  if (!cleanItems.length) return '';
  return `❖ *${title}:*\n${cleanItems.join('\n')}`;
}

export function formatCodeBlock(code, lang = '') {
  const cleanCode = String(code || '').trim();
  if (!cleanCode) return '';
  return `\`\`\`${lang}\n${cleanCode}\n\`\`\``;
}

export function formatErrorNotice(title, reason, nextSteps = []) {
  const lines = [
    `⚠️ *${title}*`,
    ARABIC_DIVIDER,
    reason,
  ];
  if (nextSteps.length) {
    lines.push('', '*الخطوات المقترحة:*', ...nextSteps.map((s) => `• ${s}`));
  }
  return lines.join('\n');
}

export function formatLessonCard({
  title,
  badge = '',
  content = '',
  examples = [],
  pronunciation = '',
  pronunciationLang = '',
  footerActions = [],
}) {
  const blocks = [
    formatHeader('📘', title, badge),
    content.trim(),
  ];

  if (examples && examples.length) {
    blocks.push(formatSection('📌 أمثلة وتطبيقات', examples.map((e) => `• ${e}`)));
  }

  if (pronunciation) {
    const langTag = pronunciationLang ? ` (${pronunciationLang})` : '';
    blocks.push(formatSection(`🗣️ دليل النطق${langTag}`, [`"${pronunciation}"`]));
  }

  if (footerActions && footerActions.length) {
    blocks.push(ARABIC_DIVIDER, ...footerActions);
  }

  return blocks.filter(Boolean).join('\n\n');
}

export function formatQuizCard({ title, progressLabel = '', question, options = [], footerHint = '' }) {
  const headerSubtitle = progressLabel || '';
  const blocks = [
    formatHeader('📝', title, headerSubtitle),
    question,
    options.map((opt, idx) => `*${idx + 1}.* ${opt}`).join('\n'),
  ];
  if (footerHint) {
    blocks.push(ARABIC_DIVIDER, footerHint);
  }
  return blocks.filter(Boolean).join('\n\n');
}

/**
 * Intelligently splits long Arabic/markdown lessons while respecting WhatsApp limits
 * and keeping fenced code blocks intact across chunks.
 */
export function splitWhatsAppMessage(text, maxLength = 3200) {
  if (typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLength) return [trimmed];

  const chunks = [];
  let remaining = trimmed;
  let openCodeLang = null;

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf(`\n${ARABIC_DIVIDER}\n`, maxLength);
    if (splitAt < Math.floor(maxLength * 0.35)) {
      splitAt = remaining.lastIndexOf('\n\n', maxLength);
    }
    if (splitAt < Math.floor(maxLength * 0.35)) {
      splitAt = remaining.lastIndexOf('\n', maxLength);
    }
    if (splitAt < Math.floor(maxLength * 0.35)) {
      splitAt = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitAt < Math.floor(maxLength * 0.25)) {
      splitAt = maxLength;
    }

    let chunk = remaining.slice(0, splitAt).trim();
    const fences = chunk.match(/```([a-zA-Z0-9_-]*)/g) || [];

    // Determine whether a fenced code block was opened and left unclosed in this chunk
    let currentlyOpen = openCodeLang;
    for (const fence of fences) {
      if (currentlyOpen !== null) {
        currentlyOpen = null;
      } else {
        currentlyOpen = fence.slice(3);
      }
    }

    if (currentlyOpen !== null) {
      chunk = `${chunk}\n\`\`\``;
      remaining = `\`\`\`${currentlyOpen}\n${remaining.slice(splitAt).trim()}`;
      openCodeLang = null;
    } else {
      remaining = remaining.slice(splitAt).trim();
      openCodeLang = null;
    }

    if (chunk) chunks.push(chunk);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}
