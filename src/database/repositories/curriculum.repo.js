function safeParseArray(str) {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class CurriculumRepository {
  constructor(db) {
    this.db = db;
  }

  listCourses({ category = null, subject = null, level = null, includeUnpublished = false } = {}) {
    const conditions = [];
    const params = [];
    if (!includeUnpublished) conditions.push('is_published = 1');
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (subject) {
      conditions.push('subject = ?');
      params.push(subject);
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT * FROM courses ${where} ORDER BY sort_order ASC, id ASC`)
      .all(...params);
  }

  getCourseById(id) {
    return this.db.prepare('SELECT * FROM courses WHERE id = ?').get(id) || null;
  }

  createCourse({ slug, category, subject, title_ar, description_ar, level = 'beginner', sort_order = 0, is_published = 1 }) {
    const cleanSlug =
      slug ||
      `${category}-${subject}-${level}-${Date.now().toString(36)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const info = this.db
      .prepare(
        `INSERT INTO courses (slug, category, subject, title_ar, description_ar, level, sort_order, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(cleanSlug, category, subject, title_ar, description_ar, level, Number(sort_order) || 0, is_published ? 1 : 0);
    return this.getCourseById(Number(info.lastInsertRowid));
  }

  updateCourse(id, patch) {
    const existing = this.getCourseById(id);
    if (!existing) return null;
    this.db
      .prepare(
        `UPDATE courses
         SET title_ar = ?, description_ar = ?, level = ?, category = ?, subject = ?, sort_order = ?, is_published = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        patch.title_ar ?? existing.title_ar,
        patch.description_ar ?? existing.description_ar,
        patch.level ?? existing.level,
        patch.category ?? existing.category,
        patch.subject ?? existing.subject,
        patch.sort_order !== undefined ? Number(patch.sort_order) : existing.sort_order,
        patch.is_published !== undefined ? (patch.is_published ? 1 : 0) : existing.is_published,
        id
      );
    return this.getCourseById(id);
  }

  deleteCourse(id) {
    const info = this.db.prepare('DELETE FROM courses WHERE id = ?').run(id);
    return info.changes > 0;
  }

  listLessonsByCourse(courseId, { includeUnpublished = false } = {}) {
    const sql = includeUnpublished
      ? 'SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
      : 'SELECT * FROM lessons WHERE course_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC';
    return this.db.prepare(sql).all(courseId).map((l) => this._hydrateLesson(l));
  }

  listAllLessons() {
    return this.db
      .prepare(
        `SELECT l.*, c.title_ar AS course_title, c.category, c.subject, c.level
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         ORDER BY c.sort_order ASC, l.sort_order ASC, l.id ASC`
      )
      .all()
      .map((l) => this._hydrateLesson(l));
  }

  getLessonById(id) {
    const row = this.db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    return row ? this._hydrateLesson(row) : null;
  }

  createLesson({
    course_id,
    slug,
    lesson_type = 'lesson',
    title_ar,
    content_ar,
    examples = [],
    pronunciation_text = '',
    pronunciation_lang = 'en',
    sort_order = 0,
    is_published = 1,
  }) {
    const cleanSlug = slug || `lesson-${course_id}-${Date.now().toString(36)}`;
    const info = this.db
      .prepare(
        `INSERT INTO lessons (course_id, slug, lesson_type, title_ar, content_ar, examples_json, pronunciation_text, pronunciation_lang, sort_order, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(course_id),
        cleanSlug,
        lesson_type,
        title_ar,
        content_ar,
        JSON.stringify(Array.isArray(examples) ? examples : []),
        pronunciation_text,
        pronunciation_lang,
        Number(sort_order) || 0,
        is_published ? 1 : 0
      );
    return this.getLessonById(Number(info.lastInsertRowid));
  }

  updateLesson(id, patch) {
    const existing = this.getLessonById(id);
    if (!existing) return null;
    this.db
      .prepare(
        `UPDATE lessons
         SET title_ar = ?, content_ar = ?, lesson_type = ?, examples_json = ?, pronunciation_text = ?, pronunciation_lang = ?, sort_order = ?, is_published = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        patch.title_ar ?? existing.title_ar,
        patch.content_ar ?? existing.content_ar,
        patch.lesson_type ?? existing.lesson_type,
        JSON.stringify(Array.isArray(patch.examples) ? patch.examples : existing.examples),
        patch.pronunciation_text ?? existing.pronunciation_text,
        patch.pronunciation_lang ?? existing.pronunciation_lang,
        patch.sort_order !== undefined ? Number(patch.sort_order) : existing.sort_order,
        patch.is_published !== undefined ? (patch.is_published ? 1 : 0) : existing.is_published,
        id
      );
    return this.getLessonById(id);
  }

  deleteLesson(id) {
    const info = this.db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
    return info.changes > 0;
  }

  listExercisesByLesson(lessonId) {
    return this.db
      .prepare('SELECT * FROM exercises WHERE lesson_id = ? ORDER BY id ASC')
      .all(lessonId)
      .map((ex) => ({
        ...ex,
        options: safeParseArray(ex.options_json),
      }));
  }

  createExercise({ lesson_id, question_ar, options = [], correct_answer, explanation_ar, hint_ar = '', difficulty = 'beginner' }) {
    const info = this.db
      .prepare(
        `INSERT INTO exercises (lesson_id, question_ar, options_json, correct_answer, explanation_ar, hint_ar, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(lesson_id),
        question_ar,
        JSON.stringify(Array.isArray(options) ? options : []),
        String(correct_answer),
        explanation_ar,
        hint_ar,
        difficulty
      );
    const row = this.db.prepare('SELECT * FROM exercises WHERE id = ?').get(Number(info.lastInsertRowid));
    return row ? { ...row, options: safeParseArray(row.options_json) } : null;
  }

  _hydrateLesson(row) {
    return {
      ...row,
      examples: safeParseArray(row.examples_json),
    };
  }
}
