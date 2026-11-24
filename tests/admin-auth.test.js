import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrations/runner.js';
import { createRepositories } from '../src/database/repositories/index.js';
import { AiService } from '../src/ai/index.js';
import { AudioService } from '../src/modules/audio/index.js';
import { ResearchModule } from '../src/modules/research/index.js';
import { HealthService } from '../src/services/health.js';
import { createAdminServer } from '../src/admin/server.js';

test('admin bootstrap locks after first admin, enforces login, RBAC, and blocks .env exposure', async () => {
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
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});
