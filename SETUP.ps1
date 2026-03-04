# ============================================================================
# SETUP.ps1 — OpenClaw One-Click Setup, Install & Deploy
# KingsFromEarthDevelopment.com
# ============================================================================
# Usage: Double-click SETUP.bat  (or right-click this file → Run with PowerShell)
# ============================================================================

$ErrorActionPreference = "Stop"

# ── Paths ─────────────────────────────────────────────────────────────────────
$Root      = "c:\Users\user\.antigravity\openclaw vip secured version"
$NextDir   = "$Root\next-infastructure-scrapers"
$EnvFile   = "$Root\.env"
$NextEnv   = "$NextDir\.env.local"
$WSLRoot   = "/mnt/c/Users/user/.antigravity/openclaw vip secured version"
$WSLNext   = "$WSLRoot/next-infastructure-scrapers"

# ── Helpers ───────────────────────────────────────────────────────────────────
function Print-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║   OpenClaw — One-Click Setup & Deploy              ║" -ForegroundColor Cyan
    Write-Host "  ║   KingsFromEarthDevelopment.com                    ║" -ForegroundColor Cyan
    Write-Host "  ╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}
function Step($n, $msg) { Write-Host "`n  [$n] $msg" -ForegroundColor Yellow }
function OK($msg)        { Write-Host "  ✓  $msg"    -ForegroundColor Green  }
function ERR($msg)       { Write-Host "  ✗  $msg"    -ForegroundColor Red    }
function INFO($msg)      { Write-Host "     $msg"    -ForegroundColor Gray   }
function WslRun($cmd)    { wsl -d Debian -- bash -c $cmd; return $LASTEXITCODE }

# ── Load master .env ──────────────────────────────────────────────────────────
function Load-Env {
    $map = @{}
    if (-not (Test-Path $EnvFile)) { return $map }
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match '^\s*[#\s]' -or $line -notmatch '=') { continue }
        $parts = $line -split '=', 2
        $key   = $parts[0].Trim()
        $val   = ($parts[1] -split '#')[0].Trim()   # strip inline comments
        if ($key -and $val) { $map[$key] = $val }
    }
    return $map
}

# ── Sync keys from master .env → Next.js .env.local ──────────────────────────
function Sync-NextEnv($e) {
    $keys = @(
        "ANTHROPIC_API_KEY", "OPENAI_API_KEY",
        "NEXT_PUBLIC_STRIPE_PAYMENT_LINK", "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET",
        "SLACK_WEBHOOK_URL", "SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID", "SLACK_DEFAULT_CHANNEL",
        "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID",
        "DISCORD_WEBHOOK_URL", "DISCORD_BOT_TOKEN",
        "NEXT_PUBLIC_DOWNLOAD_WIN", "NEXT_PUBLIC_DOWNLOAD_MAC", "NEXT_PUBLIC_DOWNLOAD_LINUX",
        "SUPABASE_URL", "SUPABASE_ANON_KEY", "DATABASE_URL"
    )
    $lines = @("# Auto-synced from master .env by SETUP.ps1 — do not edit manually", "")
    $count = 0
    foreach ($k in $keys) {
        if ($e.ContainsKey($k) -and $e[$k]) { $lines += "$k=$($e[$k])"; $count++ }
    }
    $lines | Set-Content $NextEnv -Encoding UTF8
    return $count
}

# ════════════════════════════════════════════════════════════════════════════
Print-Header

# ── Step 1: Load .env ─────────────────────────────────────────────────────────
Step "1/6" "Loading master .env..."
$env = Load-Env
if ($env.Count -eq 0) {
    ERR ".env not found at: $EnvFile"
    Read-Host "Press Enter to exit"; exit 1
}
OK "Loaded $($env.Count) environment variables"

# ── Step 2: Check WSL ─────────────────────────────────────────────────────────
Step "2/6" "Checking WSL Debian..."
$wslTest = wsl -d Debian -- bash -c "echo ok" 2>$null
if ($wslTest -ne "ok") {
    ERR "WSL Debian not found."
    INFO "Fix: Open PowerShell as Admin and run:  wsl --install -d Debian"
    INFO "Then restart your PC and run SETUP.bat again."
    Read-Host "Press Enter to exit"; exit 1
}
$nodeVer = wsl -d Debian -- bash -c "node --version" 2>$null
if (-not $nodeVer -or $nodeVer -notmatch "v\d") {
    INFO "Installing Node.js 20 LTS in WSL..."
    WslRun("curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1 && sudo apt-get install -y nodejs >/dev/null 2>&1") | Out-Null
    $nodeVer = wsl -d Debian -- bash -c "node --version" 2>$null
}
wsl -d Debian -- bash -c "which sshpass >/dev/null 2>&1 || sudo apt-get install -y sshpass rsync >/dev/null 2>&1" | Out-Null
wsl -d Debian -- bash -c "which pm2 >/dev/null 2>&1 || sudo npm install -g pm2 >/dev/null 2>&1" | Out-Null
OK "WSL ready  |  Node $nodeVer"

