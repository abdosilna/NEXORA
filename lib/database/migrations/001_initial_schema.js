export const migration001 = {
  id: '001_initial_schema',
  name: 'Create core 14 tables and indexes',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_jid TEXT NOT NULL UNIQUE,
        phone_number TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        preferred_language TEXT NOT NULL DEFAULT 'ar',
        learning_level TEXT NOT NULL DEFAULT 'beginner',
        state_json TEXT NOT NULL DEFAULT '{"menu":"home","data":{}}',
        total_points INTEGER NOT NULL DEFAULT 0,
        streak_days INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        voice_replies_enabled INTEGER NOT NULL DEFAULT 0,
        daily_reminder_enabled INTEGER NOT NULL DEFAULT 0,
        tutor_style TEXT NOT NULL DEFAULT 'balanced',
        focus_track TEXT NOT NULL DEFAULT 'general',
        strengths_json TEXT NOT NULL DEFAULT '[]',
        weaknesses_json TEXT NOT NULL DEFAULT '[]',
        repeated_mistakes_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'beginner',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_courses_cat_sub ON courses(category, subject, level);

      CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        lesson_type TEXT NOT NULL DEFAULT 'lesson',
        title_ar TEXT NOT NULL,
        content_ar TEXT NOT NULL,
        examples_json TEXT NOT NULL DEFAULT '[]',
        pronunciation_text TEXT NOT NULL DEFAULT '',
        pronunciation_lang TEXT NOT NULL DEFAULT 'en',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_lessons_course_order ON lessons(course_id, sort_order);

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        question_ar TEXT NOT NULL,
        options_json TEXT NOT NULL DEFAULT '[]',
        correct_answer TEXT NOT NULL,
        explanation_ar TEXT NOT NULL,
        hint_ar TEXT NOT NULL DEFAULT '',
        difficulty TEXT NOT NULL DEFAULT 'beginner',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON exercises(lesson_id);

      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        lesson_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        mastery_score INTEGER NOT NULL DEFAULT 0,
        srs_interval_days INTEGER NOT NULL DEFAULT 1,
        srs_ease_factor REAL NOT NULL DEFAULT 2.5,
        srs_repetitions INTEGER NOT NULL DEFAULT 0,
        next_review_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, lesson_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_user_progress_review ON user_progress(user_id, next_review_at);

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER,
        lesson_id INTEGER,
        exercise_id INTEGER,
        topic TEXT NOT NULL DEFAULT '',
        user_answer TEXT NOT NULL,
        is_correct INTEGER NOT NULL DEFAULT 0,
        hints_used INTEGER NOT NULL DEFAULT 0,
        score_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id, created_at);

      CREATE TABLE IF NOT EXISTS learning_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module TEXT NOT NULL,
        event_type TEXT NOT NULL,
        topic TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_learning_events_module ON learning_events(module, created_at);

      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        module TEXT NOT NULL DEFAULT 'general',
        message_text TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_user_time ON conversations(user_id, created_at);

      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        title_ar TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        genre TEXT NOT NULL DEFAULT '',
        description_ar TEXT NOT NULL,
        legal_url TEXT NOT NULL,
        source_label TEXT NOT NULL DEFAULT '',
        is_authorized INTEGER NOT NULL DEFAULT 1,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_resources_kind_cat ON resources(kind, category, is_published);

      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'super_admin',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        ip_address TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_exp ON admin_sessions(expires_at);

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER,
        admin_username TEXT NOT NULL DEFAULT 'system',
        action TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT '',
        target_id TEXT NOT NULL DEFAULT '',
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);

      CREATE TABLE IF NOT EXISTS application_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
};
