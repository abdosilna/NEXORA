import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { validateInternationalPhone } from '../utils/phone.js';

let loadedEnv = false;

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_NAME: z.string().trim().min(1).max(60).default('NEXORA BOT'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  WHATSAPP_NUMBER: z.string().trim().optional().default(''),
  ADMIN_NUMBER: z.string().trim().optional().default(''),
  WHATSAPP_AUTH_DIR: z.string().trim().min(1).default('data/auth'),
  WHATSAPP_AUTO_CONNECT: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),

  APP_SECRET: z.string().trim().optional().default(''),
  ADMIN_BOOTSTRAP_USERNAME: z.string().trim().optional().default(''),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().trim().optional().default(''),

  DATABASE_PATH: z.string().trim().min(1).default('data/nexora.sqlite'),

  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic', 'disabled']).default('gemini'),
  AI_API_KEY: z.string().trim().optional().default(''),
  AI_MODEL: z.string().trim().default('gemini-2.5-flash'),
  AI_BASE_URL: z.string().trim().optional().default(''),
  AI_TIMEOUT_MS: z.coerce.number().int().min(2000).max(120000).default(20000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_DAILY_USER_BUDGET: z.coerce.number().int().min(1).max(500).default(40),

  SEARCH_PROVIDER: z.enum(['wikipedia', 'duckduckgo', 'serper', 'brave', 'disabled']).default('wikipedia'),
  SEARCH_API_KEY: z.string().trim().optional().default(''),
  RESEARCH_TIMEOUT_MS: z.coerce.number().int().min(2000).max(30000).default(10000),

  TTS_PROVIDER: z.enum(['disabled', 'openai', 'elevenlabs', 'google']).default('disabled'),
  TTS_API_KEY: z.string().trim().optional().default(''),
  TTS_VOICE_ID: z.string().trim().optional().default(''),
  TTS_MAX_CHARS: z.coerce.number().int().min(50).max(2000).default(500),
  TTS_MAX_DURATION_SEC: z.coerce.number().int().min(5).max(120).default(45),
  TEMP_MEDIA_DIR: z.string().trim().min(1).default('data/tmp-media'),
});

export function loadConfig(envSource = process.env, { loadDotenv = true } = {}) {
  if (loadDotenv && !loadedEnv) {
    dotenv.config({ quiet: true });
    loadedEnv = true;
  }

  const parsed = EnvSchema.safeParse(envSource);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const cfg = parsed.data;
  const warnings = [];

  // Validate phone numbers if provided
  let whatsappPhone = '';
  if (cfg.WHATSAPP_NUMBER) {
    const check = validateInternationalPhone(cfg.WHATSAPP_NUMBER);
    if (!check.valid) {
      throw new Error(`Invalid WHATSAPP_NUMBER: ${check.reason}`);
    }
    whatsappPhone = check.digits;
  }

  let adminPhone = '';
  if (cfg.ADMIN_NUMBER) {
    const check = validateInternationalPhone(cfg.ADMIN_NUMBER);
    if (!check.valid) {
      throw new Error(`Invalid ADMIN_NUMBER: ${check.reason}`);
    }
    adminPhone = check.digits;
  }

  // Reject /tmp paths for persistent storage
  const resolvedDbPath = path.resolve(cfg.DATABASE_PATH);
  const resolvedAuthDir = path.resolve(cfg.WHATSAPP_AUTH_DIR);
  if (resolvedDbPath.startsWith('/tmp/') || resolvedAuthDir.startsWith('/tmp/')) {
    throw new Error('Persistent DATABASE_PATH and WHATSAPP_AUTH_DIR must not reside in /tmp');
  }

  const appSecret = cfg.APP_SECRET || crypto.randomBytes(32).toString('hex');
  if (!cfg.APP_SECRET) {
    warnings.push('APP_SECRET is not set; using ephemeral in-memory secret for this run');
  }

  // Optional Gemini fallback key if user configured GEMINI_API_KEY in AI Studio Secrets
  const effectiveAiApiKey =
    cfg.AI_API_KEY || (cfg.AI_PROVIDER === 'gemini' ? String(envSource.GEMINI_API_KEY || '').trim() : '');

  if (cfg.AI_PROVIDER !== 'disabled' && !effectiveAiApiKey) {
    warnings.push(`AI_API_KEY is not configured for ${cfg.AI_PROVIDER}; AI Tutor will use deterministic offline fallback`);
  }

  return {
    port: cfg.PORT,
    nodeEnv: cfg.NODE_ENV,
    botName: cfg.BOT_NAME,
    logLevel: cfg.LOG_LEVEL,
    whatsapp: {
      number: whatsappPhone,
      adminNumber: adminPhone,
      authDir: resolvedAuthDir,
      autoConnect: cfg.WHATSAPP_AUTO_CONNECT,
    },
    security: {
      appSecret,
      bootstrapUsername: cfg.ADMIN_BOOTSTRAP_USERNAME,
      bootstrapPassword: cfg.ADMIN_BOOTSTRAP_PASSWORD,
    },
    database: {
      path: resolvedDbPath,
    },
    ai: {
      provider: cfg.AI_PROVIDER,
      apiKey: effectiveAiApiKey,
      model: cfg.AI_MODEL,
      baseUrl: cfg.AI_BASE_URL,
      timeoutMs: cfg.AI_TIMEOUT_MS,
      maxRetries: cfg.AI_MAX_RETRIES,
      dailyUserBudget: cfg.AI_DAILY_USER_BUDGET,
    },
    research: {
      provider: cfg.SEARCH_PROVIDER,
      apiKey: cfg.SEARCH_API_KEY,
      timeoutMs: cfg.RESEARCH_TIMEOUT_MS,
    },
    tts: {
      provider: cfg.TTS_PROVIDER,
      apiKey: cfg.TTS_API_KEY,
      voiceId: cfg.TTS_VOICE_ID,
      maxChars: cfg.TTS_MAX_CHARS,
      maxDurationSec: cfg.TTS_MAX_DURATION_SEC,
      tempMediaDir: path.resolve(cfg.TEMP_MEDIA_DIR),
    },
    warnings,
  };
}

export function getPublicConfigSummary(config) {
  return {
    botName: config.botName,
    nodeEnv: config.nodeEnv,
    port: config.port,
    whatsappConfigured: Boolean(config.whatsapp.number),
    aiProvider: config.ai.provider,
    aiConfigured: Boolean(config.ai.apiKey),
    aiModel: config.ai.model,
    searchProvider: config.research.provider,
    ttsProvider: config.tts.provider,
    ttsConfigured: config.tts.provider !== 'disabled' && Boolean(config.tts.apiKey),
  };
}
