import express from 'express';

export function createOverviewRoutes({ dashboardService, authMiddleware }) {
  const router = express.Router();

  router.get('/overview', authMiddleware.requireAuth, authMiddleware.requireRole('viewer'), (_req, res) => {
    res.json(dashboardService.getOverview());
  });

  return router;
}
