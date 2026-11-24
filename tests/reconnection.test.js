import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';
import {
  WhatsAppConnectionManager,
  calculateReconnectDelay,
  classifyDisconnectStatus,
} from '../lib/whatsapp/connection.js';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';

test('classifies Baileys disconnect reasons accurately', () => {
  assert.equal(classifyDisconnectStatus(401).action, 'stop_logged_out');
  assert.equal(classifyDisconnectStatus(500).action, 'stop_bad_session');
  assert.equal(classifyDisconnectStatus(411).action, 'stop_multidevice_mismatch');
  assert.equal(classifyDisconnectStatus(515).action, 'reconnect_fast');
  assert.equal(classifyDisconnectStatus(408).action, 'reconnect_backoff');
  assert.equal(classifyDisconnectStatus(503).action, 'reconnect_backoff');
  assert.equal(classifyDisconnectStatus(428).action, 'reconnect_backoff');
});

test('reconnect delay uses bounded exponential backoff', () => {
  const d0 = calculateReconnectDelay(0, { baseMs: 2000, maxMs: 60_000 });
  const d5 = calculateReconnectDelay(5, { baseMs: 2000, maxMs: 60_000 });
  assert.ok(d0 >= 2000 && d0 <= 2500);
  assert.ok(d5 <= 60_000);
});

test('WhatsAppConnectionManager stops reconnect loops on 401 loggedOut and preserves user DB data', async () => {
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const reg = repos.users.registerOrTouch({
    whatsappJid: '966509998877@s.whatsapp.net',
    displayName: 'متعلم نشط',
  });

  const config = loadConfig(
    { DATABASE_PATH: ':memory:', WHATSAPP_NUMBER: '966501234567', WHATSAPP_AUTH_DIR: 'data/test-auth' },
    { loadDotenv: false }
  );
  const manager = new WhatsAppConnectionManager({
    config,
    messageHandler: { handleUpsert: async () => {} },
    logger: null,
  });

  const mockSock = {
    authState: { creds: { registered: true } },
    ev: { removeAllListeners: () => {} },
    ws: { close: () => {} },
  };
  manager.activeSocket = mockSock;

  await manager.handleConnectionUpdate(mockSock, {
    connection: 'close',
    lastDisconnect: { error: { output: { statusCode: 401 } } },
  });

  const status = manager.getStatus();
  assert.equal(status.state, 'logged_out');
  assert.equal(status.needsRepairing, true);
  assert.equal(manager.reconnectTimer, null);
  assert.ok(status.lastError.includes('User database data is preserved'));
  assert.equal(repos.users.findById(reg.user.id)?.display_name, 'متعلم نشط');

  db.close();
});

test('WhatsAppConnectionManager prevents simultaneous duplicate sockets and requests pairing only on qr', async () => {
  const tmpAuth = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-conn-test-'));
  try {
    const config = loadConfig(
      {
        DATABASE_PATH: ':memory:',
        WHATSAPP_NUMBER: '966501234567',
        WHATSAPP_AUTH_DIR: 'data/test-auth',
        WHATSAPP_AUTO_CONNECT: 'true',
      },
      { loadDotenv: false }
    );
    config.whatsapp.authDir = tmpAuth;

    let createdSockets = 0;
    let pairingCalls = 0;
    const manager = new WhatsAppConnectionManager({
      config,
      messageHandler: { handleUpsert: async () => {} },
      logger: null,
      socketFactory: () => {
        createdSockets += 1;
        return {
          authState: { creds: { registered: false } },
          ev: { on: () => {}, removeAllListeners: () => {} },
          ws: { close: () => {} },
          requestPairingCode: async () => {
            pairingCalls += 1;
            return '12345678';
          },
        };
      },
    });
    manager.pairing.printToConsole = () => {};

    const [s1, s2] = await Promise.all([manager.start(), manager.start()]);
    assert.equal(s1, s2);
    assert.equal(createdSockets, 1);

    // Connecting event before QR must NOT fire premature requestPairingCode
    await manager.handleConnectionUpdate(s1, { connection: 'connecting' });
    assert.equal(pairingCalls, 0);

    // QR signal indicates socket completed Noise handshake and pair-device IQ exchange
    await manager.handleConnectionUpdate(s1, { qr: 'dummy-qr-payload' });
    assert.equal(pairingCalls, 1);

    await manager.shutdown();
  } finally {
    await fs.rm(tmpAuth, { recursive: true, force: true });
  }
});
