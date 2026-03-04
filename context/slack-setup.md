# Messaging Setup (Slack + Telegram)

Add to your `.env` file. Use one or both.

## Slack

**Option A — Webhook (simplest):**
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

**Option B — Bot token:**
```
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_ID=#general
```

Create at [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks) or [api.slack.com/apps](https://api.slack.com/apps).

---

## Telegram

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
```

1. Message [@BotFather](https://t.me/botfather) → `/newbot` → get token  
2. Message your bot, then: `curl "https://api.telegram.org/bot<TOKEN>/getUpdates"` → use `chat.id` from response

---

---

## Discord

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
```

1. In your Discord server: **Server Settings** → **Integrations** → **Webhooks** → **New Webhook**
2. Choose the channel, name the webhook (e.g. "OpenClaw"), copy the webhook URL

---

## Test

```bash
# Send to all configured services
python tools/notify/send.py "OpenClaw test"
```

**Dashboard:** Run `npm run dev` in `next-infastructure-scrapers`, open the Integrations panel, type a message and Send.
