import { generateSessionToken, hashPassword, hashSessionToken, verifyPassword } from '../../security/crypto.js';

export class AdminRepository {
  constructor(db) {
    this.db = db;
  }

  countAdmins() {
    return this.db.prepare('SELECT COUNT(*) AS cnt FROM admin_users').get()?.cnt || 0;
  }

  findAdminByUsername(username) {
    return (
      this.db
        .prepare('SELECT id, username, password_hash, role, is_active, created_at, last_login_at FROM admin_users WHERE username = ?')
        .get(String(username || '').trim().toLowerCase()) || null
    );
  }

  findAdminById(id) {
    return (
      this.db
        .prepare('SELECT id, username, role, is_active, created_at, last_login_at FROM admin_users WHERE id = ?')
        .get(id) || null
    );
  }

  listAdmins() {
    return this.db
      .prepare('SELECT id, username, role, is_active, created_at, last_login_at FROM admin_users ORDER BY id ASC')
      .all();
  }

  createAdmin({ username, password, role = 'super_admin' }) {
    const cleanUser = String(username || '').trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    const hash = hashPassword(password);
    const info = this.db
      .prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(cleanUser, hash, role);
    return this.findAdminById(Number(info.lastInsertRowid));
  }

  bootstrapFirstAdmin({ username, password }) {
    return this.db.transaction(() => {
      const existing = this.countAdmins();
      if (existing > 0) {
        throw new Error('Administrator account already exists');
      }
      return this.createAdmin({ username, password, role: 'super_admin' });
    });
  }

  authenticate(username, password) {
    const admin = this.findAdminByUsername(username);
    if (!admin || !admin.is_active) return null;
    if (!verifyPassword(password, admin.password_hash)) return null;
    this.db
      .prepare(`UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?`)
      .run(admin.id);
    return this.findAdminById(admin.id);
  }

  createSession(adminUserId, { ipAddress = '', userAgent = '', ttlHours = 24 } = {}) {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    this.db
      .prepare(
        `INSERT INTO admin_sessions (admin_user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' hours'))`
      )
      .run(adminUserId, tokenHash, String(ipAddress).slice(0, 64), String(userAgent).slice(0, 200), ttlHours);
    return { token: rawToken, ttlHours };
  }

  validateSession(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const tokenHash = hashSessionToken(rawToken);
    const row = this.db
      .prepare(
        `SELECT s.id AS session_id, s.expires_at, u.id, u.username, u.role, u.is_active
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.admin_user_id
         WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
      )
      .get(tokenHash);
    return row || null;
  }

  revokeSession(rawToken) {
    if (!rawToken) return;
    const tokenHash = hashSessionToken(rawToken);
    this.db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
  }

  pruneExpiredSessions() {
    this.db.prepare(`DELETE FROM admin_sessions WHERE expires_at <= datetime('now')`).run();
  }

  logAudit({ adminUserId = null, adminUsername = 'system', action, targetType = '', targetId = '', details = {} }) {
    this.db
      .prepare(
        `INSERT INTO admin_audit_logs (admin_user_id, admin_username, action, target_type, target_id, details_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        adminUserId,
        adminUsername,
        action,
        targetType,
        String(targetId || ''),
        JSON.stringify(details || {})
      );
  }

  listAuditLogs(limit = 100) {
    return this.db
      .prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT ?')
      .all(Math.min(200, Math.max(1, Number(limit) || 100)));
  }

  getAllSettings() {
    const rows = this.db.prepare('SELECT key, value_json, updated_at FROM application_settings ORDER BY key ASC').all();
    const out = {};
    for (const row of rows) {
      try {
        out[row.key] = JSON.parse(row.value_json);
      } catch {
        out[row.key] = row.value_json;
      }
    }
    return out;
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare('SELECT value_json FROM application_settings WHERE key = ?').get(key);
    if (!row) return fallback;
    try {
      return JSON.parse(row.value_json);
    } catch {
      return fallback;
    }
  }

  setSetting(key, value) {
    this.db
      .prepare(
        `INSERT INTO application_settings (key, value_json, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
      )
      .run(key, JSON.stringify(value));
    return this.getSetting(key);
  }

  recordPluginRun({ pluginName, ok = true, errorMessage = '' }) {
    if (!pluginName) return;
    this.db
      .prepare(
        `INSERT INTO plugin_stats (plugin_name, total_runs, success_runs, error_runs, last_run_at, last_error)
         VALUES (?, 1, ?, ?, datetime('now'), ?)
         ON CONFLICT(plugin_name) DO UPDATE SET
           total_runs = total_runs + 1,
           success_runs = success_runs + ?,
           error_runs = error_runs + ?,
           last_run_at = datetime('now'),
           last_error = CASE WHEN ? != '' THEN ? ELSE last_error END`
      )
      .run(
        pluginName,
        ok ? 1 : 0,
        ok ? 0 : 1,
        String(errorMessage || '').slice(0, 300),
        ok ? 1 : 0,
        ok ? 0 : 1,
        String(errorMessage || '').slice(0, 300),
        String(errorMessage || '').slice(0, 300)
      );
  }

  listPluginStats() {
    return this.db
      .prepare('SELECT * FROM plugin_stats ORDER BY total_runs DESC, plugin_name ASC')
      .all();
  }
}
