#!/bin/bash
# ============================================================
# VoxCode — Hostinger VPS First-Time Setup Script
# Run this ONCE on your Hostinger server via SSH:
#   bash setup-hostinger.sh
# ============================================================
set -e

APP_DIR="${HOME}/voxcode"
REPO="https://github.com/LORDBurnItUp/openclaw.git"

echo ""
echo "================================================"
echo "  VoxCode — Hostinger Setup"
echo "================================================"
echo ""

# 1. Install Node.js 20 (if not present)
if ! command -v node &>/dev/null; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "==> Node.js $(node -v) already installed."
fi

# 2. Install PM2 globally
if ! command -v pm2 &>/dev/null; then
  echo "==> Installing PM2..."
  npm install -g pm2
else
  echo "==> PM2 $(pm2 -v) already installed."
fi

# 3. Clone the repo
if [ -d "$APP_DIR/.git" ]; then
  echo "==> Repo already cloned. Pulling latest..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "==> Cloning repo to $APP_DIR..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 4. Install deps + build
echo "==> Installing dependencies..."
npm ci --omit=dev

echo "==> Building VoxCode..."
npm run build

# 5. Create .env.local if it doesn't exist
if [ ! -f "$APP_DIR/.env.local" ]; then
  echo "==> Creating .env.local template..."
  cat > "$APP_DIR/.env.local" << 'EOF'
# VoxCode Environment Variables
NODE_ENV=production
PORT=3000

# Stripe payment link (from your Stripe dashboard)
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/YOUR_LINK_HERE

# Anthropic API key (for AI chat assistant)
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
EOF
  echo "   EDIT $APP_DIR/.env.local with your real keys before starting!"
fi

# 6. Start with PM2
echo "==> Starting VoxCode with PM2..."
cd "$APP_DIR"
pm2 delete voxcode 2>/dev/null || true
NODE_ENV=production pm2 start server.js --name voxcode --update-env
pm2 save
pm2 startup

echo ""
echo "================================================"
echo "  VoxCode is running!"
echo ""
echo "  App dir:  $APP_DIR"
echo "  PM2 name: voxcode"
echo "  Port:     3000"
echo ""
echo "  Next steps:"
echo "  1. Edit $APP_DIR/.env.local with your keys"
echo "  2. pm2 restart voxcode"
echo "  3. Point your domain to this server in Hostinger DNS"
echo "  4. Set up Nginx reverse proxy (port 80 -> 3000)"
echo "================================================"
echo ""
