import express from 'express';

export function createUsersRoutes({ repos, authMiddleware }) {
  const router = express.Router();

  router.get('/users', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (req, res) => {
    const search = String(req.query.search || '').trim();
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const users = repos.users.listUsers({ search, limit, offset });
    const total = repos.users.countUsers();
    res.json({ users, total });
  });

  router.get('/users/:id/summary', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user id' });
    const user = repos.users.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const summary = repos.progress.getUserSummary(userId);
    const preferences = repos.users.getPreferences(userId);
    return res.json({
      user: {
        id: user.id,
        phone_number: user.phone_number,
        display_name: user.display_name,
        preferred_language: user.preferred_language,
        learning_level: user.learning_level,
        total_points: user.total_points,
        joined_at: user.joined_at,
        last_active_at: user.last_active_at,
      },
      preferences,
      summary,
    });
  });

  router.delete('/users/:id', authMiddleware.requireAuth, authMiddleware.requireRole('super_admin'), (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user id' });
    const deleted = repos.users.deleteUser(userId);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    repos.admin.logAudit({
      adminUserId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'user_deleted',
      targetType: 'user',
      targetId: userId,
    });
    return res.json({ ok: true });
  });

  return router;
}
