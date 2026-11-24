import fs from 'node:fs/promises';
import path from 'node:path';

export class TempMediaCleanupService {
  constructor(tempDir, { maxAgeMs = 15 * 60 * 1000, logger = null } = {}) {
    this.tempDir = path.resolve(tempDir);
    this.maxAgeMs = maxAgeMs;
    this.logger = logger;
    this.timer = null;
  }

  async ensureDir() {
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async removeFileSafe(filePath) {
    if (!filePath) return;
    try {
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(this.tempDir + path.sep)) {
        return;
      }
      await fs.unlink(resolved);
    } catch {
      // Ignore already-deleted files
    }
  }

  async purgeExpired() {
    try {
      await this.ensureDir();
      const entries = await fs.readdir(this.tempDir, { withFileTypes: true });
      const now = Date.now();
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const full = path.join(this.tempDir, entry.name);
        const stat = await fs.stat(full).catch(() => null);
        if (stat && now - stat.mtimeMs > this.maxAgeMs) {
          await fs.unlink(full).catch(() => {});
        }
      }
    } catch (err) {
      this.logger?.warn?.('media-cleanup', 'Failed to purge temporary media files', err.message);
    }
  }

  start(intervalMs = 5 * 60 * 1000) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.purgeExpired();
    }, intervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
