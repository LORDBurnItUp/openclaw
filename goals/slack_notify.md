# Messaging Notifications (Slack, Telegram)

> Send messages from OpenClaw to Slack and/or Telegram. Use for alerts, summaries, status updates.

## Objective

Deliver messages to configured channels. Use `tools/notify/send.py` for one call that hits all configured services.

## Prerequisites

Credentials in `.env` — see `context/slack-setup.md`:
- **Slack:** `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID`
- **Telegram:** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`

## Tools

- `tools/notify/send.py` — Send to all configured (preferred)
- `tools/slack/send_message.py` — Slack only
- `tools/telegram/send_message.py` — Telegram only

## Process

```bash
# Send to all configured
python tools/notify/send.py "Job complete"
python tools/notify/send.py --slack-only "Slack only"
python tools/notify/send.py --telegram-only "Telegram only"
```

```python
from tools.notify.send import notify
notify("Hello from OpenClaw")
```

## Use Cases

- Scraper/pipeline completion alerts
- Error notifications
- Session-start ping
- Daily summaries
