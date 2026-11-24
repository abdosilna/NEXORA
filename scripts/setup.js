import fs from 'node:fs/promises';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrations/runner.js';
import { createRepositories } from '../src/database/repositories/index.js';
import { createLogger } from '../src/utils/logger.js';

async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger(config.logLevel);

  await fs.mkdir(config.whatsapp.authDir, { recursive: true });
  await fs.mkdir(config.tts.tempMediaDir, { recursive: true });

  const db = createDatabase(config.database.path, { logger });
  const applied = runMigrations(db, { logger });
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
    console.log('Initial administrator created from environment variables.');
  }

  console.log(`Database ready at: ${config.database.path}`);
  console.log(`Migrations applied: ${applied.length ? applied.join(', ') : 'already up to date'}`);
  console.log(`Courses available: ${repos.curriculum.listCourses({ includeUnpublished: true }).length}`);
  console.log(`Library resources available: ${repos.resources.list({ includeUnpublished: true, limit: 200 }).length}`);
  db.close();
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
