#!/usr/bin/env python3
"""
Telegram message sender for OpenClaw.
Uses Telegram Bot API — no extra deps.

Credentials: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
Create bot via @BotFather, get chat_id from getUpdates after messaging your bot.
"""

import argparse
import sys
import urllib.parse
import urllib.request
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tools.core.env import env, load_env

load_env()


def send_telegram_message(
    text: str,
    chat_id: str | None = None,
    token: str | None = None,
    parse_mode: str | None = None,
) -> dict:
    """
    Send a message via Telegram Bot API.
    """
    token = token or env("TELEGRAM_BOT_TOKEN")
    chat_id = chat_id or env("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        raise ValueError(
            "Telegram not configured. Set in .env:\n"
            "  TELEGRAM_BOT_TOKEN - from @BotFather\n"
            "  TELEGRAM_CHAT_ID - your chat id (numeric or @username)"
        )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {"chat_id": chat_id, "text": text}
    if parse_mode:
        data["parse_mode"] = parse_mode

    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return {"ok": True, "status": resp.status}


def main():
    parser = argparse.ArgumentParser(description="Send a message to Telegram")
    parser.add_argument("message", nargs="+", help="Message text (words joined)")
    parser.add_argument("-c", "--chat", help="Override chat_id")
    parser.add_argument("--html", action="store_true", help="Parse as HTML")
    args = parser.parse_args()

    text = " ".join(args.message)
    parse_mode = "HTML" if args.html else None

    try:
        result = send_telegram_message(text=text, chat_id=args.chat, parse_mode=parse_mode)
        if result.get("ok"):
            print("Message sent to Telegram.")
        else:
            print(f"Telegram API error: {result}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
