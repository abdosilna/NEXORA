import express from 'express';
import { getRecentLogs } from '../../utils/logger.js';

export function createLogsRoutes({ repos, authMiddleware }) {
  const router = express.Router();

  router.get('/logs', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (req, res) => {
    const level = req.query.level || null;
    const errorLogs = getRecentLogs({ level, limit: 100 });
    const auditLogs = repos.admin.listAuditLogs(100);
    res.json({ errorLogs, auditLogs });
  });

  return router;
}
