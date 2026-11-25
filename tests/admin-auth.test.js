import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';
import { AiService } from '../lib/ai/index.js';
import { AudioService } from '../lib/tts/index.js';
import { ResearchModule } from '../lib/search/index.js';
import { CreativeStudioModule } from '../lib/creative/index.js';
import { HealthService } from '../lib/utils/health.js';
import { createAdminServer } from '../lib/admin/server.js';

test('admin bootstrap locks after first admin, enforces login, RBAC, privacy, project lessons, and blocks .env exposure', async () => {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled' }, { loadDotenv: false });
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const aiService = new AiService(config, { repos });
  const audioService = new AudioService(config);
  const researchService = new ResearchModule(config, { aiService, repos });
  const creativeService = new CreativeStudioModule(config, { repos });
  const healthService = new HealthService({ config, db, aiService, whatsappManager: null, audioService, researchService, creativeService });

  const app = createAdminServer({ config, repos, healthService });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Unauthenticated overview must fail with 401
    const unauth = await fetch(`${baseUrl}/api/admin/overview`);
    assert.equal(unauth.status, 401);

    // 2. First-run bootstrap succeeds once
    const boot1 = await fetch(`${baseUrl}/api/admin/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'chief_admin', password: 'StrongPassword!123' }),
    });
    assert.equal(boot1.status, 201);
    const bootData = await boot1.json();
    assert.ok(bootData.token);

    // 3. Second bootstrap attempt is blocked (no public registration)
    const boot2 = await fetch(`${baseUrl}/api/admin/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'attacker', password: 'StrongPassword!123' }),
    });
    assert.equal(boot2.status, 403);

    // 4. Create viewer admin using super_admin token, then verify viewer cannot update settings
    const createViewer = await fetch(`${baseUrl}/api/admin/auth/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bootData.token}` },
      body: JSON.stringify({ username: 'viewer_one', password: 'ViewerPass!123', role: 'viewer' }),
    });
    assert.equal(createViewer.status, 201);

    const viewerLogin = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'viewer_one', password: 'ViewerPass!123' }),
    });
    const viewerToken = (await viewerLogin.json()).token;

    const forbiddenUpdate = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ maintenance_mode: true }),
    });
    assert.equal(forbiddenUpdate.status, 403);

    // 5. Protected paths like /.env or /data/auth are blocked
    const envBlock = await fetch(`${baseUrl}/.env`);
    assert.equal(envBlock.status, 403);

    // 6. Curriculum accepts 'project' lesson_type
    const courses = repos.curriculum.listCourses({ category: 'programming', subject: 'python' });
    const createProject = await fetch(`${baseUrl}/api/admin/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bootData.token}` },
      body: JSON.stringify({
        course_id: courses[0].id,
        lesson_type: 'project',
        title_ar: 'مشروع اختباري',
        content_ar: 'وصف المشروع التجريبي مع كود:\n```python\nprint("hi")\n```',
      }),
    });
    assert.equal(createProject.status, 201);
    const createdPayload = await createProject.json();
    assert.equal(createdPayload.lesson.lesson_type, 'project');

    // 7. Learner private conversations are never exposed in admin user summary
    const { user } = repos.users.registerOrTouch({ whatsappJid: '966559998877@s.whatsapp.net', displayName: 'سلمى' });
    repos.conversations.append({ userId: user.id, role: 'user', messageText: 'سر دراسي خاص جداً لا يظهر للمشرفين', module: 'support' });

    const userSummaryRes = await fetch(`${baseUrl}/api/admin/users/${user.id}/summary`, {
      headers: { Authorization: `Bearer ${bootData.token}` },
    });
    assert.equal(userSummaryRes.status, 200);
    const summaryText = await userSummaryRes.text();
    assert.ok(!summaryText.includes('conversations'));
    assert.ok(!summaryText.includes('سر دراسي خاص جداً'));
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});