# ── Step 3: Sync .env.local ───────────────────────────────────────────────────
Step "3/6" "Syncing environment to Next.js app..."
$synced = Sync-NextEnv $env
OK "Synced $synced keys → .env.local"

# Warn about missing critical keys
$critical = @{
    "ANTHROPIC_API_KEY"              = "AI chat assistant"
    "NEXT_PUBLIC_STRIPE_PAYMENT_LINK"= "Stripe buy button"
    "TELEGRAM_BOT_TOKEN"             = "Telegram notifications"
    "DISCORD_WEBHOOK_URL"            = "Discord notifications"
    "STRIPE_SECRET_KEY"              = "Stripe backend"
    "HOSTINGER_SSH_HOST"             = "SSH deploy"
}
$missing = $critical.GetEnumerator() | Where-Object { -not $env[$_.Key] }
if ($missing) {
    Write-Host "`n  ⚠  Not yet configured (add to .env to unlock):" -ForegroundColor DarkYellow
    $missing | ForEach-Object { Write-Host "     • $($_.Key)  → $($_.Value)" -ForegroundColor DarkYellow }
}

# ── Step 4: npm install ───────────────────────────────────────────────────────
Step "4/6" "Installing Node.js dependencies..."
$npmExit = WslRun("cd '$WSLNext' && npm install --legacy-peer-deps 2>&1 | tail -4")
if ($npmExit -ne 0) { ERR "npm install failed"; Read-Host "Press Enter"; exit 1 }
OK "Dependencies installed"

# ── Menu ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "  What do you want to do?"
Write-Host ""
Write-Host "  [1]  Start dev server  → http://localhost:3000" -ForegroundColor Cyan
Write-Host "  [2]  Build + Deploy    → KingsFromEarthDevelopment.com" -ForegroundColor Cyan
Write-Host "  [3]  Build only        → creates .next/standalone/ folder" -ForegroundColor Cyan
Write-Host "  [4]  Deploy only       → re-deploy last build (skip rebuild)" -ForegroundColor Cyan
Write-Host "  [Q]  Quit" -ForegroundColor DarkGray
Write-Host ""
$choice = Read-Host "  Enter choice"
if ($choice -eq "Q" -or $choice -eq "q") { exit 0 }

# ── Dev server ────────────────────────────────────────────────────────────────
if ($choice -eq "1") {
    Step "5/6" "Starting dev server..."
    wsl -d Debian -- bash -c "pkill -f 'next dev' 2>/dev/null; true" | Out-Null
    Start-Sleep -Seconds 1
    Start-Process powershell -ArgumentList "-NoProfile", "-Command",
        "wsl -d Debian -- bash -c `"cd '$WSLNext' && npm run dev`"" -WindowStyle Normal
    Start-Sleep -Seconds 14
    OK "Dev server running at http://localhost:3000"
    Start-Process "http://localhost:3000"
    Write-Host "`n  ✅ Done! Browser opening..." -ForegroundColor Green
    Read-Host "`n  Press Enter to close this window (server keeps running)"
    exit 0
}

