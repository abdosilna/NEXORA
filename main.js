import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort } from 'node:worker_threads';
import { loadConfig } from './config.js';
import { createLogger } from './lib/utils/logger.js';
import { createDatabase } from './lib/database/connection.js';
import { runMigrations } from './lib/database/migrations/runner.js';
import { createRepositories } from './lib/database/repositories/index.js';
import { AiService } from './lib/ai/index.js';
import { TempMediaCleanupService } from './lib/tts/audio-cleanup.js';
import { AudioService } from './lib/tts/index.js';
import { TutorModule } from './lib/bot/modules/tutor.js';
import { LanguageAcademyModule } from './lib/bot/modules/languages.js';
import { ProgrammingAcademyModule } from './lib/bot/modules/programming.js';
import { ResearchEngine } from './lib/search/index.js';
import { CreativeStudioModule } from './lib/creative/index.js';
import { LibraryModule } from './lib/bot/modules/library.js';
import { SafeSupportModule } from './lib/bot/modules/support.js';
import { BotRouter } from './lib/bot/router.js';
import { WhatsAppSender } from './lib/whatsapp/sender.js';
import { PluginManager } from './lib/whatsapp/plugins.js';
import { IncomingMessageHandler } from './lib/whatsapp/message-handler.js';
import { WhatsAppConnectionManager } from './lib/whatsapp/connection.js';
import { HealthService } from './lib/utils/health.js';
import { createAdminServer } from './lib/admin/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

export async function bootstrapApplication(envOverrides = {}) {
  const config = loadConfig(undefined, { overrides: envOverrides });
  const logger = createLogger(config.logLevel);

  for (const warning of config.warnings) {
    logger.warn('config', warning);
  }

  const db = createDatabase(config.database.path, { logger });
  runMigrations(db, { logger });
  const repos = createRepositories(db);

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
  const researchService = new ResearchEngine(config, { aiService, repos, logger });
  const creativeService = new CreativeStudioModule(config, { repos, cleanupService, logger });

  const modules = {
    tutor: new TutorModule({ aiService, repos, researchService }),
    languages: new LanguageAcademyModule({ repos, audioService }),
    programming: new ProgrammingAcademyModule({ repos, aiService }),
    research: researchService,
    audio: audioService,
    creative: creativeService,
    library: new LibraryModule({ repos }),
    support: new SafeSupportModule({ repos, aiService }),
  };

  const pluginManager = new PluginManager({
    pluginsDir: path.join(ROOT_DIR, 'plugins'),
    logger,
    repos,
  });
  await pluginManager.loadPlugins();

  const router = new BotRouter({ config, repos, modules });
  const sender = new WhatsAppSender({
    logger,
    interactiveMenus: config.whatsapp.interactiveMenus,
  });
  const messageHandler = new IncomingMessageHandler({
    config,
    repos,
    router,
    modules,
    pluginManager,
    sender,
    logger,
  });

  const whatsappManager = new WhatsAppConnectionManager({
    config,
    messageHandler,
    pluginManager,
    logger,
  });

  const healthService = new HealthService({
    config,
    db,
    aiService,
    whatsappManager,
    audioService,
    researchService,
    creativeService,
    pluginManager,
  });

  messageHandler.delegate.setRuntimeRefs({ healthService, whatsappManager });

  const app = createAdminServer({
    config,
    repos,
    healthService,
    logger,
    publicDir: path.join(ROOT_DIR, 'public/admin'),
  });

  const httpServer = await new Promise((resolve, reject) => {
    const srv = app.listen(config.port, '0.0.0.0', () => {
      logger.info('server', `${config.botName} listening on http://0.0.0.0:${config.port}`);
      resolve(srv);
    });
    srv.once('error', reject);
  });

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
      httpServer.closeAllConnections?.();
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
    pluginManager,
    router,
    messageHandler,
    whatsappManager,
    healthService,
    app,
    httpServer,
    reloadHandler: (opts) => whatsappManager.reloadHandler(opts),
    shutdown,
  };
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;
const isWorkerRuntime = !isMainThread && Boolean(parentPort);

if (isDirectExecution || isWorkerRuntime) {
  bootstrapApplication()
    .then((appCtx) => {
      if (isWorkerRuntime) {
        parentPort.postMessage({ type: 'ready', port: appCtx.config.port });
        parentPort.on('message', (msg) => {
          if (msg === 'shutdown' || msg?.type === 'shutdown') {
            appCtx
              .shutdown('WORKER_SHUTDOWN')
              .then(() => {
                parentPort.postMessage({ type: 'stopped' });
                process.exit(0);
              })
              .catch(() => process.exit(1));
          } else if (msg === 'reload' || msg?.type === 'reload') {
            void appCtx.reloadHandler({ restartConn: false, reloadPlugins: true });
          }
        });
      }

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
