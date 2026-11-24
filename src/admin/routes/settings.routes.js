import express from 'express';
import { z } from 'zod';
import { getPublicConfigSummary } from '../../config/env.js';

const SettingsUpdateSchema = z.object({
  maintenance_mode: z.boolean().optional(),
  welcome_banner_ar: z.string().trim().min(2).max(300).optional(),
  safe_mode_strict: z.boolean().optional(),
  max_daily_ai_requests: z.coerce.number().int().min(1).max(500).optional(),
  voice_enabled_global: z.boolean().optional(),
  ai_provider_override: z.enum(['gemini', 'openai', 'anthropic', 'disabled']).nullable().optional(),
  ai_model_override: z.string().trim().max(100).nullable().optional(),
});

export function createSettingsRoutes({ config, repos, authMiddleware, healthService }) {
  const router = express.Router();

  router.get('/settings', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (_req, res) => {
    res.json({
      settings: repos.admin.getAllSettings(),
      environment: getPublicConfigSummary(config),
      health: healthService.getSnapshot(),
    });
  });

  router.put('/settings', authMiddleware.requireAuth, authMiddleware.requireRole('super_admin'), (req, res) => {
    const parsed = SettingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid settings payload' });
    }
    const entries = Object.entries(parsed.data).filter(([, val]) => val !== undefined);
    for (const [key, val] of entries) {
      repos.admin.setSetting(key, val);
    }

    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'settings_updated',
      targetType: 'application_settings',
      details: { keys: entries.map(([k]) => k) },
    });

    res.json({ settings: repos.admin.getAllSettings() });
  });

  return router;
}
