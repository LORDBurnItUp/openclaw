# Persistent Memory

> This file contains curated long-term facts, preferences, and context that persist across sessions.
> The AI reads this at the start of each session. You can edit this file directly.

## Session-Start Protocol (Autologon Rhythm)

**At the start of every session, the AI MUST:**

1. **Load memory** — Read this file and today's log `memory/logs/YYYY-MM-DD.md`
2. **Resume context** — Briefly summarize where we left off based on recent logs
3. **Ask the user** — Present options and ask: *"What should we do at this instant? Here are some options:"*
   - List 2–4 relevant next actions (from last session, current goals, or common tasks)
   - Include: "Or tell me what you'd like to do."
4. **Never assume** — Wait for user direction before executing

## Core Philosophy

- **NEVER sell agents. SELL INFRASTRUCTURE.**
- Agents = one-time value, no moat. Infrastructure = recurring revenue, defensible, scalable.
- Every app built must answer: "How does this become recurring revenue?"
- The GOTCHA framework itself is a sellable product. Package and sell the system, not just the output.

## User Preferences

- Direct communication, no fluff
- Build infrastructure-first, monetize immediately (Stripe + AdSense before launch)
- Use GOTCHA framework for all new systems
- Always notify via Slack/Telegram on important events: `python tools/notify/send.py "message"`

## Key Facts

- **Project**: OpenClaw VIP Secured Version
- **Framework**: GOTCHA (Goals, Orchestration, Tools, Context, Hardprompts, Args)
- **Tech stack**: Next.js 14 (app router), TypeScript, Python tools, SQLite databases
- **Hosting**: Hostinger (FTP deploy via `tools/deploy_hostinger.py`)
- **Payments**: Stripe already installed (`package.json` has `stripe ^20.4.0`)
- **Messaging**: Slack + Telegram + Discord via `python tools/notify/send.py "message"`
- **Python path**: Use `pythoncore-3.14-64` for packages if standard Python fails
- **Data**: SQLite DBs in `data/memory.db` and `data/activity.db`

## Current Projects

### OpenClaw VIP — Main Infrastructure Platform

- Full Next.js landing page at `next-infastructure-scrapers/`
- Components: Navbar, HeroSection, Pricing, Footer, FGWallet, DouglasCam, CinematicIntro, etc.
- **Status**: Landing page built, needs Stripe checkout wired + AdSense added
- **Revenue target**: Stripe subscriptions (VIP monthly/annual)

### VoxCode — Voice Coding Assistant

- Built at `voxcode/` — Whisper voice-to-code, multi-language, AI integration
- Landing page at `landing/voxcode/`
- **Status**: Built and ready for installation/productization
- **Revenue target**: SaaS subscription, sell as open-source + premium tier

### GOTCHA Framework — Sellable Template

- The entire system architecture is itself a product
- **Revenue target**: Gumroad/Lemonsqueezy one-time template sale
- **Status**: Needs packaging + sales page

## Revenue Streams (Active + Planned)

| Stream | Platform | Status | Goal |
|--------|----------|--------|------|
| VIP Subscriptions | Stripe | Needs wiring | $97/mo |
| Ad Revenue | Google AdSense | Needs setup | Passive |
| API Access | Stripe Metered | Planned | Per-call billing |
| Framework Template | Gumroad/LemonSqueezy | Planned | $297 one-time |

## Monetization Setup Rules

1. Stripe FIRST — payment flow before launch, always
2. AdSense on ALL public pages — `ADSENSE_PUBLISHER_ID` in `.env`
3. Track all revenue events in `data/activity.db`
4. Alert via `python tools/notify/send.py "💰 Payment: $X"` on every transaction

## Tools Available

- `python tools/notify/send.py "msg"` — Send to all channels
- `python tools/deploy_hostinger.py` — Deploy to Hostinger
- `python tools/memory/memory_read.py --format markdown` — Read memory
- `python tools/memory/memory_write.py --content "x" --type fact` — Write memory

## Learned Behaviors

- Always check `tools/manifest.md` before creating new scripts
- Follow GOTCHA framework: Goals, Orchestration, Tools, Context, Hardprompts, Args
- Verify tool output format before chaining into another tool
- Never assume APIs support batch operations — check first
- When a workflow fails mid-execution, preserve intermediate outputs before retrying
- Read the full goal before starting a task — don't skim
- **NEVER DELETE YOUTUBE VIDEOS** — irreversible, ask 3x before proceeding
- Use correct Python path (`pythoncore-3.14-64`) if standard Python fails
- Wire Stripe + AdSense to EVERY app before shipping, not after

## Technical Context

- Framework: GOTCHA (6-layer agentic architecture)
- See `CLAUDE.md` for full system handbook
- See `goals/manifest.md` for available workflows
- See `tools/manifest.md` for available tools
- See `context/monetization_strategy.md` for revenue domain knowledge

---

*Last updated: 2026-03-04*
*This file is the source of truth for persistent facts. Edit directly to update.*

- **Automated Heartbeat (2026-03-06 22:08:43)**: I am still here, alive and monitoring. Cycle 10 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:09:16)**: I am still here, alive and monitoring. Cycle 10 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:18:45)**: I am still here, alive and monitoring. Cycle 20 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:19:18)**: I am still here, alive and monitoring. Cycle 20 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:28:48)**: I am still here, alive and monitoring. Cycle 30 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:29:21)**: I am still here, alive and monitoring. Cycle 30 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:38:50)**: I am still here, alive and monitoring. Cycle 40 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:39:23)**: I am still here, alive and monitoring. Cycle 40 completed. No anomalies detected.
- **Automated Heartbeat (2026-03-06 22:48:53)**: I am still here, alive and monitoring. Cycle 50 completed. No anomalies detected.