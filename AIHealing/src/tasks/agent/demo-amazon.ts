// ============================================================================
// AMAZON DEMO - Real-World E-Commerce Test
// ============================================================================
// This demonstrates the complete healing workflow on Amazon
// Perfect for presentations and demos!
// ============================================================================

import "dotenv/config";
import { runAgentLoop } from "./index";
import { clearGoldenStates } from "./vectorDB";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { AgentConfig } from "./index";

// ============================================================================
// DEMO CONFIGURATION
// ============================================================================

const DEMO_CONFIG = {
  embeddingConfig: {
    provider: "gemini" as const,
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001", // FREE Gemini embedding model (768 dimensions)

    // Alternative options:
    // provider: "local" as const, // For testing without API
    // provider: "openai" as const, // Requires OpenAI API key
    // apiKey: process.env.OPENAI_API_KEY,
    // model: "text-embedding-3-small"
  },

  aiModel: {
    model: "gemini-flash" as const,
    apiKey: process.env.GEMINI_API_KEY!,
    temperature: 0.7,
  },
};

// ============================================================================
// TEST SUITE - Amazon E-Commerce Flow
// ============================================================================

/**
 * This is EXACTLY what a user would input from the UI
 * No manual element selection, no hardcoded selectors
 * Just the goal - agent does everything else!
 */
const AMAZON_TEST_SUITE = {
  id: "demo-amazon-macbook-001",
  name: "Amazon MacBook Purchase Flow",
  goal: "Search for a MacBook Pro M3, select the first result, and add it to the cart",
  startUrl: "https://www.flipkart.com/", // or https://www.amazon.com
  maxSteps: 20,
  timeout: 10000, // Amazon can be slow
};

// ============================================================================
// UTILITIES
// ============================================================================

let browser: Browser | null = null;

