#!/usr/bin/env bash
# ============================================================================
# HEALING DEMO — Controlled two-run showcase
# ============================================================================
# This script orchestrates the full "selector breaks → AI heals it" demo
# against the local demo-site.
#
# Prereqs:
#   - Node 18+
#   - ChromaDB running on default port 8000
#   - GEMINI_API_KEY in env (or fallback GROQ_API_KEY)
#
# Usage:
#   ./demo-site/demo-healing.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
DEMO_PORT="${DEMO_PORT:-4500}"
DEMO_URL="http://localhost:${DEMO_PORT}"

cyan()   { printf "\033[36m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

hr() { printf "\033[90m%s\033[0m\n" "────────────────────────────────────────────────────────────"; }

trap 'on_exit' EXIT
DEMO_PID=""
on_exit() {
  if [[ -n "${DEMO_PID}" ]] && kill -0 "${DEMO_PID}" 2>/dev/null; then
    yellow "Stopping demo-site (pid ${DEMO_PID})..."
    kill "${DEMO_PID}" 2>/dev/null || true
    wait "${DEMO_PID}" 2>/dev/null || true
  fi
}

# ---------------------------------------------------------------------------
# 1. Start the demo site if it isn't already running
# ---------------------------------------------------------------------------
bold ""
bold "╔═══════════════════════════════════════════════════════════════╗"
bold "║            🧪 HEALING DEMO — CONTROLLED RUN                   ║"
bold "╚═══════════════════════════════════════════════════════════════╝"
bold ""

hr
cyan "Phase 1/5 — Starting demo site"
hr

if curl -fsS "${DEMO_URL}/version" >/dev/null 2>&1; then
  green "✅ Demo site already up at ${DEMO_URL}"
else
  yellow "Starting demo site on port ${DEMO_PORT}..."
  node "${SCRIPT_DIR}/server.cjs" >/tmp/demo-site.log 2>&1 &
  DEMO_PID=$!
  # wait for it to come up (up to ~5s)
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "${DEMO_URL}/version" >/dev/null 2>&1; then break; fi
    sleep 0.5
  done
  if ! curl -fsS "${DEMO_URL}/version" >/dev/null 2>&1; then
    red "❌ Demo site failed to start — see /tmp/demo-site.log"
    exit 1
  fi
  green "✅ Demo site up (pid ${DEMO_PID}) — logs: /tmp/demo-site.log"
fi

# ---------------------------------------------------------------------------
# 2. Force clean v1 state
# ---------------------------------------------------------------------------
hr
cyan "Phase 2/5 — Resetting to v1 (clean selectors)"
hr
curl -fsS "${DEMO_URL}/set/v1" >/dev/null
green "✅ Demo site on /v1  (#search-input, .product-card, .add-cart-btn)"

# ---------------------------------------------------------------------------
# 3. Run 1 — learning phase
# ---------------------------------------------------------------------------
hr
cyan "Phase 3/5 — RUN 1: Agent learns selectors"
hr
bold "Goal: Search for 'headphones' and add the first result to the cart"
echo ""
yellow "Tip: watch the browser window + live UI logs."
echo ""

cd "${REPO_ROOT}"
HEALING_DEMO_URL="${DEMO_URL}" \
HEALING_DEMO_SUITE_ID="demo-healing-run-1" \
HEALING_DEMO_CLEAR=1 \
  npx tsx "${SCRIPT_DIR}/run-demo.ts" \
    "${DEMO_URL}" \
    "Search for 'headphones' and click Add to Cart on the first result." \
    || { red "❌ Run failed"; exit 1; }

green ""
green "✅ Run 1 complete — golden states saved to vector DB"
echo ""

# ---------------------------------------------------------------------------
# 4. Break selectors by toggling to v2
# ---------------------------------------------------------------------------
hr
yellow "Phase 4/5 — 💥 Breaking selectors (toggle → v2)"
hr
BEFORE=$(curl -fsS "${DEMO_URL}/version")
curl -fsS "${DEMO_URL}/toggle" >/dev/null
AFTER=$(curl -fsS "${DEMO_URL}/version")
echo "     before: ${BEFORE}"
echo "     after : ${AFTER}"
red "⚠️  Selectors just changed:"
echo "       #search-input   → #productSearchField"
echo "       .product-card   → .item-tile"
echo "       .add-cart-btn   → .btn-add-item"
echo ""
yellow "Pause for presentation — press ENTER to run the agent again..."
read -r _

# ---------------------------------------------------------------------------
# 5. Run 2 — healing in action
# ---------------------------------------------------------------------------
hr
cyan "Phase 5/5 — RUN 2: Healing engages"
hr
bold "Same goal, broken selectors. Watch the logs for:"
echo "   🔧 Healer: ..."
echo "   ✅ Selector healed via text-similarity (92.3% confidence)"
echo ""

HEALING_DEMO_URL="${DEMO_URL}" \
HEALING_DEMO_SUITE_ID="demo-healing-run-1" \
  npx tsx "${SCRIPT_DIR}/run-demo.ts" \
    "${DEMO_URL}" \
    "Search for 'headphones' and click Add to Cart on the first result." \
    || { red "❌ Run 2 failed"; exit 1; }

green ""
green "═══════════════════════════════════════════════════════════════"
green "  🎉 DEMO COMPLETE"
green "═══════════════════════════════════════════════════════════════"
green ""
green "  Run 1: Agent learned 3 selectors on /v1"
green "  Run 2: /v2 broke them — agent healed them without human help"
green ""
green "  Keep this browser/logs open for Q&A."
green ""
