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

const [, , startUrlArg, goalArg] = process.argv;

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

    const config: AgentConfig = {
      goal: goalArg,
      startUrl: startUrlArg,
      maxSteps: 12,
      timeout: 8000,
      aiModel: {
        model: "gemini-flash" as any,
        apiKey: GEMINI_KEY,
      },
      testSuiteId: SUITE_ID,
      embeddingConfig: {
        provider: "gemini",
        apiKey: GEMINI_KEY,
      },
    };

    console.log("▶️  Running agent loop...");
    const result = await runAgentLoop(page, config);

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
