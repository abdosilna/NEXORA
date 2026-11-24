import express from 'express';
import { z } from 'zod';
import { isSafeHttpUrl } from '../../security/sanitize.js';

const ResourceSchema = z.object({
  kind: z.enum(['knowledge', 'anime']),
  title: z.string().trim().min(2).max(160),
  title_ar: z.string().trim().max(160).optional().default(''),
  category: z.string().trim().min(2).max(80),
  genre: z.string().trim().max(80).optional().default(''),
  description_ar: z.string().trim().min(4).max(600),
  legal_url: z.string().trim().url().refine((u) => isSafeHttpUrl(u), 'URL must be http or https'),
  source_label: z.string().trim().max(100).optional().default('Authorized Source'),
  is_authorized: z.boolean().default(true),
  is_published: z.boolean().default(true),
});

export function createResourcesRoutes({ repos, authMiddleware }) {
  const router = express.Router();

  router.get('/resources', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (req, res) => {
    const kind = req.query.kind || null;
    const query = String(req.query.query || '');
    const resources = repos.resources.list({ kind, query, includeUnpublished: true, limit: 150 });
    res.json({ resources });
  });

  router.post('/resources', authMiddleware.requireAuth, authMiddleware.requireRole('editor'), (req, res) => {
    const parsed = ResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid resource or unsafe URL. Only legal http/https links are permitted.' });
    }
    const created = repos.resources.create(parsed.data);
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'resource_created',
      targetType: 'resource',
      targetId: created.id,
      details: { title: created.title, kind: created.kind },
    });
    res.status(201).json({ resource: created });
  });

  router.delete('/resources/:id', authMiddleware.requireAuth, authMiddleware.requireRole('editor'), (req, res) => {
    const id = Number(req.params.id);
    const ok = repos.resources.delete(id);
    if (!ok) return res.status(404).json({ error: 'Resource not found' });
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'resource_deleted',
      targetType: 'resource',
      targetId: id,
    });
    res.json({ ok: true });
  });

  return router;
}
