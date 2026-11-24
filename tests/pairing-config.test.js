import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInternationalPhone, formatPairingCode } from '../src/utils/phone.js';
import { loadConfig } from '../src/config/env.js';
import { PairingManager } from '../src/whatsapp/pairing.js';

test('validates international phone numbers accurately', () => {
  assert.equal(validateInternationalPhone('+966 50 123 4567').valid, true);
  assert.equal(validateInternationalPhone('966501234567').digits, '966501234567');
  assert.equal(validateInternationalPhone('0501234567').valid, false);
  assert.equal(validateInternationalPhone('123').valid, false);
});

test('formats 8-character pairing code cleanly', () => {
  assert.equal(formatPairingCode('ab12cd34'), 'AB12-CD34');
});

test('rejects /tmp paths for persistent database or auth dir', () => {
  assert.throws(
    () => loadConfig({ DATABASE_PATH: '/tmp/test.sqlite', WHATSAPP_AUTH_DIR: 'data/auth' }, { loadDotenv: false }),
    /must not reside in \/tmp/
  );
});

test('PairingManager requests pairing code once per session and prints only to private console', async () => {
  const consoleLines = [];
  const manager = new PairingManager({
    phoneNumber: '966501234567',
    printToConsole: (line) => consoleLines.push(line),
  });

  let callCount = 0;
  const mockSocket = {
    authState: { creds: { registered: false } },
    requestPairingCode: async (phone) => {
      callCount += 1;
      assert.equal(phone, '966501234567');
      return 'NEXR2026';
    },
  };

  const first = await manager.requestOnce(mockSocket);
  const second = await manager.requestOnce(mockSocket);

  assert.equal(first.requested, true);
  assert.equal(second.requested, false);
  assert.equal(second.reason, 'already_requested');
  assert.equal(callCount, 1);
  assert.ok(consoleLines.some((l) => l.includes('NEXR-2026')));
});

test('PairingManager resets requestedForSession on failure so retry works after cooldown', async () => {
  const manager = new PairingManager({
    phoneNumber: '966501234567',
    printToConsole: () => {},
  });

  let attempts = 0;
  const mockSocket = {
    authState: { creds: { registered: false } },
    requestPairingCode: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Network glitch');
      return 'ABCD1234';
    },
  };

  const failed = await manager.requestOnce(mockSocket);
  assert.equal(failed.requested, false);
  assert.equal(manager.requestedForSession, false);
  assert.equal(manager.inFlight, false);

  // Cooldown prevents tight retry loops immediately after failure
  const blocked = await manager.requestOnce(mockSocket);
  assert.equal(blocked.requested, false);
  assert.equal(blocked.reason, 'cooldown_active');

  // Once cooldown passes, retry succeeds cleanly
  manager.lastRequestedAt = Date.now() - 31_000;
  const retried = await manager.requestOnce(mockSocket);
  assert.equal(retried.requested, true);
  assert.equal(manager.requestedForSession, true);
  assert.equal(attempts, 2);
});

test('loadConfig supports overrides on top of base environment', () => {
  const cfg = loadConfig(
    { PORT: '3000', DATABASE_PATH: 'data/a.sqlite', WHATSAPP_AUTH_DIR: 'data/auth-a' },
    { loadDotenv: false, overrides: { PORT: '4500', BOT_NAME: 'NEXORA QA' } }
  );
  assert.equal(cfg.port, 4500);
  assert.equal(cfg.botName, 'NEXORA QA');
});
