import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrations/runner.js';
import { createRepositories } from '../src/database/repositories/index.js';
import { AiService } from '../src/ai/index.js';
import { AudioService } from '../src/modules/audio/index.js';
import { ResearchModule } from '../src/modules/research/index.js';
import { LanguageAcademyModule } from '../src/modules/languages/index.js';
import { ProgrammingAcademyModule } from '../src/modules/programming/index.js';
import { HealthService } from '../src/services/health.js';
import { createAdminServer } from '../src/admin/server.js';
import { resolveSenderJid } from '../src/whatsapp/message-handler.js';

test('health endpoint, encoded secret path guards, and route parameter validation work end-to-end', async () => {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled' }, { loadDotenv: false });
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const aiService = new AiService(config, { repos });
  const audioService = new AudioService(config);
  const researchService = new ResearchModule(config, { aiService, repos });
  const healthService = new HealthService({ config, db, aiService, whatsappManager: null, audioService, researchService });

  const app = createAdminServer({ config, repos, healthService });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.database.status, 'healthy');

    // Encoded .env and WhatsApp auth key paths must return 403
    for (const blockedPath of ['/%2eenv', '/data/auth/creds.json', '/pre-key-1.json', '/session-123.json']) {
      const res = await fetch(`${baseUrl}${blockedPath}`);
      assert.equal(res.status, 403, `Expected 403 for ${blockedPath}`);
    }

    // Bootstrap super_admin and verify route validation rejects bad IDs / bad course updates
    const bootRes = await fetch(`${baseUrl}/api/admin/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'qa_admin', password: 'StrongPassword!123' }),
    });
    const { token } = await bootRes.json();

    const badUserReq = await fetch(`${baseUrl}/api/admin/users/abc/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(badUserReq.status, 400);

    const badCourseUpdate = await fetch(`${baseUrl}/api/admin/courses/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ level: 'invalid-level' }),
    });
    assert.equal(badCourseUpdate.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});

test('opening lessons marks in_progress cleanly and deleteUser enforces strict per-user isolation', () => {
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled' }, { loadDotenv: false });
  const aiService = new AiService(config, { repos });
  const audioService = new AudioService(config);

  const langMod = new LanguageAcademyModule({ repos, audioService });
  const progMod = new ProgrammingAcademyModule({ repos, aiService });

  const u1 = repos.users.registerOrTouch({ whatsappJid: '966501111111@s.whatsapp.net', displayName: 'أحمد' }).user;
  const u2 = repos.users.registerOrTouch({ whatsappJid: '966502222222@s.whatsapp.net', displayName: 'ليلى' }).user;

  const langCourse = repos.curriculum.listCourses({ category: 'language', subject: 'japanese' })[0];
  const langLesson = repos.curriculum.listLessonsByCourse(langCourse.id)[0];
  langMod._renderLesson(u1, langLesson.id);

  const progCourse = repos.curriculum.listCourses({ category: 'programming', subject: 'python' })[0];
  const progLesson = repos.curriculum.listLessonsByCourse(progCourse.id)[0];
  progMod._renderLesson(u1, progLesson.id);
  progMod._renderLesson(u2, progLesson.id);

  assert.equal(repos.progress.getUserSummary(u1.id).inProgressLessons, 2);
  assert.equal(repos.progress.getUserSummary(u2.id).inProgressLessons, 1);

  // Deleting user 1 must not impact user 2 data
  repos.users.deleteUser(u1.id);
  assert.equal(repos.progress.getUserSummary(u2.id).inProgressLessons, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id = ?').get(u1.id).cnt, 0);

  db.close();
});

test('resolveSenderJid normalizes phone JIDs and resolves @lid via lidMapping fallback', async () => {
  const mapped = await resolveSenderJid(
    { signalRepository: { lidMapping: { getPNForLID: async () => '966505556666:2@s.whatsapp.net' } } },
    { remoteJid: '123456789@lid' }
  );
  assert.equal(mapped, '966505556666@s.whatsapp.net');
});
