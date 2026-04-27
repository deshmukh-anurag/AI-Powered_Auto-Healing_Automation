// ============================================================================
// HEALING DEMO — Single-run agent script
// ============================================================================
// Runs the AI agent once against a URL with a goal. Used by demo-healing.sh
// to execute the learning run and then (after /toggle) the healing run.
//
// Usage (via npx tsx):
//   npx tsx demo-site/run-demo.ts <startUrl> "<goal>"
//
// Env:
//   HEALING_DEMO_SUITE_ID  — shared id across runs so RAG memory persists
//   GEMINI_API_KEY         — required
// ============================================================================

import "dotenv/config";
import puppeteer from "puppeteer";
import { runAgentLoop, type AgentConfig } from "../src/tasks/agent/index";
import { runPlanExecuteAgent, type PlanExecuteConfig } from "../src/tasks/agent/planExecute";
import { clearGoldenStates } from "../src/tasks/agent/vectorDB";

const [, , startUrlArg, goalArg] = process.argv;
const SHOULD_CLEAR = process.env.HEALING_DEMO_CLEAR === "1";

// Set HEALING_DEMO_AGENT=legacy to use the old per-step Thinker loop.
// Default is the new Plan-then-Execute agent.
const USE_LEGACY = process.env.HEALING_DEMO_AGENT === "legacy";

if (!startUrlArg || !goalArg) {
  console.error("Usage: npx tsx demo-site/run-demo.ts <startUrl> \"<goal>\"");
  process.exit(2);
}

const SUITE_ID = process.env.HEALING_DEMO_SUITE_ID || "demo-healing-suite";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY is not set.");
  process.exit(2);
}

async function main() {
  if (SHOULD_CLEAR) {
    console.log(`🧹 Clearing vector DB for suite "${SUITE_ID}" (fresh learning run)...`);
    try {
      await clearGoldenStates(SUITE_ID);
      console.log(`✅ Vector DB cleared`);
    } catch (e) {
      console.warn(`⚠️  Could not clear vector DB:`, e);
    }
  }

  console.log(`🌐 Launching browser...`);
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1366, height: 850 },
  });
  const page = await browser.newPage();

  try {
    console.log(`➡️  Navigating to ${startUrlArg}...`);
    await page.goto(startUrlArg, { waitUntil: "domcontentloaded" });

    const sharedConfig = {
      // Make goal completion explicit so the LLM marks done after clicking
      goal: `${goalArg} The goal is achieved as soon as the Add to Cart button has been clicked. Do NOT verify or check anything afterwards.`,
      startUrl: startUrlArg,
      maxSteps: 6,
      timeout: 8000,
      aiModel: {
        model: "gemini-flash" as any,
        apiKey: GEMINI_KEY,
      },
      testSuiteId: SUITE_ID,
      embeddingConfig: {
        provider: "gemini" as const,
        apiKey: GEMINI_KEY,
      },
    };

    let result;
    if (USE_LEGACY) {
      console.log("▶️  Running LEGACY per-step agent loop...");
      result = await runAgentLoop(page, sharedConfig as AgentConfig);
    } else {
      console.log("▶️  Running PLAN-EXECUTE agent (single planner call + per-step healing)...");
      result = await runPlanExecuteAgent(page, sharedConfig as PlanExecuteConfig);
    }

    console.log("");
    console.log("─────────────────────────────────────────────");
    console.log("  RUN RESULT");
    console.log("─────────────────────────────────────────────");
    console.log(`  Success:    ${result.success ? "✅" : "❌"}`);
    console.log(`  Steps:      ${result.totalSteps}`);
    console.log(`  Succeeded:  ${result.successfulSteps}`);
    console.log(`  Failed:     ${result.failedSteps}`);
    console.log(`  Healed:     ${result.healedSteps}  ← 🌟 healing count`);
    console.log(`  Duration:   ${(result.executionTimeMs / 1000).toFixed(1)}s`);
    console.log("─────────────────────────────────────────────");

    if (result.healedSteps > 0) {
      console.log("");
      console.log("🎉 HEALING ENGAGED:");
      result.logs
        .filter((l) => l.healing.attempted)
        .forEach((l) => {
          console.log(
            `   step ${l.stepNumber}: ${l.healing.successful ? "✅ HEALED" : "❌ failed"} — ${l.action?.description ?? ""}`
          );
        });
    }

    // Keep browser open for 3s so the audience can see the final state
    await new Promise((r) => setTimeout(r, 3000));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("❌ Demo crashed:", err);
  process.exit(1);
});
