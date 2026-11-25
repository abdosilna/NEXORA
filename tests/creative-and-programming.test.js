import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';
import { CreativeStudioModule } from '../lib/creative/index.js';
import { WhatsAppSender } from '../lib/whatsapp/sender.js';
import { ProgrammingAcademyModule } from '../lib/bot/modules/programming.js';
import { AiService } from '../lib/ai/index.js';

test('CreativeStudioModule enforces disabled state, prompt safety, MIME whitelist, 5MB limit, and WhatsApp image delivery + cleanup', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-creative-'));
  try {
    // 1. Disabled state reports honest setup guidance
    const disabledCfg = loadConfig({ DATABASE_PATH: ':memory:', IMAGE_PROVIDER: 'disabled' }, { loadDotenv: false });
    const disabledStudio = new CreativeStudioModule(disabledCfg);
    const disabledRes = await disabledStudio.generateAndFormat({ user: { id: 1 }, prompt: 'Solar system diagram' });
    assert.ok(disabledRes.text.includes('IMAGE_PROVIDER'));
    assert.equal(disabledRes.image, undefined);

    // 2. Unsafe prompt is blocked before calling provider
    const enabledCfg = loadConfig(
      {
        DATABASE_PATH: ':memory:',
        IMAGE_PROVIDER: 'gemini',
        IMAGE_API_KEY: 'test-key-only',
        IMAGE_MAX_BYTES: String(5 * 1024 * 1024),
        TEMP_MEDIA_DIR: tmpDir,
      },
      { loadDotenv: false }
    );
    const unsafeStudio = new CreativeStudioModule(enabledCfg, {
      aiClient: {
        models: {
          generateContent: async () => {
            throw new Error('Should not be called for unsafe prompts');
          },
        },
      },
    });
    const unsafeRes = await unsafeStudio.generateImage({ userId: 2, prompt: 'nsfw weapon gore' });
    assert.equal(unsafeRes.ok, false);
    assert.equal(unsafeRes.unsafe, true);

    // 3. Invalid MIME type is rejected
    const badMimeStudio = new CreativeStudioModule(enabledCfg, {
      aiClient: {
        models: {
          generateContent: async () => ({
            candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('abc').toString('base64'), mimeType: 'image/svg+xml' } }] } }],
          }),
        },
      },
    });
    const badMimeRes = await badMimeStudio.generateImage({ userId: 3, prompt: 'Clean educational chart' });
    assert.equal(badMimeRes.ok, false);
    assert.ok(badMimeRes.reason.includes('image/svg+xml'));

    // 4. Oversized buffer (>5MB) is rejected
    const oversizedStudio = new CreativeStudioModule(enabledCfg, {
      aiClient: {
        models: {
          generateContent: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        data: Buffer.alloc(5 * 1024 * 1024 + 100, 1).toString('base64'),
                        mimeType: 'image/png',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        },
      },
    });
    const oversizedRes = await oversizedStudio.generateImage({ userId: 4, prompt: 'Detailed programming diagram' });
    assert.equal(oversizedRes.ok, false);
    assert.ok(oversizedRes.reason.includes('5MB'));

    // 5. Valid PNG generation writes temp file, sends via WhatsAppSender, and cleans up temp file
    const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
    const validStudio = new CreativeStudioModule(enabledCfg, {
      aiClient: {
        models: {
          generateContent: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: pngBytes.toString('base64'), mimeType: 'image/png' } }],
                },
              },
            ],
          }),
        },
      },
    });

    const formatted = await validStudio.generateAndFormat({
      user: { id: 5 },
      prompt: 'Clean dark midnight API infographic',
      aspectRatio: '16:9',
    });
    assert.equal(formatted.image?.ok, true);
    const createdPath = formatted.image.filePath;
    await fs.access(createdPath);

    const sentMedia = [];
    const mockSock = {
      user: { id: '966500000001:1@s.whatsapp.net' },
      sendMessage: async (jid, content) => {
        sentMedia.push({ jid, content });
        return { key: { id: 'IMG-1' } };
      },
      relayMessage: async () => {},
    };

    const sender = new WhatsAppSender({ interactiveMenus: true });
    await sender.sendResponse(mockSock, '966551234567@s.whatsapp.net', formatted);

    assert.equal(sentMedia.length, 1);
    assert.ok(Buffer.isBuffer(sentMedia[0].content.image));
    assert.equal(sentMedia[0].content.mimetype, 'image/png');
    assert.ok(sentMedia[0].content.caption.includes('16:9'));

    // Temp file must be deleted by cleanup
    await assert.rejects(() => fs.access(createdPath));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('ProgrammingAcademyModule supports level filtering (intermediate/advanced) and capstone project quiz across Node.js and Python', async () => {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled' }, { loadDotenv: false });
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const aiService = new AiService(config, { repos });
  const prog = new ProgrammingAcademyModule({ repos, aiService });
  const { user } = repos.users.registerOrTouch({ whatsappJid: '966558881122@s.whatsapp.net', displayName: 'نواف' });

  // Open Node.js track -> filter to advanced -> open capstone project -> run quiz
  let state = { menu: 'programming', data: { step: 'select_track' } };
  await prog.handleInput({ user, selectedId: 'prog:track:nodejs', state });

  state = repos.users.getState(user.id);
  const advRes = await prog.handleInput({ user, selectedId: 'prog:level:advanced', state });
  assert.ok(advRes.text.includes('Node.js'));
  assert.ok(advRes.text.includes('[مشروع]'));

  state = repos.users.getState(user.id);
  const projectIdx = state.data.lessons.findIndex((l) => l.lesson_type === 'project');
  assert.ok(projectIdx >= 0, 'Expected capstone project lesson in Node.js advanced track');

  const projectView = await prog.handleInput({ user, text: String(projectIdx + 1), state });
  assert.ok(projectView.text.includes('مشروع تطبيقي صغير'));

  state = repos.users.getState(user.id);
  const quizStart = await prog.handleInput({ user, selectedId: 'prog:quiz', state });
  assert.ok(quizStart.text.includes('السؤال 1 من'));

  // Python intermediate level filter check
  await prog.openHome(user);
  state = repos.users.getState(user.id);
  await prog.handleInput({ user, selectedId: 'prog:track:python', state });
  state = repos.users.getState(user.id);
  const pyInter = await prog.handleInput({ user, selectedId: 'prog:level:intermediate', state });
  assert.ok(pyInter.text.includes('Python'));
  assert.ok(pyInter.text.includes('متوسط'));

  db.close();
});
