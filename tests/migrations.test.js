import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrations/runner.js';

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
];

test('migrations create all 14 required tables and are idempotent', () => {
  const db = createDatabase(':memory:');
  const firstRun = runMigrations(db);
  assert.equal(firstRun.length, 2);

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
