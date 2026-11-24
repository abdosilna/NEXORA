import { extractPhoneFromJid } from '../../utils/phone.js';

function safeParseJson(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export class UsersRepository {
  constructor(db) {
    this.db = db;
  }

  findById(userId) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return row ? this._hydrateUser(row) : null;
  }

  findByJid(whatsappJid) {
    const row = this.db.prepare('SELECT * FROM users WHERE whatsapp_jid = ?').get(whatsappJid);
    return row ? this._hydrateUser(row) : null;
  }

  registerOrTouch({ whatsappJid, displayName = '', preferredLanguage = 'ar' }) {
    const phone = extractPhoneFromJid(whatsappJid);
    const existing = this.findByJid(whatsappJid);

    if (existing) {
      const nextName = displayName && displayName.trim() ? displayName.trim() : existing.display_name;
      this.db
        .prepare(
          `UPDATE users
           SET display_name = ?, last_active_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(nextName, existing.id);
      return { user: this.findById(existing.id), isNew: false };
    }

    const createdId = this.db.transaction(() => {
      const result = this.db
        .prepare(
          `INSERT INTO users (whatsapp_jid, phone_number, display_name, preferred_language, learning_level, state_json)
           VALUES (?, ?, ?, ?, 'beginner', '{"menu":"home","data":{}}')`
        )
        .run(whatsappJid, phone, displayName.trim(), preferredLanguage);

      const userId = Number(result.lastInsertRowid);
      this.db
        .prepare(`INSERT INTO user_preferences (user_id) VALUES (?)`)
        .run(userId);
      this.db
        .prepare(
          `INSERT INTO learning_events (user_id, module, event_type, topic, payload_json)
           VALUES (?, 'system', 'user_registered', 'onboarding', ?)`
        )
        .run(userId, JSON.stringify({ preferredLanguage }));

      return userId;
    });

    return { user: this.findById(createdId), isNew: true };
  }

  getPreferences(userId) {
    const row = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    if (!row) {
      this.db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(userId);
      return this.getPreferences(userId);
    }
    return {
      user_id: row.user_id,
      voice_replies_enabled: Boolean(row.voice_replies_enabled),
      daily_reminder_enabled: Boolean(row.daily_reminder_enabled),
      tutor_style: row.tutor_style,
      focus_track: row.focus_track,
      strengths: safeParseJson(row.strengths_json, []),
      weaknesses: safeParseJson(row.weaknesses_json, []),
      repeated_mistakes: safeParseJson(row.repeated_mistakes_json, []),
      updated_at: row.updated_at,
    };
  }

  updatePreferences(userId, patch) {
    const current = this.getPreferences(userId);
    const next = {
      voice_replies_enabled:
        patch.voice_replies_enabled !== undefined
          ? patch.voice_replies_enabled
            ? 1
            : 0
          : current.voice_replies_enabled
            ? 1
            : 0,
      daily_reminder_enabled:
        patch.daily_reminder_enabled !== undefined
          ? patch.daily_reminder_enabled
            ? 1
            : 0
          : current.daily_reminder_enabled
            ? 1
            : 0,
      tutor_style: patch.tutor_style || current.tutor_style,
      focus_track: patch.focus_track || current.focus_track,
      strengths_json: JSON.stringify(patch.strengths || current.strengths),
      weaknesses_json: JSON.stringify(patch.weaknesses || current.weaknesses),
      repeated_mistakes_json: JSON.stringify(patch.repeated_mistakes || current.repeated_mistakes),
    };

    this.db
      .prepare(
        `UPDATE user_preferences
         SET voice_replies_enabled = ?,
             daily_reminder_enabled = ?,
             tutor_style = ?,
             focus_track = ?,
             strengths_json = ?,
             weaknesses_json = ?,
             repeated_mistakes_json = ?,
             updated_at = datetime('now')
         WHERE user_id = ?`
      )
      .run(
        next.voice_replies_enabled,
        next.daily_reminder_enabled,
        next.tutor_style,
        next.focus_track,
        next.strengths_json,
        next.weaknesses_json,
        next.repeated_mistakes_json,
        userId
      );

    return this.getPreferences(userId);
  }

  updateProfile(userId, { displayName, preferredLanguage, learningLevel }) {
    const user = this.findById(userId);
    if (!user) return null;

    this.db
      .prepare(
        `UPDATE users
         SET display_name = ?,
             preferred_language = ?,
             learning_level = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        displayName !== undefined ? String(displayName).trim() : user.display_name,
        preferredLanguage || user.preferred_language,
        learningLevel || user.learning_level,
        userId
      );
    return this.findById(userId);
  }

  getState(userId) {
    const row = this.db.prepare('SELECT state_json FROM users WHERE id = ?').get(userId);
    if (!row) return { menu: 'home', data: {} };
    return safeParseJson(row.state_json, { menu: 'home', data: {} });
  }

  setState(userId, stateObj) {
    const serialized = JSON.stringify({
      menu: stateObj?.menu || 'home',
      data: stateObj?.data || {},
    });
    this.db
      .prepare(`UPDATE users SET state_json = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(serialized, userId);
  }

  addPoints(userId, points) {
    const delta = Number(points) || 0;
    if (delta === 0) return;
    this.db
      .prepare(`UPDATE users SET total_points = MAX(0, total_points + ?), updated_at = datetime('now') WHERE id = ?`)
      .run(delta, userId);
  }

  listUsers({ search = '', limit = 50, offset = 0 } = {}) {
    const cleanSearch = String(search || '').trim();
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    if (cleanSearch) {
      const pattern = `%${cleanSearch}%`;
      return this.db
        .prepare(
          `SELECT id, whatsapp_jid, phone_number, display_name, preferred_language, learning_level, total_points, streak_days, joined_at, last_active_at
           FROM users
           WHERE phone_number LIKE ? OR display_name LIKE ? OR whatsapp_jid LIKE ?
           ORDER BY last_active_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(pattern, pattern, pattern, safeLimit, safeOffset);
    }

    return this.db
      .prepare(
        `SELECT id, whatsapp_jid, phone_number, display_name, preferred_language, learning_level, total_points, streak_days, joined_at, last_active_at
         FROM users
         ORDER BY last_active_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(safeLimit, safeOffset);
  }

  countUsers() {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM users').get();
    return row?.count || 0;
  }

  exportUserData(userId) {
    const user = this.findById(userId);
    if (!user) return null;
    const preferences = this.getPreferences(userId);
    const progress = this.db
      .prepare(
        `SELECT up.*, c.title_ar AS course_title, l.title_ar AS lesson_title
         FROM user_progress up
         LEFT JOIN courses c ON c.id = up.course_id
         LEFT JOIN lessons l ON l.id = up.lesson_id
         WHERE up.user_id = ?
         ORDER BY up.updated_at DESC`
      )
      .all(userId);
    const quizAttempts = this.db
      .prepare('SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200')
      .all(userId);
    const learningEvents = this.db
      .prepare('SELECT * FROM learning_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 200')
      .all(userId);
    const conversations = this.db
      .prepare('SELECT role, module, message_text, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 200')
      .all(userId);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        phone_number: user.phone_number,
        display_name: user.display_name,
        preferred_language: user.preferred_language,
        learning_level: user.learning_level,
        total_points: user.total_points,
        joined_at: user.joined_at,
        last_active_at: user.last_active_at,
      },
      preferences,
      progress,
      quizAttempts,
      learningEvents,
      conversations,
    };
  }

  deleteUser(userId) {
    return this.db.transaction(() => {
      const info = this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      return info.changes > 0;
    });
  }

  _hydrateUser(row) {
    return {
      ...row,
      state: safeParseJson(row.state_json, { menu: 'home', data: {} }),
    };
  }
}
