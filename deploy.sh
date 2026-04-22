#!/bin/bash
# ─── E-ARI Deploy Script ──────────────────────────────────────────────────────
# Usage: sh deploy.sh
# Deploy: tar -xzf e-ari-project.tar.gz && npm install && npm run build && sh deploy.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e

echo "=== E-ARI Deploy Script v5.3 ==="

# ── 1. Build ──────────────────────────────────────────────────────────────────
echo "[1/4] Installing dependencies..."
npm install --production=false

echo "[2/4] Building project..."
npm run build

# ── 2. Configure Environment ─────────────────────────────────────────────────
echo "[3/4] Configuring environment..."
cd next-service-dist

export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}"
if [ -z "$NEXTAUTH_URL" ]; then
  if [ -n "$SANDBOX_DOMAIN" ]; then
    export NEXTAUTH_URL="https://$SANDBOX_DOMAIN"
  else
    export NEXTAUTH_URL="http://localhost:3000"
  fi
fi

# ── 3. Init Database ─────────────────────────────────────────────────────────
echo "[4/4] Initializing database..."
export DATABASE_URL="file:$(pwd)/../db/custom.db"
mkdir -p "$(pwd)/../db"
touch "$(pwd)/../db/custom.db"
cd .. && npx prisma db push --skip-generate 2>/dev/null || true && cd next-service-dist

# ── 4. Start Server ──────────────────────────────────────────────────────────
echo "=== Starting E-ARI on port ${PORT} ==="
node --max-old-space-size=192 --optimize-for-size server.js &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# Wait for readiness
sleep 8

# ── FC Platform: Start Caddy as main process ─────────────────────────────────
if [ -n "$CADDY_PORT" ] || [ -f "../Caddyfile" ]; then
  echo "FC platform detected — starting Caddy on CADDY_PORT=${CADDY_PORT:-9000}"
  cd ..
  export PORT="${CADDY_PORT:-9000}"
  exec caddy run --config Caddyfile --adapter caddyfile
else
  # Local / Docker: Keep Node.js as main process
  wait $NEXT_PID
fi