# ── Build ─────────────────────────────────────────────────────────────────────
if ($choice -in @("2","3")) {
    Step "5/6" "Building Next.js (standalone Node.js bundle)..."
    INFO "This creates .next/standalone/ — a self-contained folder, no node_modules needed on server"
    $buildExit = WslRun("cd '$WSLNext' && npm run build 2>&1")
    if ($buildExit -ne 0) {
        ERR "Build failed — fix errors above, then run SETUP.bat again"
        Read-Host "Press Enter to exit"; exit 1
    }

    # Assemble the deployable bundle in .next/standalone/
    WslRun("cp -r '$WSLNext/public' '$WSLNext/.next/standalone/public' 2>/dev/null; true") | Out-Null
    WslRun("cp -r '$WSLNext/.next/static' '$WSLNext/.next/standalone/.next/static' 2>/dev/null; true") | Out-Null
    WslRun("cp '$WSLNext/server.js' '$WSLNext/.next/standalone/server.js' 2>/dev/null; true") | Out-Null
    WslRun("cp '$WSLNext/package.json' '$WSLNext/.next/standalone/package.json' 2>/dev/null; true") | Out-Null
    WslRun("cp '$WSLNext/.env.local' '$WSLNext/.next/standalone/.env' 2>/dev/null; true") | Out-Null

    $size = wsl -d Debian -- bash -c "du -sh '$WSLNext/.next/standalone' 2>/dev/null | cut -f1"
    OK "Build complete  |  Bundle size: $size  |  .next/standalone/"
}

# ── SSH Deploy ────────────────────────────────────────────────────────────────
if ($choice -in @("2","4")) {
    Step "6/6" "Deploying to Hostinger via SSH..."

    $sshHost = $env["HOSTINGER_SSH_HOST"]
    $sshPort = $env["HOSTINGER_SSH_PORT"]
    $sshUser = $env["HOSTINGER_SSH_USER"]
    $sshPass = $env["HOSTINGER_SSH_PASSWORD"]
    $domain  = $env["HOSTINGER_DOMAIN_1"] ?? "KingsFromEarthDevelopment.com"

    if (-not $sshHost -or -not $sshUser -or -not $sshPass) {
        ERR "SSH credentials missing in .env"
        INFO "Required: HOSTINGER_SSH_HOST, HOSTINGER_SSH_USER, HOSTINGER_SSH_PASSWORD"
        Read-Host "Press Enter to exit"; exit 1
    }

    INFO "Uploading to $sshUser@${sshHost}:${sshPort}..."
    INFO "Remote path: ~/domains/$domain/public_html/"

    $sshOpts = "-o StrictHostKeyChecking=no -o ConnectTimeout=30 -p $sshPort"

    # 1. Create remote directory
    $mkdirCmd = "sshpass -p '$sshPass' ssh $sshOpts ${sshUser}@${sshHost} 'mkdir -p ~/domains/$domain/public_html'"
    WslRun($mkdirCmd) | Out-Null

    # 2. rsync the standalone bundle
    $rsyncCmd = "sshpass -p '$sshPass' rsync -az --delete --progress -e 'ssh $sshOpts' '$WSLNext/.next/standalone/' '${sshUser}@${sshHost}:~/domains/$domain/public_html/'"
    $rsyncExit = WslRun($rsyncCmd)

    if ($rsyncExit -ne 0) {
        ERR "Upload failed. Check SSH credentials."
        INFO "Manual SSH: ssh -p $sshPort ${sshUser}@${sshHost}"
        Read-Host "Press Enter to exit"; exit 1
    }
    OK "Files uploaded"

    # 3. SSH in → npm install (production only) → restart with PM2
    $remoteCmd = @"
cd ~/domains/$domain/public_html && \
npm install --production --legacy-peer-deps --silent 2>&1 | tail -2 && \
export NODE_ENV=production PORT=3000 && \
pm2 describe openclaw > /dev/null 2>&1 \
  && pm2 restart openclaw --update-env \
  || pm2 start server.js --name openclaw --env production && \
pm2 save && \
echo 'OPENCLAW_LIVE'
"@
    $remoteCmd = $remoteCmd -replace "`r`n", " " -replace "`n", " "
    $sshRunCmd = "sshpass -p '$sshPass' ssh $sshOpts ${sshUser}@${sshHost} `"$remoteCmd`""
    $output = WslRun($sshRunCmd)

    if ($output -match "OPENCLAW_LIVE" -or $LASTEXITCODE -eq 0) {
        OK "App started on server with PM2"
        OK "Live at: https://$domain"
        Start-Process "https://$domain"
    } else {
        Write-Host "`n  ⚠  Deploy may have partially completed." -ForegroundColor DarkYellow
        INFO "SSH in manually to check: ssh -p $sshPort ${sshUser}@${sshHost}"
        INFO "Then run: cd ~/domains/$domain/public_html && pm2 start server.js --name openclaw"
    }
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "  ✅  All done!" -ForegroundColor Green
Write-Host ""
Write-Host "  Local:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Live:   https://KingsFromEarthDevelopment.com" -ForegroundColor Cyan
Write-Host ""
Read-Host "  Press Enter to close"
