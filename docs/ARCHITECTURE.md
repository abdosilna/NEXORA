# NEXORA BOT Architecture & Operations Guide

## 1. Disclaimer on WhatsApp Integration
NEXORA BOT integrates with WhatsApp Multi-Device using `@whiskeysockets/baileys`. **Baileys is an unofficial WhatsApp Web client library and is NOT an official Meta Cloud API.** Protocol updates or account policy enforcement by WhatsApp may interrupt connectivity or restrict accounts.

## 2. Top-Level Runtime Entry & Lifecycle
- **`index.js`**: Process supervisor, environment bootstrap (`config.js`), startup diagnostics, uncaught rejection guards, and graceful `SIGINT`/`SIGTERM` shutdown orchestration.
- **`main.js`**: Dependency injection container (`bootstrapApplication`) wiring SQLite + migrations (`001`–`005`), AI (`AiService`), Audio/TTS (`AudioService`), Multi-source Research (`ResearchEngine`), Creative Studio (`CreativeStudioModule`), educational modules (`TutorModule`, `LanguageAcademyModule`, `ProgrammingAcademyModule`, `LibraryModule`, `SafeSupportModule`), `PluginManager` (loading 9 plugins from `plugins/`), `BotRouter`, `WhatsAppManager`, `HealthService`, and the Express Admin HTTP server (`0.0.0.0:$PORT`).
- **`handler.js`**: Silana-inspired message normalization (`smsg`), group/owner/admin gating, loop protection, user registration, prefixed plugin dispatch (`.menu`, `.tutor`, `.lang`, `.code`, `.research`, `.voice`, `.creative`, `.anime`, `.admin`, etc.), and stateful interactive menu routing via `BotRouter`.
- **`config.js`**: Zod-validated environment schema. Preserves special SQLite memory target `DATABASE_PATH=':memory:'` verbatim without resolving to disk, normalizes `WHATSAPP_NUMBER`, and validates AI, Search, TTS, and Creative Studio (`IMAGE_PROVIDER`, `IMAGE_API_KEY`, `IMAGE_MODEL`, `IMAGE_MAX_BYTES`) configuration.

## 3. WhatsApp Layer (`lib/whatsapp/`)
- `auth-state.js`: Atomic multi-file persistence under `data/auth` using per-file async serialization, temporary writes, and `fs.rename()`.
- `pairing.js`: Single-shot 8-digit pairing code requests printed exclusively in the private server console (never QR codes, never loops).
- `connection.js`: Single active socket guard, bounded exponential backoff, and explicit status handling for `loggedOut (401)`, `badSession (500)`, `connectionClosed (428)`, and `restartRequired (515)`. Halts reconnect loops on `401 / loggedOut` without deleting SQLite learner records.
- `sender.js`: Sends native Baileys `interactiveMessage` (`single_select` lists and `quick_reply` buttons) when supported (`WHATSAPP_INTERACTIVE_MENUS=true`), automatically falls back to clean Arabic numbered text menus, chunks long messages while keeping Markdown code fences balanced, and handles PTT audio + Creative Studio image delivery (`payload.image`) with guaranteed temporary file cleanup.
- `message-handler.js`, `simple.js`, `plugins.js`: Decodes text, `buttonsResponseMessage`, `listResponseMessage`, and `interactiveResponseMessage` (`nativeFlowResponseMessage`) callback IDs, and dynamically loads/reloads all 9 plugins in `plugins/`.

## 4. Bot Navigation, Design & Educational Modules (`lib/bot/`, `lib/ai/`, `lib/search/`, `lib/tts/`, `lib/creative/`)
- **9-Section Interactive Menu (`lib/bot/menu.js`, `lib/bot/router.js`)**:
  1. `menu:tutor` (`🎓 المعلم الذكي`)
  2. `menu:languages` (`🌍 أكاديمية اللغات` — Japanese, English, Russian, Chinese across Beginner/Intermediate/Advanced + SM-2 spaced repetition + mistake review)
  3. `menu:programming` (`💻 أكاديمية البرمجة` — Python, HTML, CSS, JavaScript, Node.js ordered Beginner → Intermediate → Advanced + capstone projects + static-only code debugging)
  4. `menu:research` (`🔎 البحث الذكي` — SSRF-guarded DuckDuckGo + MDN + curated references + optional Wikipedia)
  5. `menu:audio` (`🎙️ الذكاء الصوتي` — TTS pronunciation with honest disabled/missing-key fallback)
  6. `menu:creative` (`🎨 الاستوديو الإبداعي` — Gemini `gemini-3.1-flash-lite-image` / OpenAI image generation with prompt safety filter, MIME whitelist `image/png|jpeg|webp`, 5MB size limit, per-user rate limit, and temp cleanup)
  7. `menu:library_hub` (`🎌 مكتبة الأنمي والمعرفة` — authorized legal anime & open-knowledge directories with pagination)
  8. `menu:progress` (`📊 تقدّمي التعليمي` — XP, mastery, SRS reviews, open mistakes)
  9. `menu:help_settings` (`⚙️ المساعدة والإعدادات` — level/voice/memory consent settings, JSON self-export, account deletion, command guide, and private Safe Support)
- **Visual Identity Reference**: See `docs/design/nexora-mobile-menu-mockup.jpg` for the dark-midnight / violet / cyan WhatsApp UI design spec.
- **Gemini 4 Handling (`lib/ai/providers/gemini.js`)**: For `gemini-4-*` (and `models/gemini-4-*`), omits `maxOutputTokens` and `temperature` from the SDK request config so thinking/reasoning tokens do not exhaust response budgets, placing concise Arabic length guidance inside `systemInstruction` instead.

## 5. Database & Migrations (`lib/database/`)
- SQLite (`better-sqlite3`, WAL mode, `foreign_keys=ON`) with 18 tables managed via transactional migrations:
  - `001_initial_schema.js`
  - `002_seed_curriculum.js`
  - `003_silana_migration_tables.js`
  - `004_rich_academies_curriculum.js`
  - `005_programming_levels_and_creative.js` (adds intermediate & advanced tracks + capstone `project` lessons for Python, HTML, CSS, JavaScript, and Node.js)

## 6. Private Admin Dashboard & Privacy (`lib/admin/`, `public/admin/`)
- Served at `/admin` with `helmet`, `scrypt` hashed credentials, `HttpOnly` + Bearer session tokens, RBAC (`super_admin`, `editor`, `viewer`), CSRF origin checks, and automatic first-admin bootstrap lock.
- Blocks access to `.env` and `data/auth`.
- **Learner Privacy**: Admin user summary endpoints expose aggregate learning metrics (`total_points`, `completedLessons`, `quizAccuracy`, `preferences`) and **never expose private user chat `conversations`** without explicit user export/consent.
