export class ResourcesRepository {
  constructor(db) {
    this.db = db;
  }

  list({ kind = null, category = null, query = '', includeUnpublished = false, limit = 50 } = {}) {
    const conditions = [];
    const params = [];
    if (!includeUnpublished) conditions.push('is_published = 1');
    if (kind) {
      conditions.push('kind = ?');
      params.push(kind);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      conditions.push('(title LIKE ? OR title_ar LIKE ? OR description_ar LIKE ? OR genre LIKE ? OR category LIKE ?)');
      params.push(q, q, q, q, q);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT * FROM resources ${where} ORDER BY id DESC LIMIT ?`)
      .all(...params, Math.min(200, Math.max(1, Number(limit) || 50)));
  }

  getById(id) {
    return this.db.prepare('SELECT * FROM resources WHERE id = ?').get(id) || null;
  }

  create({ kind, title, title_ar = '', category, genre = '', description_ar, legal_url, source_label = '', is_authorized = 1, is_published = 1 }) {
    const info = this.db
      .prepare(
        `INSERT INTO resources (kind, title, title_ar, category, genre, description_ar, legal_url, source_label, is_authorized, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        kind,
        title,
        title_ar,
        category,
        genre,
        description_ar,
        legal_url,
        source_label,
        is_authorized ? 1 : 0,
        is_published ? 1 : 0
      );
    return this.getById(Number(info.lastInsertRowid));
  }

  update(id, patch) {
    const existing = this.getById(id);
    if (!existing) return null;
    this.db
      .prepare(
        `UPDATE resources
         SET kind = ?, title = ?, title_ar = ?, category = ?, genre = ?, description_ar = ?, legal_url = ?, source_label = ?, is_authorized = ?, is_published = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        patch.kind ?? existing.kind,
        patch.title ?? existing.title,
        patch.title_ar ?? existing.title_ar,
        patch.category ?? existing.category,
        patch.genre ?? existing.genre,
        patch.description_ar ?? existing.description_ar,
        patch.legal_url ?? existing.legal_url,
        patch.source_label ?? existing.source_label,
        patch.is_authorized !== undefined ? (patch.is_authorized ? 1 : 0) : existing.is_authorized,
        patch.is_published !== undefined ? (patch.is_published ? 1 : 0) : existing.is_published,
        id
      );
    return this.getById(id);
  }

  delete(id) {
    const info = this.db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    return info.changes > 0;
  }
}
