export class ConversationsRepository {
  constructor(db) {
    this.db = db;
  }

  append({ userId, role, module = 'general', messageText, metadata = {} }) {
    const info = this.db
      .prepare(
        `INSERT INTO conversations (user_id, role, module, message_text, metadata_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, role, module, String(messageText || '').slice(0, 4000), JSON.stringify(metadata || {}));
    return Number(info.lastInsertRowid);
  }

  getRecentForUser(userId, { module = null, limit = 10 } = {}) {
    if (module) {
      return this.db
        .prepare(
          `SELECT id, role, module, message_text, created_at
           FROM conversations
           WHERE user_id = ? AND module = ?
           ORDER BY id DESC
           LIMIT ?`
        )
        .all(userId, module, limit)
        .reverse();
    }
    return this.db
      .prepare(
        `SELECT id, role, module, message_text, created_at
         FROM conversations
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(userId, limit)
      .reverse();
  }

  getStats() {
    const totalMessages = this.db.prepare('SELECT COUNT(*) AS cnt FROM conversations').get()?.cnt || 0;
    const inboundMessages =
      this.db.prepare(`SELECT COUNT(*) AS cnt FROM conversations WHERE role = 'user'`).get()?.cnt || 0;
    const outboundMessages =
      this.db.prepare(`SELECT COUNT(*) AS cnt FROM conversations WHERE role = 'assistant'`).get()?.cnt || 0;
    const todayMessages =
      this.db
        .prepare(`SELECT COUNT(*) AS cnt FROM conversations WHERE date(created_at) = date('now')`)
        .get()?.cnt || 0;
    const byModule = this.db
      .prepare(
        `SELECT module, COUNT(*) AS count
         FROM conversations
         WHERE role = 'user'
         GROUP BY module
         ORDER BY count DESC`
      )
      .all();

    return {
      totalMessages,
      inboundMessages,
      outboundMessages,
      todayMessages,
      byModule,
    };
  }
}
