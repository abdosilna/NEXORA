import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config/env.js';
import { createLogger } from './utils/logger.js';
import { createDatabase } from './database/connection.js';
import { runMigrations } from './database/migrations/runner.js';
import { createRepositories } from './database/repositories/index.js';
import { AiService } from './ai/index.js';
import { TempMediaCleanupService } from './services/audio-cleanup.js';
import { AudioService } from './modules/audio/index.js';
import { TutorModule } from './modules/tutor/index.js';
import { LanguageAcademyModule } from './modules/languages/index.js';
import { ProgrammingAcademyModule } from './modules/programming/index.js';
import { ResearchModule } from './modules/research/index.js';
import { LibraryModule } from './modules/library/index.js';
import { SafeSupportModule } from './modules/support/index.js';
import { BotRouter } from './bot/router.js';
import { WhatsAppSender } from './whatsapp/sender.js';
import { IncomingMessageHandler } from './whatsapp/message-handler.js';
import { WhatsAppConnectionManager } from './whatsapp/connection.js';
import { HealthService } from './services/health.js';
import { createAdminServer } from './admin/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export async function bootstrapApplication(envOverrides = {}) {
  const config = loadConfig({ ...process.env, ...envOverrides });
  const logger = createLogger(config.logLevel);

  for (const warning of config.warnings) {
    logger.warn('config', warning);
  }

  const db = createDatabase(config.database.path, { logger });
  runMigrations(db, { logger });
  const repos = createRepositories(db);

  // Optional env-driven bootstrap for first admin if configured and none exists yet
  if (
    repos.admin.countAdmins() === 0 &&
    config.security.bootstrapUsername &&
    config.security.bootstrapPassword
  ) {
    repos.admin.bootstrapFirstAdmin({
      username: config.security.bootstrapUsername,
      password: config.security.bootstrapPassword,
    });
    logger.info('admin', 'Bootstrapped initial administrator from environment variables');
  }

  const cleanupService = new TempMediaCleanupService(config.tts.tempMediaDir, { logger });
  await cleanupService.ensureDir();
  cleanupService.start();

  const aiService = new AiService(config, { repos, logger });
  const audioService = new AudioService(config, { cleanupService, logger });
  const researchService = new ResearchModule(config, { aiService, repos, logger });

  const modules = {
    tutor: new TutorModule({ aiService, repos }),
    languages: new LanguageAcademyModule({ repos, audioService }),
    programming: new ProgrammingAcademyModule({ repos, aiService }),
    research: researchService,
    audio: audioService,
    library: new LibraryModule({ repos }),
    support: new SafeSupportModule({ repos, aiService }),
  };

  const router = new BotRouter({ config, repos, modules });
  const sender = new WhatsAppSender({ logger });
  const messageHandler = new IncomingMessageHandler({ repos, router, sender, logger });
  const whatsappManager = new WhatsAppConnectionManager({ config, messageHandler, logger });

  const healthService = new HealthService({
    config,
    db,
    aiService,
    whatsappManager,
    audioService,
    researchService,
  });

  const app = createAdminServer({
    config,
    repos,
    healthService,
    logger,
    publicDir: path.join(ROOT_DIR, 'public/admin'),
  });

  const httpServer = await new Promise((resolve) => {
    const srv = app.listen(config.port, '0.0.0.0', () => {
      logger.info('server', `${config.botName} listening on http://0.0.0.0:${config.port}`);
      resolve(srv);
    });
  });

  // Start WhatsApp socket non-blocking so health & admin server remain responsive immediately
  void whatsappManager.start().catch((err) => {
    logger.error('whatsapp', 'Initial WhatsApp connection failed', err);
  });

  let shuttingDown = false;
  async function shutdown(signal = 'SIGTERM') {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('runtime', `Graceful shutdown initiated (${signal})`);
    cleanupService.stop();
    await whatsappManager.shutdown();
    await new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
    db.close();
    logger.info('runtime', 'Shutdown complete');
  }

  return {
    config,
    db,
    repos,
    aiService,
    modules,
    router,
    whatsappManager,
    healthService,
    app,
    httpServer,
    shutdown,
  };
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  bootstrapApplication()
    .then((appCtx) => {
      const onSignal = (sig) => {
        appCtx
          .shutdown(sig)
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      };
      process.on('SIGINT', () => onSignal('SIGINT'));
      process.on('SIGTERM', () => onSignal('SIGTERM'));
    })
    .catch((err) => {
      console.error('Fatal startup error:', err.message);
      process.exit(1);
    });
}
