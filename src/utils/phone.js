/**
 * International phone number validation & WhatsApp JID helpers.
 */

export function sanitizePhoneNumber(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^\d]/g, '');
}

export function validateInternationalPhone(raw) {
  const digits = sanitizePhoneNumber(raw);
  if (!digits) {
    return { valid: false, digits: '', reason: 'Phone number is empty' };
  }
  if (digits.startsWith('0')) {
    return {
      valid: false,
      digits,
      reason: 'Phone number must include country code without leading 0 (e.g. 966501234567)',
    };
  }
  if (digits.length < 8 || digits.length > 15) {
    return {
      valid: false,
      digits,
      reason: 'International phone number must be between 8 and 15 digits',
    };
  }
  return { valid: true, digits, reason: null };
}

export function toWhatsAppJid(phoneOrJid) {
  if (!phoneOrJid || typeof phoneOrJid !== 'string') return '';
  if (phoneOrJid.includes('@')) return phoneOrJid;
  const digits = sanitizePhoneNumber(phoneOrJid);
  return digits ? `${digits}@s.whatsapp.net` : '';
}

export function extractPhoneFromJid(jid) {
  if (!jid || typeof jid !== 'string') return '';
  const userPart = jid.split('@')[0] || '';
  return userPart.split(':')[0].replace(/[^\d]/g, '');
}

export function formatPairingCode(code) {
  if (!code || typeof code !== 'string') return '';
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}
