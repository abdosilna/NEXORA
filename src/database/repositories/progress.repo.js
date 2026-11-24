export class ProgressRepository {
  constructor(db) {
    this.db = db;
  }

  markInProgress({ userId, courseId, lessonId }) {
    const existing = this.db
      .prepare('SELECT id, status FROM user_progress WHERE user_id = ? AND lesson_id = ?')
      .get(userId, lessonId);
    if (existing) return existing;
    return this.recordLessonProgress({ userId, courseId, lessonId, masteryScore: 0, completed: false });
  }

  recordLessonProgress({ userId, courseId, lessonId, masteryScore = 80, completed = true }) {
    const existing = this.db
      .prepare('SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?')
      .get(userId, lessonId);

    const quality = masteryScore >= 85 ? 5 : masteryScore >= 70 ? 4 : masteryScore >= 50 ? 3 : 2;

    if (!existing) {
      const intervalDays = quality >= 3 ? 1 : 0;
      const reps = quality >= 3 ? 1 : 0;
      const ease = 2.5;
      this.db
        .prepare(
          `INSERT INTO user_progress (
             user_id, course_id, lesson_id, status, mastery_score,
             srs_interval_days, srs_ease_factor, srs_repetitions,
             next_review_at, completed_at, updated_at
           ) VALUES (
             ?, ?, ?, ?, ?, ?, ?, ?,
             datetime('now', '+' || ? || ' days'),
             CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
             datetime('now')
           )`
        )
        .run(
          userId,
          courseId,
          lessonId,
          completed ? 'completed' : 'in_progress',
          masteryScore,
          intervalDays,
          ease,
          reps,
          intervalDays,
          completed ? 1 : 0
        );
    } else {
      // SM-2 Spaced Repetition calculation
      let reps = existing.srs_repetitions;
      let interval = existing.srs_interval_days;
      let ease = existing.srs_ease_factor;

      if (quality >= 3) {
        if (reps === 0) interval = 1;
        else if (reps === 1) interval = 6;
        else interval = Math.round(interval * ease);
        reps += 1;
      } else {
        reps = 0;
        interval = 1;
      }

      ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      const nextMastery = Math.max(existing.mastery_score, masteryScore);
      const nextStatus = completed || existing.status === 'completed' ? 'completed' : 'in_progress';

      this.db
        .prepare(
          `UPDATE user_progress
           SET status = ?,
               mastery_score = ?,
               srs_interval_days = ?,
               srs_ease_factor = ?,
               srs_repetitions = ?,
               next_review_at = datetime('now', '+' || ? || ' days'),
               completed_at = COALESCE(completed_at, CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END),
               updated_at = datetime('now')
           WHERE user_id = ? AND lesson_id = ?`
        )
        .run(nextStatus, nextMastery, interval, ease, reps, interval, nextStatus, userId, lessonId);
    }

    return this.db
      .prepare('SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?')
      .get(userId, lessonId);
  }

  recordQuizAttempt({ userId, courseId = null, lessonId = null, exerciseId = null, topic = '', userAnswer, isCorrect, hintsUsed = 0, scoreAwarded = 0 }) {
    const info = this.db
      .prepare(
        `INSERT INTO quiz_attempts (user_id, course_id, lesson_id, exercise_id, topic, user_answer, is_correct, hints_used, score_awarded)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, courseId, lessonId, exerciseId, topic, String(userAnswer || ''), isCorrect ? 1 : 0, hintsUsed, scoreAwarded);
    return Number(info.lastInsertRowid);
  }

  recordLearningEvent({ userId, module, eventType, topic = '', payload = {} }) {
    const info = this.db
      .prepare(
        `INSERT INTO learning_events (user_id, module, event_type, topic, payload_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, module, eventType, topic, JSON.stringify(payload || {}));
    return Number(info.lastInsertRowid);
  }

  getDueReviews(userId, limit = 5) {
    return this.db
      .prepare(
        `SELECT up.*, l.title_ar AS lesson_title, l.content_ar, l.lesson_type, c.subject, c.level, c.title_ar AS course_title
         FROM user_progress up
         JOIN lessons l ON l.id = up.lesson_id
         JOIN courses c ON c.id = up.course_id
         WHERE up.user_id = ? AND up.next_review_at <= datetime('now')
         ORDER BY up.next_review_at ASC
         LIMIT ?`
      )
      .all(userId, limit);
  }

  getUserSummary(userId) {
    const completedLessons = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id = ? AND status = 'completed'`)
      .get(userId)?.cnt || 0;
    const inProgressLessons = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id = ? AND status = 'in_progress'`)
      .get(userId)?.cnt || 0;
    const quizStats = this.db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(is_correct), 0) AS correct
         FROM quiz_attempts WHERE user_id = ?`
      )
      .get(userId);
    const dueReviews = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM user_progress WHERE user_id = ? AND next_review_at <= datetime('now')`)
      .get(userId)?.cnt || 0;
    const recentEvents = this.db
      .prepare(
        `SELECT module, event_type, topic, created_at
         FROM learning_events WHERE user_id = ?
         ORDER BY created_at DESC LIMIT 8`
      )
      .all(userId);

    const bySubject = this.db
      .prepare(
        `SELECT c.category, c.subject, COUNT(up.id) AS lessons_count, ROUND(AVG(up.mastery_score)) AS avg_mastery
         FROM user_progress up
         JOIN courses c ON c.id = up.course_id
         WHERE up.user_id = ?
         GROUP BY c.category, c.subject`
      )
      .all(userId);

    return {
      completedLessons,
      inProgressLessons,
      quizTotal: quizStats?.total || 0,
      quizCorrect: quizStats?.correct || 0,
      quizAccuracy: quizStats?.total ? Math.round((quizStats.correct / quizStats.total) * 100) : 0,
      dueReviews,
      recentEvents,
      bySubject,
    };
  }
}
