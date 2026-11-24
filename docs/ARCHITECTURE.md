# NEXORA BOT Architecture & Operations Guide

## 1. Disclaimer on WhatsApp Integration
NEXORA BOT integrates with WhatsApp Multi-Device using `@whiskeysockets/baileys`. **Baileys is an unofficial WhatsApp Web client library and is NOT an official Meta Cloud API.** Protocol updates or account policy enforcement by WhatsApp may interrupt connectivity or restrict accounts.

## 2. Layered Modular Architecture
- **`src/index.js`**: Bootstraps config validation, SQLite migrations, Express admin/health HTTP server (`0.0.0.0:$PORT`), Baileys socket manager, and graceful `SIGINT`/`SIGTERM` shutdown.
- **`src/whatsapp/`**:
  - `auth-state.js`: Atomic multi-file persistence in `data/auth` via per-file async serialization + temp file + `fs.rename()`.
  - `pairing.js`: Single-shot 8-digit pairing code requests printed exclusively to the private server console. Never loops.
  - `connection.js`: Single active socket guard, bounded exponential backoff, explicit handlers for `loggedOut (401)`, `badSession (500)`, `connectionClosed (428)`, and `restartRequired (515)`.
  - `message-handler.js` & `sender.js`: Parses text and interactive reply payloads, applies rate limits, registers learners automatically, chunks responses, and cleans up temporary PTT audio files.
- **`src/bot/` & `src/modules/`**:
  - Arabic interactive menu (`menu.js`, `router.js`, `state.js`) with `home`, `back`, `cancel`, and `help` commands.
  - Modular features: `tutor`, `languages` (Japanese, English, Russian, Chinese + SM-2 spaced repetition), `programming` (Python, HTML, CSS, JS, Node.js with static-only code analysis), `research` (SSRF-guarded public web fetch + factual citations), `audio` (modular TTS with graceful disabled fallback), `library` (authorized legal resources only), and `support` (private study guidance without medical diagnosis).
- **`src/database/`**:
  - SQLite (`better-sqlite3`, WAL mode, `foreign_keys=ON`) with transactional migrations (`001_initial_schema.js`, `002_seed_curriculum.js`) and repository interfaces ready for PostgreSQL migration.
- **`src/admin/` & `public/admin/`**:
  - Private Express dashboard with `scrypt` hashed passwords, `HttpOnly` + Bearer session tokens, RBAC (`super_admin`, `editor`, `viewer`), CSRF checks, redacted logs, and zero public admin signup.
