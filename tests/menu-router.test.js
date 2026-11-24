import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.js';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';
import { AiService } from '../lib/ai/index.js';
import { AudioService } from '../lib/tts/index.js';
import { TutorModule } from '../lib/bot/modules/tutor.js';
import { LanguageAcademyModule } from '../lib/bot/modules/languages.js';
import { ProgrammingAcademyModule } from '../lib/bot/modules/programming.js';
import { ResearchModule } from '../lib/search/index.js';
import { LibraryModule } from '../lib/bot/modules/library.js';
import { SafeSupportModule } from '../lib/bot/modules/support.js';
import { BotRouter } from '../lib/bot/router.js';

function createTestHarness() {
  const config = loadConfig({ DATABASE_PATH: ':memory:', AI_PROVIDER: 'disabled', TTS_PROVIDER: 'disabled' }, { loadDotenv: false });
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);
  const aiService = new AiService(config, { repos });
  const audioService = new AudioService(config);
  const modules = {
    tutor: new TutorModule({ aiService, repos }),
    languages: new LanguageAcademyModule({ repos, audioService }),
    programming: new ProgrammingAcademyModule({ repos, aiService }),
    research: new ResearchModule(config, { aiService, repos }),
    audio: audioService,
    library: new LibraryModule({ repos }),
    support: new SafeSupportModule({ repos, aiService }),
  };
  const router = new BotRouter({ config, repos, modules });
  const { user } = repos.users.registerOrTouch({ whatsappJid: '966550001122@s.whatsapp.net', displayName: 'أحمد' });
  return { db, repos, router, user };
}

test('menu navigation works across academies, home, back, cancel, help, and safe support', async () => {
  const { db, router, user } = createTestHarness();

  const home = await router.route({ user, text: 'رئيسية' });
  assert.ok(home.text.includes('القائمة الرئيسية'));

  // Language Academy -> Japanese -> Beginner -> Lesson -> Quiz
  const langMenu = await router.route({ user, text: '2' });
  assert.ok(langMenu.text.includes('اليابانية'));

  const jpLevels = await router.route({ user, text: '1' });
  assert.ok(jpLevels.text.includes('مبتدئ'));

  const jpLessons = await router.route({ user, text: '1' });
  assert.ok(jpLessons.text.includes('التحيات'));

  const lessonView = await router.route({ user, text: '1' });
  assert.ok(lessonView.text.includes('Konnichiwa'));

  // Back & Cancel & Help
  const backRes = await router.route({ user, text: 'رجوع' });
  assert.ok(backRes.text.includes('أكاديمية اللغات'));

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
