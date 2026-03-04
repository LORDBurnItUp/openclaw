# OpenClaw Dashboard — Step-by-Step Setup

Follow these steps to get the app running and see the **floating status** on your desktop so you know it’s on and working.

---

## Step 1: Install Node.js (if needed)

1. Download **Node.js 18+** from [https://nodejs.org](https://nodejs.org).
2. Run the installer and finish the setup.
3. Open a **new** Command Prompt or PowerShell and run:
   ```bash
   node -v
   npm -v
   ```
   You should see version numbers.

---

## Step 2: Install the app dependencies

1. Open **Command Prompt** (Win+R → type `cmd` → Enter).
2. Go to the project folder:
   ```bash
   cd "C:\Users\user\.antigravity\openclaw vip secured version\next-infastructure-scrapers"
   ```
3. Install packages:
   ```bash
   npm install
   ```
   Wait until it finishes (no errors).

---

## Step 3: (Optional) Add messaging credentials

To use the Integrations panel (Slack, Telegram, Discord):

1. In the same folder, create a file named **`.env.local`** (no name before the dot).
2. Add any of these lines (use your real values):
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```
3. Save the file. You can leave this step for later if you only want to see the app and floating status.

---

## Step 4: Start the app

1. In **Command Prompt**, from the same folder, run:
   ```bash
   node node_modules\next\dist\bin\next dev
   ```
   *(If `npm run dev` works in your terminal, you can use that instead.)*

2. Wait until you see something like:
   ```
   ▲ Next.js 16.x.x
   - Local:    http://localhost:3000
   ✓ Ready
   ```

3. Leave this window **open** while you use the app.

---

## Step 5: Open the app and see the floating status

1. Open your browser (Chrome, Edge, Firefox).
2. Go to: **http://localhost:3000**
3. You should see:
   - The main dashboard (hero, Integrations, Voxcode console, etc.).
   - A **floating status pill** at the **top-left**: **“OpenClaw • Live”** with a green pulsing dot.
   - A **floating mic** button (bottom-right) for Voxcode.

**That floating “OpenClaw • Live” pill is your on-screen proof the app is running.** Drag it to any corner; click the ▼ to open “Open in small window” so you can keep a small window on your desktop.

---

## Step 6: Use a small window on the desktop (optional)

To keep a **small window** on your desktop so you can see the status without a full browser tab:

1. With the app open at http://localhost:3000, click **“Open in small window”** in the floating status (or the link in the status pill).
2. Or: right-click the page → “Open in new window” → resize the window to a small strip and place it where you want.
3. The floating status pill stays visible in that window so you can see **OpenClaw • Live** on your desktop.

---

## Quick reference

| What you want              | What to do |
|----------------------------|------------|
| Start the app              | `cd next-infastructure-scrapers` then `node node_modules\next\dist\bin\next dev` |
| Open the app               | Browser → http://localhost:3000 |
| See that it’s running      | Look at the **“OpenClaw • Live”** floating pill (drag it if needed) |
| Send Slack/Telegram/Discord| Use the Integrations panel; add keys in `.env.local` first |
| Stop the app               | In the terminal where it’s running, press **Ctrl+C** |

---

## Troubleshooting

- **“npm is not recognized”**  
  Use **Command Prompt** (not only PowerShell), or reinstall Node.js and restart the PC.

- **“next is not recognized”**  
  Run: `node node_modules\next\dist\bin\next dev` from the `next-infastructure-scrapers` folder.

- **Floating pill not visible**  
  Refresh the page (F5). It’s at the bottom-left by default; drag the page to find it or scroll down.

- **Port 3000 in use**  
  Next.js will offer another port (e.g. 3001). Use the URL it prints (e.g. http://localhost:3001).
