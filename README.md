# NEXORA BOT — Modular WhatsApp Educational AI Assistant

**NEXORA BOT** is an Arabic-first WhatsApp educational platform built with **Node.js ES Modules**, **Baileys (`@whiskeysockets/baileys`)**, **SQLite (`better-sqlite3`)**, a 9-plugin architecture (`index.js` -> `main.js` -> `handler.js` -> `plugins/`), and a private Express admin console (`/admin`).

> **Important Technical & Legal Notice:**
> This project connects to WhatsApp Web multi-device via **Baileys**, which is an **unofficial integration** (not the official Meta Cloud API). Protocol changes or WhatsApp terms enforcement may affect availability or require re-pairing.

---

## Key Features

- **8-Digit WhatsApp Pairing Code (No QR):** Prints the pairing code strictly in the private server console, persists credentials atomically under `data/auth`, prevents duplicate sockets, and halts reconnection cleanly on `401 / loggedOut` without touching user data in SQLite.
- **9-Section Interactive Menu + Numbered Fallback:** Sends Baileys native `interactiveMessage` (`single_select` lists and `quick_reply` buttons when `WHATSAPP_INTERACTIVE_MENUS=true`) with automatic fallback to clean Arabic numbered menus, persistent multi-level `رجوع` / `رئيسية` / `إلغاء` / `مساعدة` navigation, pagination (`page:next` / `page:prev`), and code-block-aware message splitting.
- **Conversational AI Tutor (Gemini):** Uses `@google/genai` (`gemini-4-hydrogen` default with dedicated Gemini 4 `systemInstruction` length guidance instead of `maxOutputTokens` truncation), tracks per-user level (`beginner` / `intermediate` / `advanced`) and explicit learning-memory consent (`memory_consent`), and reports missing keys or upstream errors honestly instead of fabricating canned answers.
- **Independent Multi-Source Research Engine (`SEARCH_PROVIDER=multi`):** Aggregates DuckDuckGo web results, MDN Web Docs API, curated internal knowledge, and optional Wikipedia with SSRF protection and explicit URL citations.
- **Complete Language Academy:** **English, Japanese, Russian, and Chinese** — **20+ structured beginner lessons per language** (4 units each = 80+ beginner lessons) plus intermediate/advanced lessons, multi-question quizzes, SM-2 spaced repetition (SRS), and mistake review.
- **Complete 3-Tier Programming Academy:** Ordered **Beginner → Intermediate → Advanced** tracks for **Python, HTML, CSS, JavaScript, and Node.js**, including code examples, expected outputs, common mistakes, hands-on exercises, capstone `project` lessons, level filtering, quizzes, mistake review, and static-only code debugging help.
- **Creative Studio (`plugins/creative.js` & `lib/creative/index.js`):** Modular image generation (`gemini` via `@google/genai` `gemini-3.1-flash-lite-image` or `openai`) with aspect-ratio presets, prompt safety filtering, MIME validation (`image/png`, `image/jpeg`, `image/webp`), 5MB limit, per-user rate limiting, temporary media cleanup, and WhatsApp image delivery.
- **Visual Design Reference:** Dark-midnight / deep-violet / cyan chat UI specification available at [`docs/design/nexora-mobile-menu-mockup.jpg`](docs/design/nexora-mobile-menu-mockup.jpg).
- **Privacy-First Admin Console:** Private Express dashboard with RBAC (`super_admin`, `editor`, `viewer`). Private user conversations are never exposed to admins.

---

## Requirements & API Keys Matrix

| Capability | Works Without External API Key | External API Key Needed |
|---|---|---|
| WhatsApp 8-digit pairing & 9-section interactive routing | Yes (`WHATSAPP_NUMBER` required) | None |
| Language & 3-tier Programming Academies + SRS + Mistake Review | Yes (SQLite curriculum & quizzes) | None |
| Legal Anime & Open-Knowledge Library + Progress Tracking | Yes (SQLite catalog & stats) | None |
| Multi-Source Research (`SEARCH_PROVIDER=multi`) | Yes (DuckDuckGo + MDN + Curated DB + Wikipedia) | `serper` / `brave` require `SEARCH_API_KEY` |
| Conversational AI Assistant & AI Tutor | Honest unavailable notice shown | `AI_API_KEY` or `GEMINI_API_KEY` (with `AI_PROVIDER=gemini`) |
| Voice Pronunciation (`TTS_PROVIDER`) | Text pronunciation guide shown | `elevenlabs` / `openai` require `TTS_API_KEY` |
| Creative Studio (`IMAGE_PROVIDER`) | Honest setup guide shown | `IMAGE_API_KEY` (or `GEMINI_API_KEY` when `IMAGE_PROVIDER=gemini`) |

---

## Quick Start

- **Runtime:** Node.js **20.0.0+** (tested on Node.js 22 LTS).

```bash
npm install
cp .env.example .env
npm run setup
npm start
```

### Pterodactyl / NexoPanel Deployment
- **Entry Point:** `index.js`
- **Startup Command:** `npm start`
- **Health Endpoint:** `GET /health`
- **Admin Dashboard:** `http://<host>:<port>/admin` (create the initial super-admin account on first boot; public bootstrap locks automatically afterward).

### Verification Commands

```bash
npm run check   # Syntax validation & ESM import verification across all source & test files
npm run build   # Verify & prepare static admin dashboard assets in dist/public/admin
npm test        # Run the full automated node:test suite
```
