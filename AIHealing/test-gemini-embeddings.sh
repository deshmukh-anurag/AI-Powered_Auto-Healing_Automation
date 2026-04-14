#!/bin/bash
# Test Gemini Embeddings Integration
# This script runs a quick test to verify Gemini embeddings are working

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Gemini Embeddings Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ ERROR: GEMINI_API_KEY not found"
    echo ""
    echo "Please set your Gemini API key:"
    echo "  export GEMINI_API_KEY='your-key-here'"
    echo ""
    echo "Get a free key at: https://aistudio.google.com/app/apikey"
    exit 1
fi

echo "✅ GEMINI_API_KEY: Found (${GEMINI_API_KEY:0:10}...)"
echo ""

# Run the test
echo "🚀 Running embedding tests..."
echo ""

npx tsx src/tasks/agent/test-gemini-embeddings.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ All tests passed!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo "  1. Start ChromaDB: docker run -d -p 8000:8000 chromadb/chroma"
    echo "  2. Run Amazon demo: ./run-amazon-demo.sh"
    echo ""
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Tests failed!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 1
fi
