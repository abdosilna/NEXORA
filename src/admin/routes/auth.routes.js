import express from 'express';
import { z } from 'zod';
import { extractAdminToken } from '../middleware/auth.js';

const CredentialsSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(128),
});

const CreateAdminSchema = CredentialsSchema.extend({
  role: z.enum(['super_admin', 'editor', 'viewer']).default('editor'),
});

function setSessionCookie(req, res, token, ttlHours = 24) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `nexora_admin_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${ttlHours * 3600}`,
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    parts.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req, res) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    'nexora_admin_session=',
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    parts.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function createAuthRoutes({ repos, authMiddleware }) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    repos.admin.pruneExpiredSessions();
    const needsSetup = repos.admin.countAdmins() === 0;
    const token = extractAdminToken(req);
    const session = token ? repos.admin.validateSession(token) : null;
    res.json({
      needsSetup,
      authenticated: Boolean(session),
      admin: session ? { id: session.id, username: session.username, role: session.role } : null,
    });
  });

  // One-time first-run administrator setup (permanently locked once 1 admin exists)
  router.post('/bootstrap', authMiddleware.rateLimitAuth, (req, res) => {
    if (repos.admin.countAdmins() > 0) {
      return res.status(403).json({ error: 'Public registration is disabled. Admin already exists.' });
    }
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Username (3+ chars) and password (8+ chars) are required.' });
    }

    try {
      const admin = repos.admin.bootstrapFirstAdmin(parsed.data);
      repos.admin.pruneExpiredSessions();
    const session = repos.admin.createSession(admin.id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      repos.admin.logAudit({
        adminUserId: admin.id,
        adminUsername: admin.username,
        action: 'admin_bootstrap',
        targetType: 'admin_user',
        targetId: admin.id,
      });
      setSessionCookie(req, res, session.token, session.ttlHours);
      return res.status(201).json({ admin, token: session.token });
    } catch (err) {
      return res.status(409).json({ error: err.message });
    }
  });

  router.post('/login', authMiddleware.rateLimitAuth, (req, res) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid username and password are required.' });
    }

    const admin = repos.admin.authenticate(parsed.data.username, parsed.data.password);
    if (!admin) {
      repos.admin.logAudit({
        adminUsername: parsed.data.username,
        action: 'admin_login_failed',
        targetType: 'admin_session',
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const session = repos.admin.createSession(admin.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    repos.admin.logAudit({
      adminUserId: admin.id,
      adminUsername: admin.username,
      action: 'admin_login',
      targetType: 'admin_session',
    });

    setSessionCookie(req, res, session.token, session.ttlHours);
    return res.json({ admin, token: session.token });
  });

  router.post('/logout', (req, res) => {
    const token = extractAdminToken(req);
    if (token) {
      repos.admin.revokeSession(token);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  router.get('/admins', authMiddleware.requireAuth, authMiddleware.requireRole('super_admin'), (req, res) => {
    res.json({ admins: repos.admin.listAdmins() });
  });

  router.post('/admins', authMiddleware.requireAuth, authMiddleware.requireRole('super_admin'), (req, res) => {
    const parsed = CreateAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid administrator payload.' });
    }
    try {
      const created = repos.admin.createAdmin(parsed.data);
      repos.admin.logAudit({
        adminUserId: req.admin.id,
        adminUsername: req.admin.username,
        action: 'admin_created',
        targetType: 'admin_user',
        targetId: created.id,
        details: { role: created.role },
      });
      return res.status(201).json({ admin: created });
    } catch (err) {
      return res.status(409).json({ error: err.message });
    }
  });

  return router;
}
