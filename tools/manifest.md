  # Tools Manifest

> Master list of all available tools. Check here before writing new scripts.

## Messaging (`tools/notify/`, `tools/slack/`, `tools/telegram/`, `tools/discord/`)

| Tool | Description |
|------|-------------|
| `notify/send.py` | Send to all configured (Slack + Telegram + Discord) |
| `slack/send_message.py` | Slack only |
| `telegram/send_message.py` | Telegram only |
| `discord/send_message.py` | Discord only |

### Quick usage

```bash
python tools/notify/send.py "OpenClaw alert: job done"
python tools/notify/send.py --discord-only "Discord only"
```

### Credentials (in `.env`)

**Slack:** `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID`  
**Telegram:** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`  
**Discord:** `DISCORD_WEBHOOK_URL` — Server Settings → Integrations → Webhooks

---

## Deploy (`tools/`)

| Tool | Description |
|------|-------------|
| `deploy_hostinger.py` | Build static export of OpenClaw and FTP upload to Hostinger /public_html/ |

---

## Core Infrastructure (`tools/core/`)

| Tool | Description |
|------|-------------|
| `env.py` | Environment variable loader - reads .env file, no dependencies |
| `hostinger.py` | FTP upload and MySQL database operations for Hostinger hosting |

### Usage Examples

```python
# Load environment variables
from tools.core.env import env, load_env
load_env()
api_key = env("ANTHROPIC_API_KEY")
hostinger_config = env.group("HOSTINGER")  # Get all HOSTINGER_* vars

# Upload to Hostinger
from tools.core.hostinger import ftp_upload, db_query
ftp_upload("dist/index.html", "/public_html/index.html")
results = db_query("SELECT * FROM users")
```

---

## Memory Tools (`tools/memory/`)

| Tool | Description |
|------|-------------|
| `memory_read.py` | Reads memory context (MEMORY.md, logs, database entries) |
| `memory_write.py` | Writes events, facts, and updates to memory system |
| `memory_db.py` | Direct database operations (search, query, manage entries) |
| `semantic_search.py` | Vector-based semantic search across memory |
| `hybrid_search.py` | Combined keyword + semantic search for best results |
| `embed_memory.py` | Generates embeddings for memory entries |

## UI/UX Design Tools (`.shared/ui-ux-pro-max/`)

| Tool | Description |
|------|-------------|
| `scripts/search.py` | Main CLI for design system generation and domain searches |
| `scripts/core.py` | BM25 + regex hybrid search engine |
| `scripts/design_system.py` | Design system generator with reasoning rules |

### Data Files

| File | Content |
|------|---------|
| `data/styles.csv` | 50+ UI styles (glassmorphism, minimalism, etc.) |
| `data/colors.csv` | 97 color palettes by product type |
| `data/typography.csv` | 57 font pairings with Google Fonts imports |
| `data/ux-guidelines.csv` | 99 UX best practices and anti-patterns |
| `data/charts.csv` | 25 chart types with library recommendations |
| `data/landing.csv` | Landing page structures and CTA strategies |
| `data/products.csv` | Product type recommendations |
| `data/ui-reasoning.csv` | Design reasoning rules for auto-selection |
| `data/stacks/*.csv` | Stack-specific guidelines (12 stacks) |

## VoxCode (`voxcode/`)

Open-source voice coding assistant - a Wispr Flow alternative with AI superpowers.

| Module | Description |
|--------|-------------|
| `src/voxcode/core/` | Core engine, config, and event system |
| `src/voxcode/voice/` | Whisper transcription, audio recording, VAD |
| `src/voxcode/intelligence/` | Code analysis with tree-sitter |
| `src/voxcode/commands/` | Natural language command parsing |
| `src/voxcode/ai/` | LLM integration (Ollama, OpenAI, Anthropic) |
| `src/voxcode/ide/` | IDE adapters (VS Code, system-wide) |
| `src/voxcode/ui/` | System tray and hotkey management |
| `src/voxcode/cli.py` | Command-line interface |

---

## Revenue Tools (`tools/revenue/`)

| Tool | Description |
|------|-------------|
| `revenue/track.py` | Log revenue events (amount, source, plan) to SQLite `data/activity.db` with Slack notification |

---

## Payments (`tools/payments/`)

| Tool | Description |
|------|-------------|
| `payments/stripe_checkout.py` | Create Stripe Checkout Session for a given price ID and redirect URL |
| `payments/stripe_webhook.py` | Handle Stripe webhook events (payment_intent.succeeded, customer.subscription.*) |
| `payments/stripe_portal.py` | Generate Stripe Customer Portal link for self-serve plan management |

> Note: Stripe is installed via npm (`stripe ^20.4.0`). Python scripts use Stripe REST API via requests + `.env` `STRIPE_SECRET_KEY`.

---

## Context Files (`context/`)

| File | Description |
|------|-------------|
| `context/monetization_strategy.md` | Domain knowledge: revenue layers, pricing psychology, AdSense benchmarks, Stripe architecture, fast money shortcuts |

---

*Add new tools to this manifest as they are created.*
