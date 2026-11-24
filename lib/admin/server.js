import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { createAuthMiddleware } from './middleware/auth.js';
import { DashboardService } from './services/dashboard.service.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createOverviewRoutes } from './routes/overview.routes.js';
import { createUsersRoutes } from './routes/users.routes.js';
import { createCurriculumRoutes } from './routes/curriculum.routes.js';
import { createResourcesRoutes } from './routes/resources.routes.js';
import { createSettingsRoutes } from './routes/settings.routes.js';
import { createLogsRoutes } from './routes/logs.routes.js';

export function createAdminServer({ config, repos, healthService, logger, publicDir }) {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'self'", 'https://*.google.com', 'https://aistudio.google.com', 'https://*.run.app'],
        },
      },
      frameguard: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    const snap = healthService.getSnapshot();
    res.status(snap.ok ? 200 : 503).json(snap);
  });

  app.use((req, res, next) => {
    let decoded = req.path;
    try {
      decoded = decodeURIComponent(req.path);
    } catch {
      return res.status(400).json({ error: 'Malformed request path' });
    }
    const p = decoded.toLowerCase();
    if (
      p.includes('.env') ||
      p.includes('/data/') ||
      p === '/data' ||
      p.includes('.sqlite') ||
      p.includes('creds.json') ||
      p.includes('pre-key') ||
      p.includes('session-') ||
      p.includes('sender-key') ||
      p.includes('app-state-sync')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    return next();
  });

  const authMiddleware = createAuthMiddleware({ repos });
  const dashboardService = new DashboardService({ repos, healthService });

  app.use('/api/admin/auth', createAuthRoutes({ repos, authMiddleware }));
  app.use('/api/admin', createOverviewRoutes({ dashboardService, authMiddleware }));
  app.use('/api/admin', createUsersRoutes({ repos, authMiddleware }));
  app.use('/api/admin', createCurriculumRoutes({ repos, authMiddleware }));
  app.use('/api/admin', createResourcesRoutes({ repos, authMiddleware }));
  app.use('/api/admin', createSettingsRoutes({ config, repos, authMiddleware, healthService }));
  app.use('/api/admin', createLogsRoutes({ repos, authMiddleware }));

  const resolvedPublicAdmin = path.resolve(publicDir || path.join(process.cwd(), 'public/admin'));
  app.use('/admin', express.static(resolvedPublicAdmin));
  app.get('/admin/{*splat}', (_req, res) => {
    res.sendFile(path.join(resolvedPublicAdmin, 'index.html'));
  });

  app.get('/', (_req, res) => {
    res.redirect('/admin');
  });

  app.use((err, _req, res, _next) => {
    logger?.error?.('http', 'Unhandled Express error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
