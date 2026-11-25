import { LANGUAGE_CURRICULUM_LESSONS } from '../curriculum/languages-data.js';
import { PROGRAMMING_COURSES_ADDON, PROGRAMMING_CURRICULUM_LESSONS } from '../curriculum/programming-data.js';

export const migration004 = {
  id: '004_rich_academies_curriculum',
  name: 'Seed complete Language & Programming Academy lessons, exercises, projects, and AI memory_consent column',
  up(db) {
    // 1. Safely ensure ai_learning_profiles.memory_consent exists on upgrades from earlier DBs
    const cols = db.prepare(`PRAGMA table_info(ai_learning_profiles)`).all();
    const hasMemoryConsent = cols.some((c) => c.name === 'memory_consent');
    if (!hasMemoryConsent) {
      db.exec(`ALTER TABLE ai_learning_profiles ADD COLUMN memory_consent INTEGER NOT NULL DEFAULT 1;`);
    }

    // 2. Ensure beginner JavaScript course exists alongside existing intermediate JS course
    const insertCourse = db.prepare(`
      INSERT OR IGNORE INTO courses (slug, category, subject, title_ar, description_ar, level, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    for (const course of PROGRAMMING_COURSES_ADDON) {
      insertCourse.run(
        course.slug,
        course.category,
        course.subject,
        course.title_ar,
        course.description_ar,
        course.level,
        course.sort_order
      );
    }

    // Put beginner JS course before intermediate JS course
    db.prepare(`UPDATE courses SET sort_order = 16 WHERE slug = 'prog-js-core' AND sort_order <= 16`).run();
    db.prepare(`UPDATE courses SET sort_order = 15 WHERE slug = 'prog-js-beginner'`).run();

    // Reorder existing 002 programming intro lessons so variables/basics come first in each track
    db.prepare(`UPDATE lessons SET sort_order = 6 WHERE slug = 'py-lesson-1-functions'`).run();
    db.prepare(`UPDATE lessons SET sort_order = 6 WHERE slug = 'html-lesson-1-semantic'`).run();
    db.prepare(`UPDATE lessons SET sort_order = 7 WHERE slug = 'css-lesson-1-grid-flex'`).run();

    // Put beginner language starter lessons from 002 nicely alongside unit lessons
    const getCourseBySlug = db.prepare('SELECT id FROM courses WHERE slug = ?');
    const insertLesson = db.prepare(`
      INSERT OR IGNORE INTO lessons (
        course_id, slug, lesson_type, title_ar, content_ar, examples_json,
        pronunciation_text, pronunciation_lang, sort_order, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const getLessonBySlug = db.prepare('SELECT id FROM lessons WHERE slug = ?');
    const insertExercise = db.prepare(`
      INSERT INTO exercises (lesson_id, question_ar, options_json, correct_answer, explanation_ar, hint_ar, difficulty)
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE lesson_id = ? AND question_ar = ?)
    `);

    const seedLessonBatch = (lessons, sortOffset = 0) => {
      for (const l of lessons) {
        const courseRow = getCourseBySlug.get(l.courseSlug);
        if (!courseRow) continue;

        insertLesson.run(
          courseRow.id,
          l.slug,
          l.lesson_type || 'lesson',
          l.title_ar,
          l.content_ar,
          JSON.stringify(Array.isArray(l.examples) ? l.examples : []),
          l.pronunciation_text || '',
          l.pronunciation_lang || 'en',
          (Number(l.sort_order) || 1) + sortOffset
        );

        const lessonRow = getLessonBySlug.get(l.slug);
        if (!lessonRow) continue;

        for (const ex of l.exercises || []) {
          insertExercise.run(
            lessonRow.id,
            ex.question_ar,
            JSON.stringify(Array.isArray(ex.options) ? ex.options : []),
            String(ex.correct_answer),
            ex.explanation_ar || '',
            ex.hint_ar || '',
            ex.difficulty || 'beginner',
            lessonRow.id,
            ex.question_ar
          );
        }
      }
    };

    // Offset language curriculum sort_order by +5 so 002 starter lessons remain at indices 1..2 in Unit 1
    seedLessonBatch(LANGUAGE_CURRICULUM_LESSONS, 5);
    seedLessonBatch(PROGRAMMING_CURRICULUM_LESSONS, 0);
  },
};
