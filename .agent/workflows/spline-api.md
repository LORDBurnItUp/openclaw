---
description: How to use the Spline Real-time API system in OpenClaw
---

# Spline Real-time API — Workflow

## Architecture
The Spline Real-time API system has 3 layers:
1. **API Proxy** (`/api/spline`) — 5 channels that Spline scenes call via Real-time API
2. **Webhook Receiver** (`/api/spline/webhook`) — receives Spline webhook events
3. **SplineAPIManager** — floating control panel for monitoring + testing

## Available Channels

| Channel | Description | Example Payload |
|---------|-------------|-----------------|
| `status` | System health, uptime, memory | `{}` |
| `weather` | Live weather from wttr.in | `{"city": "London"}` |
| `ai-text` | Text generation via Claude | `{"prompt": "Hello", "maxTokens": 200}` |
| `scene-vars` | Get/set Spline variables | `{"set": [{"name":"x","type":"string","value":"y"}]}` |
| `openclaw` | OpenClaw command processor | `{"command": "status"}` |

## Configuring in Spline Editor

1. Open your Spline scene
2. Go to **Variables & Data Panel** → **APIs** tab → **New API**
3. Set method to **POST** and URL to `https://your-domain.com/api/spline`
4. Add header: `Content-Type: application/json`
5. Set body to JSON with the channel and payload
6. Set **Request on Start**: Yes (for auto-loading data)
7. Configure **API Updated Event** to map response data to scene variables

## Testing Locally

// turbo
1. Start the dev server: `cd next-infastructure-scrapers && npm run dev`

// turbo
2. Run the test suite: `node /tmp/test-spline-api.js`

3. Open http://localhost:3000 and click the 🎨 button (bottom-left) to open the API Manager panel.

## Environment Variables (in `.env.local`)
```
SPLINE_WEBHOOK_SECRET=           # Optional: validates webhook payloads
SPLINE_SCENE_URL=                # Your Spline scene URL
WEATHER_API_URL=https://wttr.in  # Weather data source
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Key Files
- `app/lib/spline-api.ts` — Types, validation, variable store
- `app/api/spline/route.ts` — Main API proxy (GET + POST)
- `app/api/spline/webhook/route.ts` — Webhook receiver
- `app/components/SplineAPIManager.tsx` — Floating control panel
- `app/components/SplineIntro.tsx` — Spline scene with Code API integration
