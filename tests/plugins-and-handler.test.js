import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { parsePrefixedCommand, NexoraMessageHandler } from '../handler.js';
import { bootstrapApplication } from '../main.js';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';
import { AiService } from '../lib/ai/index.js';
import { AudioService } from '../lib/tts/index.js';
import { TutorModule } from '../lib/bot/modules/tutor.js';
import { LanguageAcademyModule } from '../lib/bot/modules/languages.js';
import { ProgrammingAcademyModule } from '../lib/bot/modules/programming.js';
import { ResearchEngine } from '../lib/search/index.js';
import { LibraryModule } from '../lib/bot/modules/library.js';
import { SafeSupportModule } from '../lib/bot/modules/support.js';
import { BotRouter } from '../lib/bot/router.js';
import { PluginManager } from '../lib/whatsapp/plugins.js';
import { WhatsAppSender } from '../lib/whatsapp/sender.js';

async function createHandlerHarness({ adminNumber = '966509990000' } = {}) {
  const config = loadConfig(
    {
      DATABASE_PATH: ':memory:',
      AI_PROVIDER: 'disabled',
      TTS_PROVIDER: 'disabled',
      SEARCH_PROVIDER: 'disabled',
      ADMIN_NUMBER: adminNumber,
      WHATSAPP_NUMBER: '966500000001',
    },
    { loadDotenv: false }
  );
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const aiService = new AiService(config, { repos });
  const audioService = new AudioService(config);
  const researchService = new ResearchEngine(config, { aiService, repos });
  const modules = {
    tutor: new TutorModule({ aiService, repos }),
    languages: new LanguageAcademyModule({ repos, audioService }),
    programming: new ProgrammingAcademyModule({ repos, aiService }),
    research: researchService,
    audio: audioService,
    library: new LibraryModule({ repos }),
    support: new SafeSupportModule({ repos, aiService }),
  };

  const pluginManager = new PluginManager({
    pluginsDir: path.resolve('plugins'),
    repos,
  });
  await pluginManager.loadPlugins();

  const router = new BotRouter({ config, repos, modules });
  const sent = [];
  const sender = new WhatsAppSender();
  const mockSock = {
    user: { id: '966500000001:1@s.whatsapp.net' },
    sendMessage: async (jid, content, opts) => {
      const id = `BOT-${sent.length + 1}`;
      sent.push({ jid, content, opts, id });
      return { key: { id, remoteJid: jid, fromMe: true } };
    },
    groupMetadata: async () => ({
      subject: 'نادي البرمجة',
      participants: [
        { id: '966501112233@s.whatsapp.net', admin: 'admin' },
        { id: '966500000001@s.whatsapp.net', admin: null },
      ],
    }),
  };

  const handler = new NexoraMessageHandler({
    config,
    repos,
    router,
    modules,
    pluginManager,
    sender,
  });

  return { config, db, repos, pluginManager, handler, mockSock, sent, sender };
}

test('PluginManager loads and reloads all 8 Silana-style plugins', async () => {
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const pm = new PluginManager({ pluginsDir: path.resolve('plugins'), repos });

  const loaded = await pm.loadPlugins();
  assert.equal(loaded.length, 8);
  const names = loaded.map((p) => p.name).sort();
  assert.deepEqual(names, [
    'admin',
    'ai-tutor',
    'anime',
    'languages',
    'menu',
    'programming',
    'research',
    'voice',
  ]);

  const reloaded = await pm.reloadPlugins();
  assert.equal(reloaded.length, 8);
  db.close();
});

test('parsePrefixedCommand extracts prefix, command, and args cleanly', () => {
  assert.deepEqual(parsePrefixedCommand('.research JavaScript', ['.', '!', '/']), {
    isCommand: true,
    prefix: '.',
    command: 'research',
    args: 'JavaScript',
  });
  assert.deepEqual(parsePrefixedCommand('!status', ['.', '!', '/']), {
    isCommand: true,
    prefix: '!',
    command: 'status',
    args: '',
  });
  assert.equal(parsePrefixedCommand('مرحبا', ['.']).isCommand, false);
});

