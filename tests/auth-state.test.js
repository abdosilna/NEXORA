import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { useAtomicMultiFileAuthState } from '../src/whatsapp/auth-state.js';

test('auth state persists creds and BufferJSON keys across restarts without temp leftovers', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-auth-test-'));
  try {
    const firstSession = await useAtomicMultiFileAuthState(tmpDir);
    firstSession.state.creds.registered = true;
    firstSession.state.creds.me = { id: '966501234567:1@s.whatsapp.net', name: 'NexoraBot' };
    await firstSession.saveCreds();

    const samplePub = new Uint8Array([1, 2, 3, 4, 250, 255]);
    const samplePriv = Buffer.from('secret-key-material');
    await firstSession.state.keys.set({
      'pre-key': {
        '10': { public: samplePub, private: samplePriv },
      },
      session: {
        '966501234567.0': { chain: Buffer.from('abc') },
      },
    });

    // Reload from disk to verify persistence across process restarts
    const reloaded = await useAtomicMultiFileAuthState(tmpDir);
    assert.equal(reloaded.state.creds.registered, true);
    assert.equal(reloaded.state.creds.me.id, '966501234567:1@s.whatsapp.net');

    const keys = await reloaded.state.keys.get('pre-key', ['10']);
    assert.ok(keys['10']);
    assert.deepEqual(Array.from(keys['10'].public), [1, 2, 3, 4, 250, 255]);
    assert.equal(Buffer.from(keys['10'].private).toString('utf8'), 'secret-key-material');

    // Verify no orphan .tmp files remain
    const files = await fs.readdir(tmpDir);
    assert.equal(files.some((f) => f.includes('.tmp-')), false);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('auth state handles concurrent writes cleanly without corrupting JSON', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-auth-conc-'));
  try {
    const { state, saveCreds } = await useAtomicMultiFileAuthState(tmpDir);

    await Promise.all([
      ...Array.from({ length: 12 }, (_, idx) => {
        state.creds.accountSyncCounter = idx + 1;
        return saveCreds();
      }),
      ...Array.from({ length: 12 }, (_, idx) =>
        state.keys.set({
          'sender-key': {
            shared: { iteration: idx + 1, data: Buffer.from(`v-${idx}`) },
          },
        })
      ),
    ]);

    const reloaded = await useAtomicMultiFileAuthState(tmpDir);
    assert.equal(reloaded.state.creds.accountSyncCounter, 12);
    const loadedKeys = await reloaded.state.keys.get('sender-key', ['shared']);
    assert.equal(loadedKeys.shared.iteration, 12);

    const files = await fs.readdir(tmpDir);
    assert.equal(files.some((f) => f.includes('.tmp-')), false);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
