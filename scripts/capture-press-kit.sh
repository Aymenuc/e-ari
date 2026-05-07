#!/usr/bin/env bash
# Captures the E-ARI press kit — high-res screenshots of every public
# screen, ready to be handed to a video-generation agent (Sora, Veo,
# Runway, Kling, etc.) as B-roll source material.
#
# Output: press-kit/screens/NN-name.png  — 2560×1600, ready for cinema.
#
# Usage: bash scripts/capture-press-kit.sh
# Requires: Google Chrome installed at the standard macOS path.

set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="${BASE_URL:-https://www.e-ari.com}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/press-kit/screens"

mkdir -p "$OUT"

# Width × height for cinema-grade stills — 16:10, plenty of pixel real
# estate for the video agent to crop, pan, and Ken-Burns over.
W=2560
H=1600

# Wait long enough for Framer Motion entry animations + lazy images.
WAIT=4000

shoot() {
  local name="$1" url="$2"
  local out="$OUT/${name}.png"
  echo "  → ${name}"
  "$CHROME" \
    --headless=new --disable-gpu --hide-scrollbars \
    --window-size="${W},${H}" \
    --force-device-scale-factor=1.5 \
    --virtual-time-budget="${WAIT}" \
    --screenshot="$out" \
    "${BASE}${url}" 2>/dev/null
}

shoot_tall() {
  # Taller capture for screens that genuinely scroll — useful for cinematic
  # vertical pans.
  local name="$1" url="$2" tall_h="$3"
  local out="$OUT/${name}.png"
  echo "  → ${name} (tall ${tall_h}px)"
  "$CHROME" \
    --headless=new --disable-gpu --hide-scrollbars \
    --window-size="${W},${tall_h}" \
    --force-device-scale-factor=1.5 \
    --virtual-time-budget="${WAIT}" \
    --screenshot="$out" \
    "${BASE}${url}" 2>/dev/null
}

echo "Capturing E-ARI press kit → $OUT"
echo ""

# ── Hero / marketing ─────────────────────────────────────────────────
shoot      "01-home-hero"                "/"
shoot_tall "02-home-methodology-pillars" "/" 6000
shoot_tall "03-home-agentic-pipeline"    "/" 8000
shoot_tall "04-home-scoring-pipeline"    "/" 7500
shoot      "05-pricing-hero"             "/pricing"
shoot_tall "06-pricing-tiers"            "/pricing" 4500

# ── Public product pages ─────────────────────────────────────────────
shoot      "07-discovery-marketing"      "/discovery"
shoot      "08-literacy-hub"             "/literacy"
shoot      "09-handbook-page"            "/handbook"
shoot_tall "10-handbook-body"            "/handbook" 6500
shoot      "11-contact-page"             "/contact"

# ── Auth surfaces (visual variety) ───────────────────────────────────
shoot      "12-auth-login"               "/auth/login"
shoot      "13-auth-register"            "/auth/register"

# ── Legal / trust signals ────────────────────────────────────────────
shoot      "14-privacy-page"             "/privacy"
shoot      "15-terms-page"               "/terms"

echo ""
echo "✅ Press kit captured at $OUT"
ls -la "$OUT" | tail -20
