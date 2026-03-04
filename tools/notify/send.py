#!/usr/bin/env python3
"""
Unified notify for OpenClaw — sends to all configured channels (Slack, Telegram).
Use this when you want OpenClaw to message you; it goes to whatever you have set up.
"""

import argparse
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tools.core.env import env, load_env

load_env()


def notify(text: str, slack: bool = True, telegram: bool = True, discord: bool = True) -> dict:
    """
    Send message to all configured services.
    Returns {"slack": ok|skip|error, "telegram": ..., "discord": ...}
    """
    results = {}

    if slack:
        try:
            from tools.slack.send_message import send_slack_message

            send_slack_message(text)
            results["slack"] = "ok"
        except ValueError:
            results["slack"] = "skip"
        except Exception as e:
            results["slack"] = f"error: {e}"

    if telegram:
        try:
            from tools.telegram.send_message import send_telegram_message

            send_telegram_message(text)
            results["telegram"] = "ok"
        except ValueError:
            results["telegram"] = "skip"
        except Exception as e:
            results["telegram"] = f"error: {e}"

    if discord:
        try:
            from tools.discord.send_message import send_discord_message

            send_discord_message(text)
            results["discord"] = "ok"
        except ValueError:
            results["discord"] = "skip"
        except Exception as e:
            results["discord"] = f"error: {e}"

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Send message to Slack and/or Telegram (whichever is configured)"
    )
    parser.add_argument("message", nargs="+", help="Message text")
    parser.add_argument("--slack-only", action="store_true", help="Only Slack")
    parser.add_argument("--telegram-only", action="store_true", help="Only Telegram")
    parser.add_argument("--discord-only", action="store_true", help="Only Discord")
    args = parser.parse_args()

    text = " ".join(args.message)
    use_slack = not args.telegram_only and not args.discord_only
    use_telegram = not args.slack_only and not args.discord_only
    use_discord = not args.slack_only and not args.telegram_only

    results = notify(text, slack=use_slack, telegram=use_telegram, discord=use_discord)

    ok = [k for k, v in results.items() if v == "ok"]
    skip = [k for k, v in results.items() if v == "skip"]
    err = [k for k, v in results.items() if v.startswith("error")]

    if ok:
        print(f"Sent to: {', '.join(ok)}")
    if skip:
        print(f"Skipped (not configured): {', '.join(skip)}")
    if err:
        for k, v in results.items():
            if v.startswith("error"):
                print(f"{k}: {v}", file=sys.stderr)
        sys.exit(1)

    if not ok:
        print("No messaging services configured. Set Slack, Telegram, or Discord in .env", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
