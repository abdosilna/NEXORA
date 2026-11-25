import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';
import { AiService } from '../lib/ai/index.js';
import { BaseAiProvider } from '../lib/ai/providers/base.js';
import { AudioService } from '../lib/tts/index.js';
import { TutorModule } from '../lib/bot/modules/tutor.js';
import { LanguageAcademyModule } from '../lib/bot/modules/languages.js';
import { ProgrammingAcademyModule } from '../lib/bot/modules/programming.js';
import { ResearchModule } from '../lib/search/index.js';
import { LibraryModule } from '../lib/bot/modules/library.js';
import { SafeSupportModule } from '../lib/bot/modules/support.js';
import { CreativeStudioModule } from '../lib/creative/index.js';
import { BotRouter } from '../lib/bot/router.js';

function createTestHarness({ aiProvider = null } = {}) {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled', TTS_PROVIDER: 'disabled' }, { loadDotenv: false });
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const aiService = new AiService(config, { repos, customProvider: aiProvider });
  const audioService = new AudioService(config);
  const researchService = new ResearchModule(config, { aiService, repos });
  const modules = {
    tutor: new TutorModule({ aiService, repos, researchService }),
    languages: new LanguageAcademyModule({ repos, audioService }),
    programming: new ProgrammingAcademyModule({ repos, aiService }),
    research: researchService,
    audio: audioService,
    creative: new CreativeStudioModule(config, { repos }),
    library: new LibraryModule({ repos }),
    support: new SafeSupportModule({ repos, aiService }),
  };
  const router = new BotRouter({ config, repos, modules });
  const { user } = repos.users.registerOrTouch({ whatsappJid: '966550001122@s.whatsapp.net', displayName: 'أحمد' });
  return { db, repos, router, user };
}

test('menu navigation works across multi-unit language academy, multi-level back, validation, cancel, help, and safe support', async () => {
  const { db, router, user } = createTestHarness();

  const home = await router.route({ user, text: 'رئيسية' });
  assert.ok(home.text.includes('القائمة الرئيسية'));
  assert.ok(home.interactiveList?.sections?.length >= 3);

  // Invalid bare number at home triggers helpful validation notice
  const badChoice = await router.route({ user, text: '99' });
  assert.ok(badChoice.text.includes('غير موجود'));

  // Language Academy -> Japanese -> Beginner -> Unit 1 -> Lesson 1 -> Multi-step Back
  const langMenu = await router.route({ user, text: '2' });
  assert.ok(langMenu.text.includes('اليابانية'));

  const jpLevels = await router.route({ user, text: '1' });
  assert.ok(jpLevels.text.includes('مبتدئ'));

  const jpUnits = await router.route({ user, text: '1' });
  assert.ok(jpUnits.text.includes('الوحدة 1: الهيراغانا والتحيات'));

  const jpLessons = await router.route({ user, text: '1' });
  assert.ok(jpLessons.text.includes('التحيات'));

  const lessonView = await router.route({ user, text: '1' });
  assert.ok(lessonView.text.includes('Konnichiwa'));

  // Multi-level Back: in_lesson -> select_lesson -> select_unit -> select_level -> openHome -> Main Menu
  const backToLessons = await router.route({ user, text: 'رجوع' });
  assert.ok(backToLessons.text.includes('الوحدة 1: الهيراغانا والتحيات'));

  const backToUnits = await router.route({ user, text: 'رجوع' });
  assert.ok(backToUnits.text.includes('الوحدات التعليمية'));

  const backToLevels = await router.route({ user, text: 'رجوع' });
  assert.ok(backToLevels.text.includes('اختر المستوى الدراسي'));

  const backToLangs = await router.route({ user, text: 'رجوع' });
  assert.ok(backToLangs.text.includes('أكاديمية اللغات'));

  const helpRes = await router.route({ user, text: 'مساعدة' });
  assert.ok(helpRes.text.includes('دليل استخدام'));

  const cancelRes = await router.route({ user, text: 'إلغاء' });
  assert.ok(cancelRes.text.includes('تم إلغاء'));

  // Knowledge & Anime library
  const animeRes = await router.route({ user, selectedId: 'menu:anime', text: '' });
  assert.ok(animeRes.text.includes('Dr. STONE'));

  // Safe Support guardrails
  await router.route({ user, selectedId: 'menu:support', text: '' });
  const medicalGuard = await router.route({ user, text: 'أريد تشخيص طبي وجرعة دواء' });
  assert.ok(medicalGuard.text.includes('لا أقدّم تشخيصاً طبياً'));

  db.close();
});

test('home menu smartly routes general questions to conversational AI and explicit search to ResearchEngine', async () => {
  const mockAi = new (class extends BaseAiProvider {
    constructor() {
      super({ name: 'mock', model: 'gemini-4-hydrogen' });
    }
    isConfigured() {
      return true;
    }
    async generate({ messages }) {
      const q = messages[messages.length - 1].content;
      return { text: `إجابة عربية واضحة حول: ${q}`, provider: 'mock', model: 'gemini-4-hydrogen' };
    }
  })();

  const { db, repos, router, user } = createTestHarness({ aiProvider: mockAi });
  await router.route({ user, text: 'رئيسية' });

  const qRes = await router.route({ user, text: 'ما هي البرمجة؟' });
  assert.ok(qRes.text.includes('إجابة عربية واضحة حول: ما هي البرمجة؟'));
  assert.equal(repos.users.getState(user.id).menu, 'tutor');

  db.close();
});

test('9-section interactive menu callbacks route Creative Studio, Library pagination, Help/Settings, and Node.js advanced tracks', async () => {
  const { db, router, user } = createTestHarness();

  const home = await router.route({ user, text: 'رئيسية' });
  const totalRows = home.interactiveList.sections.reduce((acc, s) => acc + s.rows.length, 0);
  assert.equal(totalRows, 9);

  // Creative Studio via number 6
  const creativeHome = await router.route({ user, text: '6' });
  assert.ok(creativeHome.text.includes('الاستوديو الإبداعي'));
  assert.ok(creativeHome.interactiveList?.sections?.length >= 2);

  // Library Hub via callback -> Knowledge -> Pagination
  const libHub = await router.route({ user, selectedId: 'menu:library_hub', text: '' });
  assert.ok(libHub.text.includes('مكتبة الأنمي والترفيه المرخّص والمعرفة'));

  const animePage1 = await router.route({ user, selectedId: 'library:anime', text: '' });
  assert.ok(animePage1.text.includes('صفحة 1'));

  // Help & Settings Hub via callback -> Settings
  const helpSettings = await router.route({ user, selectedId: 'menu:help_settings', text: '' });
  assert.ok(helpSettings.text.includes('المساعدة والإعدادات'));
  const settings = await router.route({ user, selectedId: 'settings:open', text: '' });
  assert.ok(settings.text.includes('الإعدادات والخصوصية'));

  // Node.js Programming track -> Advanced level filter callback
  await router.route({ user, selectedId: 'prog:track:nodejs', text: '' });
  const nodeAdv = await router.route({ user, selectedId: 'prog:level:advanced', text: '' });
  assert.ok(nodeAdv.text.includes('Node.js'));
  assert.ok(nodeAdv.text.includes('متقدم'));

  db.close();
});
