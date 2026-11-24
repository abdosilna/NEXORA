import path from 'node:path';

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{20,}/g,
  /sk-[A-Za-z0-9\-_]{16,}/g,
  /sk-ant-[A-Za-z0-9\-_]{16,}/g,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /(api[_-]?key|secret|token|password|pairing[_-]?code|session|cookie|noiseKey|signedIdentityKey|advSecretKey)\s*[:=]\s*["']?[^\s,"'}]+["']?/gi,
];

export function redactSecrets(input) {
  if (input === null || input === undefined) return '';
  let text = typeof input === 'string' ? input : safeStringify(input);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, group1) => {
      if (group1) return `${group1}=[REDACTED]`;
      return '[REDACTED]';
    });
  }
  return text;
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj, (key, val) => {
      if (/key|secret|token|password|auth|creds|cookie|pairing/i.test(key)) {
        return '[REDACTED]';
      }
      return val;
    });
  } catch {
    return String(obj);
  }
}

export function sanitizeIncomingText(raw, maxLength = 4000) {
  if (typeof raw !== 'string') return '';
  // Remove null bytes and dangerous control characters while preserving Arabic, emojis, newlines, and tabs
  const cleaned = raw
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

export function resolveSafePath(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, String(targetPath || ''));
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolvedTarget;
}

export function isSafeHttpUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isBlockedFilename(filename) {
  const base = path.basename(String(filename || '')).toLowerCase();
  return (
    base.startsWith('.env') ||
    base.endsWith('.sqlite') ||
    base.endsWith('.sqlite-wal') ||
    base.endsWith('.sqlite-shm') ||
    base === 'creds.json'
  );
}
