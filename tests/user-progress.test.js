import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../lib/database/connection.js';
import { runMigrations } from '../lib/database/migrations/runner.js';
import { createRepositories } from '../lib/database/repositories/index.js';

test('auto-registers user, persists progress/SRS, exports data, and deletes cleanly', () => {
  const db = createDatabase(':memory:');
  runMigrations(db);
  const repos = createRepositories(db);

  const first = repos.users.registerOrTouch({
    whatsappJid: '966501112233@s.whatsapp.net',
    displayName: 'سارة',
  });
  assert.equal(first.isNew, true);
  assert.equal(first.user.phone_number, '966501112233');

  const second = repos.users.registerOrTouch({
    whatsappJid: '966501112233@s.whatsapp.net',
    displayName: 'سارة أحمد',
  });
  assert.equal(second.isNew, false);
  assert.equal(second.user.display_name, 'سارة أحمد');

  const courses = repos.curriculum.listCourses({ category: 'language', subject: 'japanese' });
  const lessons = repos.curriculum.listLessonsByCourse(courses[0].id);
  const prog = repos.progress.recordLessonProgress({
    userId: first.user.id,
    courseId: courses[0].id,
    lessonId: lessons[0].id,
    masteryScore: 92,
    completed: true,
  });
  assert.equal(prog.status, 'completed');
  assert.equal(prog.srs_interval_days, 1);

  const summary = repos.progress.getUserSummary(first.user.id);
  assert.equal(summary.completedLessons, 1);

  const exported = repos.users.exportUserData(first.user.id);
  assert.equal(exported.profile.display_name, 'سارة أحمد');
  assert.equal(exported.progress.length, 1);

  const deleted = repos.users.deleteUser(first.user.id);
  assert.equal(deleted, true);
  assert.equal(repos.users.findById(first.user.id), null);

  db.close();
});
