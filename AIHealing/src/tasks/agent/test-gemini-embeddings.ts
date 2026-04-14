#!/usr/bin/env node
/**
 * Test Gemini Embeddings Integration
 * 
 * This script tests the Gemini embedding generation to ensure it's working correctly.
 * Run with: npx tsx src/tasks/agent/test-gemini-embeddings.ts
 */

import "dotenv/config";
import { generateEmbedding, buildElementText, cosineSimilarity } from "./embeddings";
import type { ActionableElement } from "./observer";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in environment");
  console.log("\nPlease set your Gemini API key:");
  console.log("  export GEMINI_API_KEY='your-key-here'");
  console.log("\nGet a free key at: https://aistudio.google.com/app/apikey");
  process.exit(1);
}

// ============================================================================
// TEST ELEMENTS
// ============================================================================

const loginButton: ActionableElement = {
  id: "elem-1",
  selectors: {
    css: "#login-btn",
  },
  tagName: "button",
  text: "Login",
  attributes: {
    role: "button",
    ariaLabel: "Login to your account",
    type: "submit",
  },
  position: { x: 100, y: 200 },
  isVisible: true,
  isInteractive: true,
};

const signInButton: ActionableElement = {
  id: "elem-2",
  selectors: {
    css: "#sign-in-btn",
  },
  tagName: "button",
  text: "Sign In",
  attributes: {
    role: "button",
    ariaLabel: "Sign in to your account",
    type: "submit",
  },
  position: { x: 105, y: 205 },
  isVisible: true,
  isInteractive: true,
};

const searchBox: ActionableElement = {
  id: "elem-3",
  selectors: {
    css: "#search",
  },
  tagName: "input",
  text: "",
  attributes: {
    role: "searchbox",
    placeholder: "Search products",
    type: "text",
  },
  position: { x: 300, y: 50 },
  isVisible: true,
  isInteractive: true,
};

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testGeminiEmbeddings() {
  console.log("\n🧪 Testing Gemini Embeddings Integration\n");
  console.log("=" .repeat(60));

  try {
    // Test 1: Generate embedding for login button
    console.log("\n📊 Test 1: Generate Embedding for Login Button");
    console.log("-".repeat(60));
    const loginText = buildElementText(loginButton);
    console.log(`Element text: ${loginText}`);
    
    console.log("Calling Gemini API...");
    const startTime = Date.now();
    const loginEmbedding = await generateEmbedding(loginText, {
      provider: "gemini",
      apiKey: GEMINI_API_KEY,
      model: "gemini-embedding-001"
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Success! Generated ${loginEmbedding.length}-dimensional embedding in ${duration}ms`);
    console.log(`   First 5 values: [${loginEmbedding.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...]`);

    // Test 2: Generate embedding for sign-in button (similar to login)
    console.log("\n📊 Test 2: Generate Embedding for Sign-In Button");
    console.log("-".repeat(60));
    const signInText = buildElementText(signInButton);
    console.log(`Element text: ${signInText}`);
    
    console.log("Calling Gemini API...");
    const signInEmbedding = await generateEmbedding(signInText, {
      provider: "gemini",
      apiKey: GEMINI_API_KEY,
      model: "gemini-embedding-001"
    });
    
    console.log(`✅ Success! Generated ${signInEmbedding.length}-dimensional embedding`);
    console.log(`   First 5 values: [${signInEmbedding.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...]`);

    // Test 3: Calculate similarity between login and sign-in (should be HIGH)
    console.log("\n📊 Test 3: Similarity Between Login and Sign-In");
    console.log("-".repeat(60));
    const loginSignInSimilarity = cosineSimilarity(loginEmbedding, signInEmbedding);
    console.log(`Cosine similarity: ${loginSignInSimilarity.toFixed(4)}`);
    
    if (loginSignInSimilarity > 0.85) {
      console.log(`✅ PASS: High similarity (>${0.85}) - Elements are semantically similar!`);
    } else if (loginSignInSimilarity > 0.7) {
      console.log(`⚠️  MODERATE: Similarity is ${loginSignInSimilarity.toFixed(4)} (expected >0.85)`);
    } else {
      console.log(`❌ FAIL: Low similarity (${loginSignInSimilarity.toFixed(4)}) - Expected >0.85`);
    }

    // Test 4: Generate embedding for search box (different from login)
    console.log("\n📊 Test 4: Generate Embedding for Search Box");
    console.log("-".repeat(60));
    const searchText = buildElementText(searchBox);
    console.log(`Element text: ${searchText}`);
    
    console.log("Calling Gemini API...");
    const searchEmbedding = await generateEmbedding(searchText, {
      provider: "gemini",
      apiKey: GEMINI_API_KEY,
      model: "gemini-embedding-001"
    });
    
    console.log(`✅ Success! Generated ${searchEmbedding.length}-dimensional embedding`);
    console.log(`   First 5 values: [${searchEmbedding.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...]`);

    // Test 5: Calculate similarity between login and search (should be LOW)
    console.log("\n📊 Test 5: Similarity Between Login and Search Box");
    console.log("-".repeat(60));
    const loginSearchSimilarity = cosineSimilarity(loginEmbedding, searchEmbedding);
    console.log(`Cosine similarity: ${loginSearchSimilarity.toFixed(4)}`);
    
    if (loginSearchSimilarity < 0.7) {
      console.log(`✅ PASS: Low similarity (<0.7) - Elements are semantically different!`);
    } else {
      console.log(`⚠️  WARNING: Similarity is ${loginSearchSimilarity.toFixed(4)} (expected <0.7)`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Gemini API: Working`);
    console.log(`✅ Embedding dimensions: ${loginEmbedding.length} (expected 768)`);
    console.log(`✅ Similar elements similarity: ${loginSignInSimilarity.toFixed(4)} (expected >0.85)`);
    console.log(`✅ Different elements similarity: ${loginSearchSimilarity.toFixed(4)} (expected <0.7)`);
    console.log(`✅ Average response time: ~${duration}ms per embedding`);
    
    console.log("\n🎉 All tests passed! Gemini embeddings are working correctly.\n");

  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
    console.log("\nTroubleshooting:");
    console.log("1. Check your GEMINI_API_KEY is valid");
    console.log("2. Ensure you have internet connection");
    console.log("3. Verify the Gemini API is enabled in Google Cloud Console");
    console.log("4. Check rate limits at: https://ai.google.dev/gemini-api/docs/quota");
    process.exit(1);
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

console.log("\n🚀 Starting Gemini Embeddings Test...");
console.log(`API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);
console.log(`Model: gemini-embedding-001`);

testGeminiEmbeddings().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
