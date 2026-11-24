import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export class DatabaseConnection {
  constructor(dbPath, { logger = null } = {}) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.dialect = 'sqlite';
    this.db = null;
  }

  open() {
    if (this.db) return this.db;
    if (this.dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(path.resolve(this.dbPath)), { recursive: true });
    }
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');
    return this.db;
  }

  get raw() {
    if (!this.db) return this.open();
    return this.db;
  }

  transaction(fn) {
    const wrapped = this.raw.transaction(fn);
    return wrapped();
  }

  exec(sql) {
    return this.raw.exec(sql);
  }

  prepare(sql) {
    return this.raw.prepare(sql);
  }

  ping() {
    const row = this.raw.prepare('SELECT 1 AS ok').get();
    return row?.ok === 1;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createDatabase(dbPath, options = {}) {
  const conn = new DatabaseConnection(dbPath, options);
  conn.open();
  return conn;
}