test('NexoraMessageHandler handles private menus, prefixed plugins, group gating, owner permissions, and loop protection', async () => {
  const { db, repos, handler, mockSock, sent } = await createHandlerHarness();

  // 1. Private first message opens Arabic main menu
  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: { id: 'M-1', remoteJid: '966501112233@s.whatsapp.net', fromMe: false },
        pushName: 'سارة',
        message: { conversation: 'مرحبا' },
      },
    ],
  });
  assert.equal(sent.length, 1);
  assert.ok(sent[0].content.text.includes('القائمة الرئيسية'));

  // 2. Private prefixed commands route to plugins and record plugin_stats
  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: { id: 'M-2', remoteJid: '966501112233@s.whatsapp.net', fromMe: false },
        pushName: 'سارة',
        message: { conversation: '.anime' },
      },
    ],
  });
  assert.equal(sent.length, 2);
  assert.ok(sent[1].content.text.includes('Dr. STONE'));

  const stats = repos.admin.listPluginStats();
  assert.ok(stats.some((s) => s.plugin_name === 'anime' && s.success_runs >= 1));

  // 3. Group casual chatter without prefix or mention is ignored
  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: {
          id: 'M-3',
          remoteJid: '120363000111222@g.us',
          participant: '966501112233@s.whatsapp.net',
          fromMe: false,
        },
        pushName: 'سارة',
        message: { conversation: 'السلام عليكم يا شباب' },
      },
    ],
  });
  assert.equal(sent.length, 2);

  // 4. Group prefixed command works cleanly
  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: {
          id: 'M-4',
          remoteJid: '120363000111222@g.us',
          participant: '966501112233@s.whatsapp.net',
          fromMe: false,
        },
        pushName: 'سارة',
        message: { conversation: '.menu' },
      },
    ],
  });
  assert.equal(sent.length, 3);
  assert.ok(sent[2].content.text.includes('القائمة الرئيسية'));

  // 5. Owner-only admin command blocks non-owner and succeeds for owner
  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: { id: 'M-5', remoteJid: '966501112233@s.whatsapp.net', fromMe: false },
        pushName: 'سارة',
        message: { conversation: '.plugins' },
      },
    ],
  });
  assert.equal(sent.length, 4);
  assert.ok(sent[3].content.text.includes('لمالك النظام فقط'));

  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: { id: 'M-6', remoteJid: '966509990000@s.whatsapp.net', fromMe: false },
        pushName: 'المشرف',
        message: { conversation: '.plugins' },
      },
    ],
  });
  assert.equal(sent.length, 5);
  assert.ok(sent[4].content.text.includes('الإضافات المحمّلة (8)'));

  // 6. Loop protection ignores duplicate message IDs, fromMe messages, and bot's own sent IDs
  await handler.handleUpsert({
    sock: mockSock,
    type: 'notify',
    messages: [
      {
        key: { id: 'M-6', remoteJid: '966509990000@s.whatsapp.net', fromMe: false },
        message: { conversation: '.plugins' },
      },
      {
        key: { id: 'M-7', remoteJid: '966501112233@s.whatsapp.net', fromMe: true },
        message: { conversation: '.menu' },
      },
      {
        key: { id: 'BOT-1', remoteJid: '966501112233@s.whatsapp.net', fromMe: false },
        message: { conversation: '.menu' },
      },
    ],
  });
  assert.equal(sent.length, 5);

  db.close();
});

test('bootstrapApplication boots Express, loads 8 plugins, serves /health, and shuts down cleanly', async () => {
  const appCtx = await bootstrapApplication({
    PORT: '3198',
    DATABASE_PATH: ':memory:',
    WHATSAPP_AUTO_CONNECT: 'false',
    AI_PROVIDER: 'disabled',
    LOG_LEVEL: 'silent',
  });

  try {
    const addr = appCtx.httpServer.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.plugins.loaded, 8);
  } finally {
    await appCtx.shutdown('TEST_DONE');
  }
});
