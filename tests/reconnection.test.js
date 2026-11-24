import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/env.js';
import {
  WhatsAppConnectionManager,
  calculateReconnectDelay,
  classifyDisconnectStatus,
} from '../src/whatsapp/connection.js';

test('classifies Baileys disconnect reasons accurately', () => {
  assert.equal(classifyDisconnectStatus(401).action, 'stop_logged_out');
  assert.equal(classifyDisconnectStatus(500).action, 'stop_bad_session');
  assert.equal(classifyDisconnectStatus(515).action, 'reconnect_fast');
  assert.equal(classifyDisconnectStatus(428).action, 'reconnect_backoff');
});

test('reconnect delay uses bounded exponential backoff', () => {
  const d0 = calculateReconnectDelay(0, { baseMs: 2000, maxMs: 60_000 });
  const d5 = calculateReconnectDelay(5, { baseMs: 2000, maxMs: 60_000 });
  assert.ok(d0 >= 2000 && d0 <= 2500);
  assert.ok(d5 <= 60_000);
});

test('WhatsAppConnectionManager stops reconnect loops on 401 loggedOut and prevents duplicate sockets', async () => {
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
});
