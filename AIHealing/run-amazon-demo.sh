#!/bin/bash
# ============================================================================
# Amazon Demo Runner
# ============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║         🚀 AI-POWERED AUTO-HEALING QA AGENT                   ║"
echo "║                   Amazon Demo                                 ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check ChromaDB
echo "1. Checking ChromaDB..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "   ✅ ChromaDB is running"
else
    echo "   ❌ ChromaDB is not running!"
    echo ""
    echo "   Start ChromaDB first:"
    echo "   docker run -d -p 8000:8000 chromadb/chroma"
    echo ""
    exit 1
fi

# Check Gemini API Key
echo "2. Checking Gemini API Key..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "   ❌ GEMINI_API_KEY not set!"
    echo ""
    echo "   Set your API key:"
    echo "   export GEMINI_API_KEY='your-key-here'"
    echo ""
    exit 1
else
    echo "   ✅ Gemini API Key found"
fi

echo ""
echo "3. Select demo mode:"
echo "   [1] Single Run (Quick demo - ~2 minutes)"
echo "   [2] Healing Demo (Full demo with 2 runs - ~5 minutes)"
echo ""
read -p "   Enter choice [1 or 2]: " choice

echo ""
echo "4. Starting demo..."
echo ""

cd "$(dirname "$0")"

if [ "$choice" = "2" ]; then
    DEMO_MODE=healing npx tsx src/tasks/agent/demo-amazon.ts
else
    DEMO_MODE=single npx tsx src/tasks/agent/demo-amazon.ts
fi

echo ""
echo "Demo complete!"
