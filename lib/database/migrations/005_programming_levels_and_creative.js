import {
  PROGRAMMING_ADVANCED_COURSES,
  PROGRAMMING_ADVANCED_LESSONS,
} from '../curriculum/programming-advanced-data.js';

export const migration005 = {
  id: '005_programming_levels_and_creative',
  name: 'Complete structured beginner-to-advanced programming paths across Python, HTML, CSS, JavaScript, and Node.js',
  up(db) {
    const insertCourse = db.prepare(`
      INSERT OR IGNORE INTO courses (slug, category, subject, title_ar, description_ar, level, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    for (const course of PROGRAMMING_ADVANCED_COURSES) {
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

    const getCourseBySlug = db.prepare('SELECT id FROM courses WHERE slug = ?');
    const insertLesson = db.prepare(`
      INSERT OR IGNORE INTO lessons (
        course_id, slug, lesson_type, title_ar, content_ar, examples_json,
        pronunciation_text, pronunciation_lang, sort_order, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, '', 'en', ?, 1)
    `);
    const getLessonBySlug = db.prepare('SELECT id FROM lessons WHERE slug = ?');
    const insertExercise = db.prepare(`
      INSERT INTO exercises (lesson_id, question_ar, options_json, correct_answer, explanation_ar, hint_ar, difficulty)
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE lesson_id = ? AND question_ar = ?)
    `);

    for (const l of PROGRAMMING_ADVANCED_LESSONS) {
      const courseRow = getCourseBySlug.get(l.courseSlug);
      if (!courseRow) continue;

      insertLesson.run(
        courseRow.id,
        l.slug,
        l.lesson_type || 'lesson',
        l.title_ar,
        l.content_ar,
        JSON.stringify(Array.isArray(l.examples) ? l.examples : []),
        Number(l.sort_order) || 1
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
          ex.difficulty || 'intermediate',
          lessonRow.id,
          ex.question_ar
        );
      }
    }
  },
};
