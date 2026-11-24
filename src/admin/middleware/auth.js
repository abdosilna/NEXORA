import { sharedRateLimiter } from '../../security/rate-limit.js';

export const ROLE_RANK = {
  viewer: 1,
  editor: 2,
  super_admin: 3,
};

export function extractAdminToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.cookies?.nexora_admin_session || '';
}

export function createAuthMiddleware({ repos }) {
  function requireAuth(req, res, next) {
    const token = extractAdminToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const session = repos.admin.validateSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Verify CSRF protection header on cookie-authenticated mutations
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      !req.headers.authorization &&
      req.headers['x-requested-with'] !== 'NexoraAdmin'
    ) {
      return res.status(403).json({ error: 'Missing CSRF protection header' });
    }

    req.admin = {
      id: session.id,
      username: session.username,
      role: session.role,
    };
    req.adminToken = token;
    return next();
  }

  function requireRole(minRole) {
    const minRank = ROLE_RANK[minRole] || 99;
    return (req, res, next) => {
      const currentRank = ROLE_RANK[req.admin?.role] || 0;
      if (currentRank < minRank) {
        return res.status(403).json({ error: `Requires ${minRole} permission` });
      }
      return next();
    };
  }

  function rateLimitAuth(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const check = sharedRateLimiter.check(`admin-auth:${ip}`, { limit: 15, windowMs: 60_000 });
    if (!check.allowed) {
      return res.status(429).json({
        error: 'Too many authentication attempts. Please wait a minute.',
        retryAfterSeconds: Math.ceil(check.retryAfterMs / 1000),
      });
    }
    return next();
  }

  return { requireAuth, requireRole, rateLimitAuth };
}
