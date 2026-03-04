#!/usr/bin/env python3
"""
Discord message sender for OpenClaw.
Uses Incoming Webhook — simple, no bot needed.

Credentials: DISCORD_WEBHOOK_URL
Create in Discord: Server Settings → Integrations → Webhooks → New Webhook
"""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tools.core.env import env, load_env

load_env()


def send_discord_message(
    text: str,
    webhook_url: str | None = None,
    username: str | None = None,
    embeds: list | None = None,
) -> dict:
    """
    Send a message via Discord webhook.
    """
    webhook_url = webhook_url or env("DISCORD_WEBHOOK_URL")

    if not webhook_url:
        raise ValueError(
            "Discord not configured. Set in .env:\n"
            "  DISCORD_WEBHOOK_URL - from Server Settings → Integrations → Webhooks"
        )

    payload: dict = {"content": text}
    if username:
        payload["username"] = username
    if embeds:
        payload["embeds"] = embeds

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return {"ok": resp.status in (200, 204), "status": resp.status}


def main():
    parser = argparse.ArgumentParser(description="Send a message to Discord")
    parser.add_argument("message", nargs="+", help="Message text (words joined)")
    parser.add_argument("-u", "--username", help="Override webhook username")
    args = parser.parse_args()

    text = " ".join(args.message)

    try:
        result = send_discord_message(text=text, username=args.username)
        if result.get("ok"):
            print("Message sent to Discord.")
        else:
            print(f"Discord API error: {result}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