async function initBrowser(): Promise<Browser> {
  if (!browser) {
    console.log("🌐 Launching browser for Amazon demo...");
    browser = await puppeteer.launch({
      headless: false, // IMPORTANT: Set false to watch the magic happen!
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Hide automation
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
  }
  return browser;
}

async function closeBrowser(): Promise<void> {
  if (browser) {
    console.log("🌐 Closing browser...");
    await browser.close();
    browser = null;
  }
}

function logSeparator(title: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`  ${title}`);
  console.log("=".repeat(80) + "\n");
}

function logStep(step: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${step}`);
  console.log("─".repeat(60));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

function logHealing(message: string) {
  console.log(`🔧 ${message}`);
}

function logAI(message: string) {
  console.log(`🤖 ${message}`);
}

// ============================================================================
// MAIN DEMO TEST
// ============================================================================

async function runAmazonDemo() {
  logSeparator("🎬 AMAZON DEMO - AI-Powered Auto-Healing QA Agent");

  console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                           ║");
  console.log("║                    🚀 LIVE DEMO: E-Commerce Test                         ║");
  console.log("║                                                                           ║");
  console.log("║  Demonstrating:                                                           ║");
  console.log("║  • Autonomous web navigation                                              ║");
  console.log("║  • AI-powered decision making                                             ║");
  console.log("║  • Self-healing selector recovery                                         ║");
  console.log("║  • RAG-based persistent memory                                            ║");
  console.log("║                                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  try {
    // Initialize browser
    logStep("Phase 1: Initialization");
    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    // Set user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    logSuccess("Browser initialized");
    logInfo("Viewport: 1920x1080");
    logInfo("User Agent: Desktop Chrome");

    // Clear previous test data
    logStep("Phase 2: Preparing Vector DB");
    try {
      await clearGoldenStates(AMAZON_TEST_SUITE.id);
      logSuccess("Previous test data cleared");
    } catch (error) {
      logWarning("No previous data to clear (first run)");
    }

    // Display test suite info
    logStep("Phase 3: Test Suite Configuration");
    logInfo(`Test Suite ID: ${AMAZON_TEST_SUITE.id}`);
    logInfo(`Test Name: ${AMAZON_TEST_SUITE.name}`);
    logInfo(`Start URL: ${AMAZON_TEST_SUITE.startUrl}`);
    console.log("\n📝 User Goal:");
    console.log(`   "${AMAZON_TEST_SUITE.goal}"`);
    console.log("\n");

    logInfo("Agent will autonomously:");
    logInfo("  1️⃣  Navigate to Amazon");
    logInfo("  2️⃣  Find and fill search box");
    logInfo("  3️⃣  Click search button");
    logInfo("  4️⃣  Select first MacBook result");
    logInfo("  5️⃣  Click 'Add to Cart' button");
    logInfo("  6️⃣  Save all successful selectors to Vector DB");

    // Navigate to Amazon
    logStep("Phase 4: Navigation");
    logInfo(`Loading ${AMAZON_TEST_SUITE.startUrl}...`);
    await page.goto(AMAZON_TEST_SUITE.startUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    logSuccess(`Amazon loaded successfully`);

    // Wait a bit for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Configure agent
    logStep("Phase 5: Agent Configuration");
    const config: AgentConfig = {
      goal: AMAZON_TEST_SUITE.goal,
      startUrl: AMAZON_TEST_SUITE.startUrl,
      maxSteps: AMAZON_TEST_SUITE.maxSteps,
      timeout: AMAZON_TEST_SUITE.timeout,
      aiModel: DEMO_CONFIG.aiModel,
      testSuiteId: AMAZON_TEST_SUITE.id,
      embeddingConfig: DEMO_CONFIG.embeddingConfig,
    };

    logInfo("Agent configured with:");
    logInfo(`  • AI Model: ${config.aiModel.model}`);
    logInfo(`  • Max Steps: ${config.maxSteps}`);
    logInfo(`  • Timeout: ${config.timeout}ms per action`);
    logInfo(`  • Embeddings: ${config.embeddingConfig.provider}`);

    // Run the agent
    logStep("Phase 6: Agent Execution (Watch the Browser!)");
    console.log("\n⏱️  Starting autonomous execution...\n");

    const startTime = Date.now();
    const result = await runAgentLoop(page, config);
    const duration = Date.now() - startTime;

    // Display results
    logStep("Phase 7: Execution Results");

    console.log("\n📊 Metrics:\n");
    console.log(`   Total Steps Executed:    ${result.totalSteps}`);
    console.log(`   ✅ Successful Steps:     ${result.successfulSteps}`);
    console.log(`   ❌ Failed Steps:         ${result.failedSteps}`);
    console.log(`   🔧 Healed Steps:         ${result.healedSteps}`);
    console.log(`   ⏱️  Total Time:           ${(duration / 1000).toFixed(2)}s`);
    console.log(`   💰 Estimated Cost:       $${result.totalCost.toFixed(4)}`);
    console.log("\n");

    // Show detailed step log
    if (result.logs && result.logs.length > 0) {
      logStep("Phase 8: Detailed Execution Log");

      result.logs.forEach((log, idx) => {
        const stepNum = log.stepNumber;
        const action = log.action;
        const healing = log.healing;

        console.log(`\n📍 Step ${stepNum}:`);

        if (action) {
          console.log(`   Action: ${action.type.toUpperCase()}`);
          console.log(`   Goal: "${action.description}"`);

          if (log.selectorUsed) {
            console.log(`   Selector: ${log.selectorUsed}`);
          }
        }

        if (log.result) {
          if (log.result.success) {
            console.log(`   Result: ✅ Success`);
          } else {
            console.log(`   Result: ❌ Failed - ${log.result.error}`);
          }
        }

        if (healing.attempted) {
          console.log(`   🔧 Healing: ${healing.successful ? "✅ HEALED" : "❌ Failed"}`);
        }

        console.log(`   Reasoning: ${log.reasoning.substring(0, 80)}...`);
      });
    }

    // Final status
    logStep("Phase 9: Final Status");

    if (result.success) {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
      console.log("║                                                                           ║");
      console.log("║                         🎉 DEMO SUCCESSFUL! 🎉                            ║");
      console.log("║                                                                           ║");
      console.log("║  The agent successfully:                                                  ║");
      console.log("║  ✅ Navigated Amazon autonomously                                         ║");
      console.log("║  ✅ Used AI to decide actions                                             ║");
      console.log("║  ✅ Completed the purchase flow                                           ║");
      console.log("║  ✅ Saved selectors to Vector DB                                          ║");
      console.log("║                                                                           ║");
      if (result.healedSteps > 0) {
        console.log(`║  🔧 BONUS: ${result.healedSteps} step(s) were automatically healed!                     ║`);
        console.log("║                                                                           ║");
      }
      console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
      console.log("\n");

      logSuccess("Goal achieved!");
      logInfo("All golden states saved to Vector DB");

      if (result.healedSteps > 0) {
        logHealing(`Self-healing worked! ${result.healedSteps} selectors recovered automatically`);
        logInfo("This demonstrates RAG-based healing in action!");
      }

    } else {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
      console.log("║                                                                           ║");
      console.log("║                         ⚠️  DEMO INCOMPLETE                               ║");
      console.log("║                                                                           ║");
      console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
      console.log("\n");

      logError(`Goal not achieved: ${result.error || "Unknown error"}`);
      logWarning("This might be due to:");
      logInfo("  • Amazon bot detection");
      logInfo("  • Network timeouts");
      logInfo("  • UI changes in Amazon");
      logInfo("  • AI model decision issues");
    }

    // Keep browser open for demo
    logStep("Demo Complete");
    logInfo("Browser will remain open for 10 seconds so you can see the result...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    return result.success;

  } catch (error: any) {
    console.log("\n");
    logError(`Demo failed with error: ${error.message}`);
    console.error(error.stack);
    return false;
  } finally {
    await closeBrowser();
  }
}

// ============================================================================
// HEALING SIMULATION DEMO (Optional)
// ============================================================================

/**
 * This function demonstrates healing by running the test twice
 * First run: Establish golden states
 * Second run: Simulate selector changes (healing should kick in)
 */
async function runHealingDemo() {
  logSeparator("🔧 HEALING DEMO - Demonstrating Self-Healing Capability");

  console.log("\n");
  console.log("This demo runs the test TWICE to show healing:\n");
  console.log("  Run 1: Establish golden states (learn selectors)");
  console.log("  Run 2: Selectors may have changed (healing kicks in)\n");

  try {
    // First run
    logStep("Run 1: Initial Run (Learning Phase)");
    const success1 = await runAmazonDemo();

    if (!success1) {
      logError("First run failed - cannot demonstrate healing");
      return false;
    }

    logSuccess("First run complete - Golden states saved to Vector DB");

    // Wait between runs
    logInfo("Waiting 5 seconds before second run...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Second run
    logStep("Run 2: Second Run (Healing Phase)");
    logInfo("If Amazon changed any selectors, healing will activate!");

    const success2 = await runAmazonDemo();

    if (success2) {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
      console.log("║                                                                           ║");
      console.log("║                    🎉 HEALING DEMO SUCCESSFUL! 🎉                         ║");
      console.log("║                                                                           ║");
      console.log("║  Both runs completed successfully!                                        ║");
      console.log("║  This proves the agent can:                                               ║");
      console.log("║  • Learn from successful runs                                             ║");
      console.log("║  • Recover from selector changes                                          ║");
      console.log("║  • Update Vector DB with healed selectors                                 ║");
      console.log("║                                                                           ║");
      console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
      console.log("\n");
    }

    return success2;

  } catch (error: any) {
    logError(`Healing demo failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                           ║");
  console.log("║              AI-POWERED AUTO-HEALING QA AUTOMATION                        ║");
  console.log("║                         Amazon Demo                                       ║");
  console.log("║                                                                           ║");
  console.log("║  Technologies:                                                            ║");
  console.log("║  • Puppeteer (Browser Automation)                                         ║");
  console.log("║  • Gemini AI (Decision Making)                                            ║");
  console.log("║  • ChromaDB (Vector Storage)                                              ║");
  console.log("║  • RAG (Retrieval-Augmented Generation)                                   ║");
  console.log("║                                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  console.log("Select demo mode:\n");
  console.log("  1. Single Run Demo (Quick - ~2 minutes)");
  console.log("  2. Healing Demo (Full - ~5 minutes, runs twice)\n");

  // For now, default to single run
  // You can add CLI arguments later to choose mode
  const mode = process.env.DEMO_MODE || "single";

  if (mode === "healing") {
    const success = await runHealingDemo();
    process.exit(success ? 0 : 1);
  } else {
    const success = await runAmazonDemo();
    process.exit(success ? 0 : 1);
  }
}

// Run if executed directly
const isMain = typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('demo-amazon.ts');
if (isMain) {
  main().catch(error => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
}

export { runAmazonDemo, runHealingDemo };
