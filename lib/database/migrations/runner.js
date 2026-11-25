import { migration001 } from './001_initial_schema.js';
import { migration002 } from './002_seed_curriculum.js';
import { migration003 } from './003_silana_migration_tables.js';
import { migration004 } from './004_rich_academies_curriculum.js';
import { migration005 } from './005_programming_levels_and_creative.js';

const MIGRATIONS = [migration001, migration002, migration003, migration004, migration005];

export function runMigrations(dbConn, { logger = null } = {}) {
  dbConn.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const checkStmt = dbConn.prepare('SELECT id FROM schema_migrations WHERE id = ?');
  const markStmt = dbConn.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)');

  const applied = [];
  for (const migration of MIGRATIONS) {
    const existing = checkStmt.get(migration.id);
    if (existing) continue;

    dbConn.transaction(() => {
      migration.up(dbConn);
      markStmt.run(migration.id, migration.name);
    });
    applied.push(migration.id);
    logger?.info?.('database', `Applied migration ${migration.id}`);
  }

  return applied;
}
