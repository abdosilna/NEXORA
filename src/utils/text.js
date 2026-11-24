/**
 * Text normalization, WhatsApp chunking, and Arabic formatting utilities.
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

export function splitWhatsAppMessage(text, maxLength = 3500) {
  if (typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLength) return [trimmed];

  const chunks = [];
  let remaining = trimmed;

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf('\n\n', maxLength);
    if (splitAt < Math.floor(maxLength * 0.4)) {
      splitAt = remaining.lastIndexOf('\n', maxLength);
    }
    if (splitAt < Math.floor(maxLength * 0.4)) {
      splitAt = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitAt < Math.floor(maxLength * 0.3)) {
      splitAt = maxLength;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

export function truncateText(text, max = 300) {
  if (typeof text !== 'string') return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}
