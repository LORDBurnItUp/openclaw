# ⚡ OPENCLAW — THE VOICE THAT WRITES PRODUCTION CODE

> **You talk. It ships.** Not toy demos. Not code snippets. Real, repo-aware, IDE-ready,
> self-correcting code that compiles on the first try. Every time. **$1/month.**

---

## WE BUILT WHAT NOBODY ELSE WOULD

Voice coding tools were supposed to revolutionize software engineering.
Instead, they gave you:

→ Garbage transcripts that look like drunk autocorrect
→ Generic code that doesn't know a Prisma schema from a TODO list
→ 500ms+ latency that breaks your flow state
→ Zero error correction — you fix the mess yourself

**OpenClaw is none of that.**

---

## THIS IS THE WEAPON

- **Sub-200ms voice latency** — feels like thinking out loud
- **Repo DNA** — reads your codebase first, writes code that actually fits
- **Error Shield** — auto-fixes syntax, types, and imports before they land in your editor
- **Claude-powered AI** — Anthropic's best model, 200K context, under the hood
- **IDE native** — VS Code, JetBrains, Neovim, Cursor — not a browser tab
- **$1/month** — less than a pack of gum. Zero excuses.

---

## THE ARCHITECTURE

| Component         | Technology                             |
|-------------------|----------------------------------------|
| Voice engine      | Real-time WebRTC stream               |
| AI core           | Anthropic Claude (200K context)       |
| IDE integration   | VS Code · JetBrains · Neovim         |
| Framework         | Next.js 16 + React 19                 |
| 3D UI             | Three.js + React Three Fiber          |
| Styling           | Tailwind CSS v4                       |
| Payments          | Stripe + PayPal                       |
| CLI terminal      | Custom in-browser CLI (try `>_`)      |
| Infrastructure    | Hostinger VPS · PM2 · Node.js 20      |

---

## QUICK START (LOCAL)

```bash
npm install --legacy-peer-deps
npm run dev
# → http://localhost:3000
```

Or double-click **`SETUP.bat`** (Windows) for one-click install + deploy.

---

## DEPLOY TO PRODUCTION

### Option A — GitHub Auto-Deploy (Recommended)
1. Push to `LORDBurnItUp/openclaw` (already configured)
2. Hostinger hPanel → Git → connect this repo
3. Set: startup file `server.js`, Node.js `20.x`
4. Build command: `npm install --legacy-peer-deps && npm run build`
5. Add env vars: `NODE_ENV=production`, `PORT=3000`

### Option B — One-Click (SETUP.bat)
1. Fill `.env` with credentials
2. Double-click `SETUP.bat` → pick **[2] Build + Deploy**

### Option C — SSH
```bash
git clone https://github.com/LORDBurnItUp/openclaw.git
cd openclaw
npm install --legacy-peer-deps && npm run build
pm2 start server.js --name openclaw
```

---

## ENVIRONMENT VARIABLES

```env
# Required
NODE_ENV=production
PORT=3000

# AI
ANTHROPIC_API_KEY=

# Payments
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=
STRIPE_SECRET_KEY=

# Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
```

---

## IN-BROWSER CLI

Press **`Ctrl+\``** or click the **`>_`** button (bottom-left) to open the terminal.

```
goto features   — teleport to features section
goto pricing    — teleport to pricing
buy             — open payment
login           — go to account dashboard
status          — system health check
help            — list all commands
```

---

**`Ctrl+Shift+V`** — toggle voice anywhere, system-wide

---

© 2026 Kings From Earth Development — Built for engineers who ship.
