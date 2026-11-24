import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254',
  '0.0.0.0',
  '::1',
]);

export function isPrivateOrReservedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const normalized = ip.replace(/^::ffff:/i, '');

  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    if (a >= 224) return true;
    return false;
  }

  if (net.isIPv6(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return true;
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    if (lower.startsWith('ff')) {
      return true;
    }
    return false;
  }

  return true;
}

export async function validateSafePublicUrl(rawUrl, { resolveDns = dns.lookup } = {}) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('URL is required');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error(`Blocked unsafe hostname: ${hostname}`);
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Blocked private/reserved IP address: ${hostname}`);
    }
    return parsed;
  }

  const records = await resolveDns(hostname, { all: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`DNS resolution failed for host: ${hostname}`);
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error(`Blocked private/reserved resolved IP for ${hostname}`);
    }
  }

  return parsed;
}

export async function safePublicFetch(rawUrl, options = {}) {
  const {
    timeoutMs = 10_000,
    maxBytes = 256 * 1024,
    userAgent = 'NexoraBot-Research/1.0 (+educational-bot)',
    resolveDns = dns.lookup,
    fetchImpl = fetch,
    maxRedirects = 2,
  } = options;

  let currentUrl = rawUrl;
  let redirects = 0;

  while (true) {
    const parsed = await validateSafePublicUrl(currentUrl, { resolveDns });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/json,text/plain;q=0.9',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirects >= maxRedirects) {
          throw new Error('Too many or invalid redirects');
        }
        redirects += 1;
        currentUrl = new URL(location, parsed).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${parsed.hostname}`);
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > maxBytes) {
        throw new Error('Response exceeded maximum allowed size');
      }

      const reader = response.body?.getReader?.();
      if (!reader) {
        const text = await response.text();
        return {
          url: parsed.toString(),
          contentType: response.headers.get('content-type') || '',
          body: text.slice(0, maxBytes),
        };
      }

      const chunks = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error('Response stream exceeded maximum allowed size');
        }
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      return {
        url: parsed.toString(),
        contentType: response.headers.get('content-type') || '',
        body: buffer.toString('utf8'),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
