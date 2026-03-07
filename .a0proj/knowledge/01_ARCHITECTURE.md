# CORE ARCHITECTURE: VOXCODE/OPENCLAW

## 1. The Next.js Infrastructure
Location: `/next-infastructure-scrapers`

### Spline Integration (`SplineAPIManager` / `SplineIntro`)
- Pushes live code metrics and data into 3D Spline scenes using the Real-Time API.
- Handled primarily by `app/api/spline/route.ts` which proxies data out of the system.
- Receives Spline triggers back into the application via Webhooks (`app/api/spline/webhook/route.ts`).

### The Futuristic Login Dashboard (`login/page.tsx`)
- Triggering "Enter Black Hole" collapses the UI into a singularity.
- A 12-tab system dynamically generates visual flair.
- Uses WebRTC for 10-camera setups with 'WebcamArena', defaulting AI Agent Douglas to slot 1.
- Animated using raw vanilla CSS keyframes (Matrix drops, sweeps, synapse pulses).

## 2. Voxcode Core
Location: `/voxcode`

### AI Module (`voxcode/src/voxcode/ai`)
- Integrations managed through `LiteLLMProvider` connected natively to Ollama, OpenAI, Anthropic, Bedrock, Gemini, etc.
- Environment configurations managed via `.env` and loaded securely through `validation.py`.

### Memory Architecture
- Relentlessly backed by `tools/memory/heartbeat.py` to index logs, conversations, and codebase context utilizing `chromadb`.
- Designed to literally "never forget" a user instruction.

## 3. Tool Ecosystem
Location: `/tools`
- Army deployment scripts exist here.
- Automation for Slack/Telegram orchestration and deployments to VPS/Hostinger. 

Use this data contextually across all your maneuvers and system generations. OpenClaw relies on dynamic visual brilliance fused seamlessly with brutal backend efficiency.
