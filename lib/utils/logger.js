import pino from 'pino';
import { redactSecrets } from '../security/sanitize.js';

const MAX_LOG_RING = 200;
const recentLogs = [];

export function recordSafeLog(level, scope, message, meta = null) {
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    scope: String(scope || 'app'),
    message: redactSecrets(String(message || '')),
    meta: meta ? redactSecrets(meta) : null,
  };
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOG_RING) {
    recentLogs.length = MAX_LOG_RING;
  }
  return entry;
}

export function getRecentLogs({ level = null, limit = 100 } = {}) {
  const filtered = level ? recentLogs.filter((l) => l.level === level) : recentLogs;
  return filtered.slice(0, Math.min(200, Math.max(1, Number(limit) || 100)));
}

export function createLogger(level = process.env.LOG_LEVEL || 'info') {
  const base = pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'apiKey',
        'AI_API_KEY',
        'SEARCH_API_KEY',
        'TTS_API_KEY',
        'APP_SECRET',
        'creds',
        'noiseKey',
        'signedIdentityKey',
      ],
      censor: '[REDACTED]',
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });

  return {
    pino: base,
    child(bindings) {
      return base.child(bindings);
    },
    info(scope, msg, meta) {
      const safeMsg = redactSecrets(msg);
      if (meta) base.info({ scope, meta: redactSecrets(meta) }, safeMsg);
      else base.info({ scope }, safeMsg);
    },
    warn(scope, msg, meta) {
      const safeMsg = redactSecrets(msg);
      recordSafeLog('warn', scope, safeMsg, meta);
      if (meta) base.warn({ scope, meta: redactSecrets(meta) }, safeMsg);
      else base.warn({ scope }, safeMsg);
    },
    error(scope, msg, err) {
      const safeMsg = redactSecrets(msg);
      const errText = err ? redactSecrets(err.stack || err.message || String(err)) : null;
      recordSafeLog('error', scope, safeMsg, errText);
      base.error({ scope, err: errText }, safeMsg);
    },
    debug(scope, msg, meta) {
      const safeMsg = redactSecrets(msg);
      if (meta) base.debug({ scope, meta: redactSecrets(meta) }, safeMsg);
      else base.debug({ scope }, safeMsg);
    },
  };
}

export const logger = createLogger();
