# WhatsApp + Ollama Auto-Reply Bot

A Node.js bot that connects to WhatsApp Web, listens for incoming messages, sends them to your local Ollama `gemma4:e4b` model, and auto-replies with the AI-generated response — all running 100% locally with no cloud APIs.

---

## User Review Required

> [!IMPORTANT]
> **Unofficial Library Risk**: `whatsapp-web.js` automates WhatsApp Web via Puppeteer. WhatsApp's ToS forbids automated bots on personal accounts. There is a small risk of a temporary ban if used heavily. For critical/commercial use, prefer the official WhatsApp Business API.

> [!WARNING]
> **Puppeteer / Chromium**: The library downloads a bundled Chromium. First-time install may take a few minutes and ~200MB of disk space. Make sure you have a stable internet connection during `npm install`.

---

## Open Questions

> [!IMPORTANT]
> **Reply Mode** — Which messages should the bot reply to?
> - **All messages** (every DM and group message)
> - **DM only** (skip group chats)
> - **Keyword trigger** (only reply if message starts with a keyword like `!ai`)
>
> The plan defaults to **DM only**. Let me know if you want a different mode.

> [!IMPORTANT]
> **System Prompt** — Should the bot have a custom personality / instructions? e.g. "You are a helpful assistant. Keep replies short."
>
> The plan includes a configurable system prompt in a `.env` file.

---

## Proposed Changes

### Project Structure

```
whatsapp/
├── index.js          # Main bot entry point
├── ollama.js         # Ollama API wrapper
├── config.js         # Config loader
├── .env              # Environment variables (model, system prompt, mode)
├── .env.example      # Template for .env
├── .gitignore
└── package.json
```

---

### `package.json`

```json
{
  "name": "whatsapp-ollama-bot",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "whatsapp-web.js": "^1.26.0",
    "qrcode-terminal": "^0.12.0",
    "dotenv": "^16.4.5"
  }
}
```

---

### `.env` (configurable settings)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `gemma4:e4b` | Model to use |
| `SYSTEM_PROMPT` | *(default assistant prompt)* | Bot persona |
| `REPLY_MODE` | `dm` | `all` / `dm` / `keyword` |
| `TRIGGER_KEYWORD` | `!ai` | Used when REPLY_MODE=keyword |
| `CONTEXT_WINDOW` | `10` | Number of previous messages to include for context |

---

### `index.js` — Main Bot

#### [NEW] [index.js](file:///c:/Users/r123t/Documents/www/whatsapp/index.js)

- Initializes `whatsapp-web.js` client with `LocalAuth` (session persisted to `.wwebjs_auth/`)
- Displays QR code in terminal on first run
- Logs connection status with timestamps
- Listens for `message_create` events
- Filters based on `REPLY_MODE`
- Maintains per-chat conversation history (last N messages) for context
- Calls `ollama.js` with history, shows `typing...` indicator while waiting
- Sends AI response back to the chat
- Handles errors gracefully (if Ollama is down, sends a friendly fallback message)

---

### `ollama.js` — Ollama API Wrapper

#### [NEW] [ollama.js](file:///c:/Users/r123t/Documents/www/whatsapp/ollama.js)

- Calls `POST http://localhost:11434/api/chat` (chat endpoint — supports conversation history)
- Sends messages array (system + history + new message)
- Uses `stream: false`
- Returns the assistant response string

---

### `config.js` — Config Loader

#### [NEW] [config.js](file:///c:/Users/r123t/Documents/www/whatsapp/config.js)

- Loads `.env` with `dotenv`
- Exports typed config object with defaults

---

## Verification Plan

### Automated Tests
- Run `node -e "require('./config.js'); console.log('Config OK')"` to verify config loads.
- Run `node -e "const o = require('./ollama.js'); o.chat([{role:'user',content:'hi'}]).then(console.log)"` to verify Ollama connectivity.

### Manual Verification
1. Run `npm install` — confirm no errors.
2. Run `node index.js` — confirm QR code appears in terminal.
3. Scan QR with WhatsApp → phone → **Linked Devices → Link a Device**.
4. Send yourself a message from another number → confirm AI reply arrives.
5. Stop and restart `node index.js` → confirm it reconnects **without** re-scanning QR (session persistence).
