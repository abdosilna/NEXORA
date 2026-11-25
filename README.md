# NEXORA BOT — Modular WhatsApp Educational AI Assistant

**NEXORA BOT** is an Arabic-first WhatsApp educational platform built with **Node.js ES Modules**, **Baileys (`@whiskeysockets/baileys`)**, **SQLite (`better-sqlite3`)**, a plugin/command architecture inspired by modular WhatsApp bots (`index.js` -> `main.js` -> `handler.js` -> `plugins/`), and a dedicated Express + React admin console.

> **Important Technical & Legal Notice:**
> This project connects to WhatsApp Web multi-device via **Baileys**, which is an **unofficial integration** (not the official Meta Cloud API). Protocol changes or WhatsApp terms enforcement may affect availability or require re-pairing.

---

## Key Features

- **8-Digit WhatsApp Pairing Code (No QR):** Prints the pairing code strictly in the private server console, persists credentials atomically under `data/auth`, prevents duplicate sockets, and halts reconnection cleanly on `401 / loggedOut` without touching user data in SQLite.
- **Native Interactive Menus + Numbered Fallback:** Sends Baileys interactive list/button messages (`WHATSAPP_INTERACTIVE_MENUS=true`) with automatic fallback to clean Arabic numbered menus, persistent multi-level `رجوع` / `رئيسية` / `إلغاء` navigation, and code-block-aware message splitting.
- **Conversational AI Tutor (Gemini):** Uses `@google/genai` (`gemini-4-hydrogen` default), tracks per-user level (`beginner` / `intermediate` / `advanced`) and explicit learning-memory consent (`memory_consent`), and reports missing keys or upstream errors honestly instead of fabricating canned answers.
- **Independent Multi-Source Research Engine (`SEARCH_PROVIDER=multi`):** Aggregates DuckDuckGo web results, MDN Web Docs API, internal curated knowledge, and optional Wikipedia with explicit URL citations and verification notes.
- **Complete Language Academy:** **English, Japanese, Russian, and Chinese** — **20+ structured beginner lessons per language** (4 units each = 80+ beginner lessons total) plus intermediate/advanced lessons, multi-question quizzes, spaced repetition (SRS), and mistake review.
- **Complete Programming Academy:** Ordered tracks for **Python, JavaScript, HTML, CSS, and Node.js**, including code examples, expected outputs, common mistakes, hands-on exercises, small capstone projects, quizzes, mistake review, and static-only code debugging help.

---

## Requirements & API Keys Matrix

| Capability | Works Without External API Key | External API Key Needed |
|---|---|---|
| WhatsApp 8-digit pairing & menu routing | Yes (`WHATSAPP_NUMBER` required) | None |
| Language & Programming Academies + SRS + Mistake Review | Yes (SQLite curriculum & quizzes) | None |
| Multi-Source Research (`SEARCH_PROVIDER=multi`) | Yes (DuckDuckGo + MDN + Curated DB + Wikipedia) | `serper` / `brave` require `SEARCH_API_KEY` |
| Conversational AI Assistant & AI Tutor | Honest unavailable notice shown | `AI_API_KEY` or `GEMINI_API_KEY` (with `AI_PROVIDER=gemini`) |
| Voice Pronunciation (`TTS_PROVIDER`) | Text pronunciation guide shown | `elevenlabs` / `openai` require `TTS_API_KEY` |

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
npm run check   # Syntax validation across all source & test files
npm run build   # Build the React/Vite admin dashboard
npm test        # Run the full automated test suite
```
