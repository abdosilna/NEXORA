export const migration003 = {
  id: '003_silana_migration_tables',
  name: 'Add additive learning mistakes, AI learning profiles, research history, and plugin stats tables',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_mistakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module TEXT NOT NULL DEFAULT 'tutor',
        topic TEXT NOT NULL DEFAULT '',
        question TEXT NOT NULL,
        user_answer TEXT NOT NULL DEFAULT '',
        expected_answer TEXT NOT NULL DEFAULT '',
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_mistakes_user ON user_mistakes(user_id, resolved, created_at);

      CREATE TABLE IF NOT EXISTS ai_learning_profiles (
        user_id INTEGER PRIMARY KEY,
        level TEXT NOT NULL DEFAULT 'beginner',
        preferred_style TEXT NOT NULL DEFAULT 'balanced',
        strengths_json TEXT NOT NULL DEFAULT '[]',
        weaknesses_json TEXT NOT NULL DEFAULT '[]',
        goals_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS research_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        provider TEXT NOT NULL,
        sources_json TEXT NOT NULL DEFAULT '[]',
        uncertainty_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_research_history_user ON research_history(user_id, created_at);

      CREATE TABLE IF NOT EXISTS plugin_stats (
        plugin_name TEXT PRIMARY KEY,
        total_runs INTEGER NOT NULL DEFAULT 0,
        success_runs INTEGER NOT NULL DEFAULT 0,
        error_runs INTEGER NOT NULL DEFAULT 0,
        last_run_at TEXT,
        last_error TEXT NOT NULL DEFAULT ''
      );
    `);
  },
};
