import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../lib/database/connection.js';
import { migration001 } from '../lib/database/migrations/001_initial_schema.js';
import { migration002 } from '../lib/database/migrations/002_seed_curriculum.js';
import { runMigrations } from '../lib/database/migrations/runner.js';

const EXPECTED_TABLES = [
  'users',
  'user_preferences',
  'user_progress',
  'courses',
  'lessons',
  'exercises',
  'quiz_attempts',
  'learning_events',
  'conversations',
  'resources',
  'admin_users',
  'admin_sessions',
  'admin_audit_logs',
  'application_settings',
  'user_mistakes',
  'ai_learning_profiles',
  'research_history',
  'plugin_stats',
];

test('migrations create all 18 required tables and are idempotent', () => {
  const db = createDatabase(':memory:');
  const firstRun = runMigrations(db);
  assert.equal(firstRun.length, 3);

  const secondRun = runMigrations(db);
  assert.equal(secondRun.length, 0);

  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map((r) => r.name);

  for (const tbl of EXPECTED_TABLES) {
    assert.ok(tables.includes(tbl), `Missing table: ${tbl}`);
  }

  const coursesCount = db.prepare('SELECT COUNT(*) AS cnt FROM courses').get().cnt;
  const resourcesCount = db.prepare('SELECT COUNT(*) AS cnt FROM resources').get().cnt;
  assert.ok(coursesCount >= 12);
  assert.ok(resourcesCount >= 8);

  db.close();
});

test('migration 003 upgrades existing database non-destructively without losing user rows', () => {
  const db = createDatabase(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.transaction(() => {
    migration001.up(db);
    db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(migration001.id, migration001.name);
    migration002.up(db);
    db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(migration002.id, migration002.name);
  });

  db.prepare(`INSERT INTO users (whatsapp_jid, phone_number, display_name) VALUES (?, ?, ?)`).run(
    '966509876543@s.whatsapp.net',
    '966509876543',
    'طالب قديم'
  );

  const applied = runMigrations(db);
  assert.deepEqual(applied, ['003_silana_migration_tables']);

  const preservedUser = db
    .prepare('SELECT display_name FROM users WHERE phone_number = ?')
    .get('966509876543');
  assert.equal(preservedUser?.display_name, 'طالب قديم');

  db.close();
});
