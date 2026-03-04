#!/usr/bin/env python3
"""
Slack message sender for OpenClaw.
Supports both Incoming Webhooks and Bot Token (full API).

Credentials: SLACK_WEBHOOK_URL (simplest) or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID
"""

import argparse
import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tools.core.env import env, load_env

load_env()


def send_via_webhook(webhook_url: str, text: str, blocks: list | None = None) -> dict:
    """Send message via Incoming Webhook (simplest method)."""
    import urllib.request

    payload = {"text": text}
    if blocks:
        payload["blocks"] = blocks

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return {"ok": resp.status == 200, "status": resp.status}


def send_via_bot_token(token: str, channel: str, text: str, blocks: list | None = None) -> dict:
    """Send message via Slack Web API (Bot Token)."""
    import urllib.request

    url = "https://slack.com/api/chat.postMessage"
    payload = {"channel": channel, "text": text}
    if blocks:
        payload["blocks"] = blocks

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode())
        return body


def send_slack_message(
    text: str,
    channel: str | None = None,
    blocks: list | None = None,
    webhook_url: str | None = None,
    bot_token: str | None = None,
) -> dict:
    """
    Send a message to Slack.
    Uses webhook if provided, otherwise bot token + channel.
    """
    webhook_url = webhook_url or env("SLACK_WEBHOOK_URL")
    bot_token = bot_token or env("SLACK_BOT_TOKEN")
    channel = channel or env("SLACK_CHANNEL_ID") or env("SLACK_DEFAULT_CHANNEL")

    if webhook_url:
        return send_via_webhook(webhook_url, text, blocks)

    if bot_token and channel:
        return send_via_bot_token(bot_token, channel, text, blocks)

    raise ValueError(
        "Slack credentials not configured. Set either:\n"
        "  - SLACK_WEBHOOK_URL (easiest: create at api.slack.com/messaging/webhooks)\n"
        "  - SLACK_BOT_TOKEN + SLACK_CHANNEL_ID (e.g. C01234ABCD or #general)"
    )


def main():
    parser = argparse.ArgumentParser(description="Send a message to Slack")
    parser.add_argument("message", nargs="+", help="Message text (words joined)")
    parser.add_argument("-c", "--channel", help="Override channel (for bot token)")
    parser.add_argument("--block", action="append", help="Add a block (JSON) for rich formatting")
    args = parser.parse_args()

    text = " ".join(args.message)
    blocks = None
    if args.block:
        blocks = [json.loads(b) for b in args.block]

    try:
        result = send_slack_message(text=text, channel=args.channel, blocks=blocks)
        if result.get("ok"):
            print("Message sent to Slack.")
        else:
            print(f"Slack API error: {result}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
