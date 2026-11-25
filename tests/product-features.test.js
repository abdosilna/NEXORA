import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';
import { AiService } from '../lib/ai/index.js';
import { BaseAiProvider } from '../lib/ai/providers/base.js';
import { AudioService } from '../lib/tts/index.js';
import { LanguageAcademyModule } from '../lib/bot/modules/languages.js';
import { ProgrammingAcademyModule } from '../lib/bot/modules/programming.js';
import { TutorModule } from '../lib/bot/modules/tutor.js';
import { ResearchEngine } from '../lib/search/index.js';
import { WhatsAppSender } from '../lib/whatsapp/sender.js';
import { extractIncomingMessageContent } from '../lib/whatsapp/message-handler.js';
import { splitWhatsAppMessage } from '../lib/utils/text.js';

function createMocks(aiConfigured = false) {
  const config = loadConfig(
    { DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled', TTS_PROVIDER: 'disabled', SEARCH_PROVIDER: 'multi' },
    { loadDotenv: false }
  );
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const customProvider = aiConfigured
    ? new (class extends BaseAiProvider {
        constructor() {
          super({ name: 'mock-gemini', model: 'gemini-4-hydrogen' });
        }
        isConfigured() {
          return true;
        }
        async generate({ messages }) {
          const last = messages[messages.length - 1]?.content || '';
          return { text: `تحليل وتلخيص: ${last.slice(0, 60)}`, provider: 'mock-gemini', model: 'gemini-4-hydrogen' };
        }
      })()
    : null;
  const aiService = new AiService(config, { repos, customProvider });
  const audioService = new AudioService(config);
  const { user } = repos.users.registerOrTouch({ whatsappJid: '966551234567@s.whatsapp.net', displayName: 'ليلى' });
  return { config, db, repos, aiService, audioService, user };
}

test('WhatsAppSender uses native relayMessage for interactiveList and falls back to numbered text on failure', async () => {
  const sender = new WhatsAppSender({ interactiveMenus: true });
  const relayed = [];
  const plainSent = [];

  const interactiveSock = {
    user: { id: '966500000001:1@s.whatsapp.net' },
    relayMessage: async (jid, msg, opts) => {
      relayed.push({ jid, msg, opts });
    },
    sendMessage: async (jid, content) => {
      plainSent.push({ jid, content });
      return { key: { id: 'PLAIN-1' } };
    },
  };

  await sender.sendResponse(interactiveSock, '966551234567@s.whatsapp.net', {
    text: 'القائمة الرئيسية',
    interactiveList: {
      title: 'NEXORA BOT',
      buttonText: 'فتح القائمة',
      sections: [{ title: 'التعليم', rows: [{ title: 'اللغات', rowId: 'menu:languages', description: 'دروس' }] }],
    },
  });

  assert.equal(relayed.length, 1);
  assert.equal(plainSent.length, 0);

  // Fallback to numbered text when client rejects native interactive relay
  const fallbackSock = {
    user: { id: '966500000001:1@s.whatsapp.net' },
    relayMessage: async () => {
      throw new Error('Client unsupported');
    },
    sendMessage: async (jid, content) => {
      plainSent.push({ jid, content });
      return { key: { id: 'FALLBACK-1' } };
    },
  };

  await sender.sendResponse(fallbackSock, '966551234567@s.whatsapp.net', {
    text: '1️⃣ المعلم الذكي\n2️⃣ اللغات',
    interactiveList: {
      title: 'NEXORA BOT',
      buttonText: 'فتح القائمة',
      sections: [{ title: 'التعليم', rows: [{ title: 'اللغات', rowId: 'menu:languages', description: 'دروس' }] }],
    },
  });

  assert.equal(plainSent.length, 1);
  assert.ok(plainSent[0].content.text.includes('1️⃣ المعلم الذكي'));
});

test('extractIncomingMessageContent decodes nativeFlowResponseMessage and splitWhatsAppMessage keeps code fences valid', () => {
  const decoded = extractIncomingMessageContent({
    message: {
      interactiveResponseMessage: {
        body: { text: 'أكاديمية اللغات' },
        nativeFlowResponseMessage: {
          name: 'single_select',
          paramsJson: JSON.stringify({ id: 'menu:languages' }),
        },
      },
    },
  });
  assert.equal(decoded.selectedId, 'menu:languages');

  const longLesson = `مقدمة تعليمية واضحة\n\n\`\`\`python\n${'x = 1\n'.repeat(25)}\`\`\`\n\nخاتمة الدرس`;
  const chunks = splitWhatsAppMessage(longLesson, 140);
  assert.ok(chunks.length >= 2);
  for (const ch of chunks) {
    const fenceCount = (ch.match(/```/g) || []).length;
    assert.equal(fenceCount % 2, 0, `Unclosed code fence found in chunk:\n${ch}`);
  }
});

test('ResearchEngine aggregates multiple sources (DuckDuckGo + MDN + curated) and warns on missing paid search keys', async () => {
  const { config, db, repos, aiService, user } = createMocks(true);

  const mockFetch = async (url) => {
    const u = String(url);
    if (u.includes('html.duckduckgo.com')) {
      return {
        ok: true,
        text: async () =>
          `<div class="result"><a class="result__a" href="https://nodejs.org/en/docs">Node.js Official Docs</a><a class="result__snippet">Runtime documentation for JavaScript</a></div>`,
      };
    }
    if (u.includes('api.duckduckgo.com')) {
      return { ok: true, json: async () => ({ AbstractText: '', Heading: '', AbstractURL: '', RelatedTopics: [] }) };
    }
    if (u.includes('developer.mozilla.org')) {
      return {
        ok: true,
        json: async () => ({
          documents: [{ title: 'JavaScript Reference', mdn_url: '/en-US/docs/Web/JavaScript', summary: 'Official MDN JavaScript guide' }],
        }),
      };
    }
    if (u.includes('wikipedia.org')) {
      return { ok: true, json: async () => ({ query: { search: [] } }) };
    }
    return { ok: false, status: 404 };
  };

  const research = new ResearchEngine(config, { aiService, repos, fetchImpl: mockFetch });
  const multiRes = await research.handleInput({ user, text: 'بحث JavaScript', forceWebSearch: true });
  assert.ok(multiRes.text.includes('https://nodejs.org/en/docs'));
  assert.ok(multiRes.text.includes('https://developer.mozilla.org/en-US/docs/Web/JavaScript'));

  // Missing API key warning for serper without simulating search results
  const serperCfg = loadConfig({ DATABASE_PATH: ':memory:', SEARCH_PROVIDER: 'serper', SEARCH_API_KEY: '' }, { loadDotenv: false });
  const serperResearch = new ResearchEngine(serperCfg, { aiService, repos, fetchImpl: mockFetch });
  const missingKeyRes = await serperResearch.handleInput({ user, text: 'بحث Python', forceWebSearch: true });
  assert.ok(missingKeyRes.text.includes('SEARCH_API_KEY'));

  // Direct knowledge fast path when AI is ready and web search wasn't explicitly requested
  const directRes = await research.handleInput({ user, text: 'ما هي عاصمة اليابان؟' });
  assert.ok(directRes.text.includes('إجابة معرفية مباشرة'));

  db.close();
});

test('Programming & Language Academies run multi-question quizzes, track mistakes, and let users review & resolve them', async () => {
  const { db, repos, aiService, audioService, user } = createMocks(false);
  const langMod = new LanguageAcademyModule({ repos, audioService });
  const progMod = new ProgrammingAcademyModule({ repos, aiService });

  // Programming: open Python track, open first lesson, start 2-question quiz, answer wrong Q1 then right Q2
  let state = { menu: 'programming', data: { step: 'select_track' } };
  await progMod.handleInput({ user, text: '1', state }); // Python lessons
  state = repos.users.getState(user.id);
  const pyLessonView = await progMod.handleInput({ user, text: '1', state });
  assert.ok(pyLessonView.text.includes('اختبار الدرس'));

  state = repos.users.getState(user.id);
  const q1 = await progMod.handleInput({ user, text: '1', state });
  assert.ok(q1.text.includes('السؤال 1 من'));

  // Deliberate wrong answer ('3') on Q1 records mistake & advances to Q2
  state = repos.users.getState(user.id);
  const q1Feedback = await progMod.handleInput({ user, text: '3', state });
  assert.ok(q1Feedback.text.includes('غير صحيح'));
  assert.ok(q1Feedback.text.includes('السؤال 2 من'));

  const openMistakes = repos.progress.listOpenMistakes(user.id, 10).filter((m) => m.module === 'programming');
  assert.equal(openMistakes.length, 1);

  // Answer Q2 correctly & finish quiz
  state = repos.users.getState(user.id);
  const q2Feedback = await progMod.handleInput({ user, text: '1', state });
  assert.ok(q2Feedback.text.includes('النتيجة النهائية'));

  // Debug mode offline returns honest unavailable message rather than faking AI fix
  progMod.openHome(user);
  state = repos.users.getState(user.id);
  await progMod.handleInput({ user, text: '6', state });
  state = repos.users.getState(user.id);
  const dbgRes = await progMod.handleInput({ user, text: 'eval("1+1")', state });
  assert.ok(dbgRes.text.includes('الفحص الساكن'));
  assert.ok(dbgRes.text.includes('غير متاح'));

  // Language academy mistake review check
  langMod.openHome(user);
  state = repos.users.getState(user.id);
  const emptyReview = await langMod.handleInput({ user, text: '6', state });
  assert.ok(emptyReview.text.includes('نظيف'));

  db.close();
});

test('TutorModule enforces memory_consent and performs adaptive level upgrades from quiz performance', async () => {
  const { db, repos, aiService, user } = createMocks(false);
  const tutor = new TutorModule({ aiService, repos });

  // Toggle memory_consent off
  await tutor.openHome(user);
  let state = repos.users.getState(user.id);
  const toggleOff = await tutor.handleInput({ user, text: '5', state });
  assert.ok(toggleOff.text.includes('إيقاف حفظ الذاكرة'));

  const revisionWhileOff = await tutor.handleInput({ user, text: '3', state: { menu: 'tutor', data: { mode: 'chat' } } });
  assert.ok(revisionWhileOff.text.includes('حفظ الذاكرة التعليمية متوقف'));

  // Re-enable consent
  await tutor.handleInput({ user, text: '5', state: { menu: 'tutor', data: { mode: 'chat' } } });

  // Simulate 4 prior correct quiz attempts, then pass a real Tutor quiz to trigger adaptive upgrade -> intermediate
  for (let i = 0; i < 4; i += 1) {
    repos.progress.recordQuizAttempt({
      userId: user.id,
      topic: 'أساسيات البرمجة',
      userAnswer: '1',
      isCorrect: true,
      scoreAwarded: 15,
    });
  }

  const quizPrompt = await tutor.handleInput({ user, text: '2', state: { menu: 'tutor', data: { mode: 'chat' } } });
  assert.ok(quizPrompt.text.includes('اختبار من المنهج'));
  state = repos.users.getState(user.id);
  const correctIdx = state.data.activeQuiz.correctIndex;
  const freshUser = repos.users.findById(user.id);
  const graded = await tutor.handleInput({ user: freshUser, text: correctIdx, state });
  assert.ok(graded.text.includes('ترقية تكيفية'));
  assert.equal(repos.users.findById(user.id).learning_level, 'intermediate');

  db.close();
});
