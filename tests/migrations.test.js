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

test('migrations create all 18 required tables, >=20 beginner lessons per language, and complete programming tracks', () => {
  const db = createDatabase(':memory:');
  const firstRun = runMigrations(db);
  assert.equal(firstRun.length, 4);

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
  assert.ok(coursesCount >= 18);
  assert.ok(resourcesCount >= 8);

  // Requirement 4: >= 20 real beginner lessons for English, Japanese, Russian, Chinese
  for (const subject of ['english', 'japanese', 'russian', 'chinese']) {
    const cnt = db
      .prepare(
        `SELECT COUNT(*) AS cnt
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         WHERE c.category = 'language' AND c.subject = ? AND c.level = 'beginner' AND l.is_published = 1`
      )
      .get(subject).cnt;
    assert.ok(cnt >= 20, `Expected >=20 beginner lessons for ${subject}, got ${cnt}`);
  }

  // Requirement 5: ordered programming tracks + project lessons for Python, JavaScript, HTML, CSS
  for (const subject of ['python', 'javascript', 'html', 'css']) {
    const lessons = db
      .prepare(
        `SELECT l.lesson_type, l.content_ar, (SELECT COUNT(*) FROM exercises e WHERE e.lesson_id = l.id) AS ex_cnt
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         WHERE c.category = 'programming' AND c.subject = ? AND l.is_published = 1`
      )
      .all(subject);
    assert.ok(lessons.length >= 8, `Expected >=8 programming lessons for ${subject}, got ${lessons.length}`);
    assert.ok(lessons.some((l) => l.lesson_type === 'project'), `Missing project lesson for ${subject}`);
    assert.ok(lessons.every((l) => l.ex_cnt >= 1 && l.content_ar.includes('```')), `Missing code or exercises in ${subject}`);
  }

  db.close();
});

test('migrations 003 and 004 upgrade existing database non-destructively without losing user rows', () => {
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
  assert.deepEqual(applied, ['003_silana_migration_tables', '004_rich_academies_curriculum']);

  const preservedUser = db
    .prepare('SELECT display_name FROM users WHERE phone_number = ?')
    .get('966509876543');
  assert.equal(preservedUser?.display_name, 'طالب قديم');

  const cols = db.prepare(`PRAGMA table_info(ai_learning_profiles)`).all();
  assert.ok(cols.some((c) => c.name === 'memory_consent'), 'Expected memory_consent column after migration 004');

  db.close();
});
