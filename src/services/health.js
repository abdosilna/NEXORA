export class HealthService {
  constructor({ config, db, aiService, whatsappManager, audioService, researchService }) {
    this.config = config;
    this.db = db;
    this.aiService = aiService;
    this.whatsappManager = whatsappManager;
    this.audioService = audioService;
    this.researchService = researchService;
    this.startedAt = new Date().toISOString();
  }

  getSnapshot() {
    let dbOk = false;
    try {
      dbOk = this.db.ping();
    } catch {
      dbOk = false;
    }

    const waStatus = this.whatsappManager?.getStatus?.() || {
      state: 'idle',
      connected: false,
      needsRepairing: false,
    };

    return {
      ok: dbOk,
      service: this.config.botName,
      startedAt: this.startedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      database: {
        dialect: this.db.dialect,
        status: dbOk ? 'healthy' : 'error',
      },
      whatsapp: waStatus,
      ai: this.aiService?.getHealth?.() || { status: 'disabled' },
      research: this.researchService?.getHealth?.() || { provider: this.config.research.provider },
      tts: this.audioService?.getHealth?.() || { provider: this.config.tts.provider, enabled: false },
    };
  }
}
