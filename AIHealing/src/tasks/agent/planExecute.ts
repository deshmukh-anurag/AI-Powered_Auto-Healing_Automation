// ============================================================================
// PLAN-THEN-EXECUTE AGENT LOOP
// ============================================================================
// Cleaner architecture proposed by the user:
//
//   1. PLANNING PHASE (once)
//      - Capture starting DOM
//      - Planner LLM decomposes the goal into stable, descriptor-based steps
//
//   2. EXECUTION PHASE (loop over plan)
//      For each step descriptor:
//        a. Generate semantic embedding of the descriptor
//        b. RAG lookup in vector DB for past selectors (by embedding similarity)
//        c. Capture the CURRENT DOM (fresh snapshot)
//        d. If a cached selector exists AND points to an element in the
//           current DOM   → execute the action (Branch A: cache hit)
//        e. Else                                  → call llmHeal with the
//           descriptor + current DOM, get a matched element, execute, save
//                                                  (Branch B: drift / first run)
//
// Notes vs the legacy `runAgentLoop`:
//   - No per-step Thinker call (saves ~2/3 of LLM round-trips on the happy path)
//   - Cache identity is the descriptor's embedding, not a per-iteration string
//   - Healing is a single focused LLM call ("which element matches THIS intent
//     on THIS page?") instead of a 4-strategy classical matcher
//   - Compatible with the existing AgentResult / StepLog / HealingEvent
//     persistence in operations.ts
// ============================================================================

import type { Page } from "puppeteer";
import { captureSnapshot, waitForPageStable } from "./observer";
import { act, type ActionResult } from "./actor";
import type { Action, AIModelConfig } from "./thinker";
import {
  saveGoldenState,
  findPersistentSelector,
  updatePersistentSelector,
  type VectorSearchResult,
} from "./vectorDB";
import { generateActionEmbedding, generateElementEmbedding, type EmbeddingConfig } from "./embeddings";
import { planTestSuite, type PlanStep } from "./planner";
import { llmHeal } from "./healer";
import type { AgentResult, StepLog } from "./index";

// ============================================================================
// TYPES
// ============================================================================

export interface PlanExecuteConfig {
  goal: string;
  startUrl: string;
  maxSteps: number;
  timeout: number;
  aiModel: AIModelConfig;
  testSuiteId: string;
  embeddingConfig: EmbeddingConfig;
  shouldCancel?: () => boolean;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function runPlanExecuteAgent(
  page: Page,
  config: PlanExecuteConfig
): Promise<AgentResult> {
  console.log("🚀 Plan-Execute Agent: starting");
  console.log(`📝 Goal: ${config.goal}`);
  console.log(`🌐 Starting URL: ${config.startUrl}`);

  const startTime = Date.now();
  const logs: StepLog[] = [];

  let totalSteps = 0;
  let successfulSteps = 0;
  let failedSteps = 0;
  let healedSteps = 0;
  let isGoalAchieved = false;

  try {
    // -------------------------------------------------------------------
    // 1. NAVIGATION
    // -------------------------------------------------------------------
    await page.goto(config.startUrl, { waitUntil: "domcontentloaded" });
    await waitForPageStable(page, config.timeout);

    // -------------------------------------------------------------------
    // 2. PLANNING PHASE (single LLM call)
    // -------------------------------------------------------------------
    const initialSnapshot = await captureSnapshot(page);

    const plan = await planTestSuite(config.goal, initialSnapshot, config.aiModel);

    if (plan.steps.length === 0) {
      throw new Error("Planner returned an empty plan — cannot execute.");
    }

    // -------------------------------------------------------------------
    // 3. EXECUTION PHASE
    // -------------------------------------------------------------------
    for (const planStep of plan.steps) {
      // Cancellation check
      if (config.shouldCancel?.()) {
        console.log("🛑 Plan-Execute: cancellation requested");
        logs.push({
          stepNumber: planStep.id,
          action: null,
          result: null,
          healing: { attempted: false, successful: false },
          reasoning: "Run cancelled by user",
          timestamp: new Date(),
        });
        break;
      }

      // Hard cap
      if (planStep.id > config.maxSteps) {
        console.log(`⏹  Plan exceeds maxSteps (${config.maxSteps}) — stopping`);
        break;
      }

      totalSteps = planStep.id;
      console.log(`\n📍 Step ${planStep.id}/${plan.steps.length} — ${planStep.descriptor}`);

      // Always operate on the most recently opened tab (e-commerce target=_blank)
      const pages = await page.browser().pages();
      page = pages[pages.length - 1];
      await page.bringToFront();

      // -------------------------------------------------------------------
      // 3a. Fresh snapshot (REQUIRED for healing)
      // -------------------------------------------------------------------
      const snapshot = await captureSnapshot(page);

      // -------------------------------------------------------------------
      // 3b. RAG lookup by descriptor embedding (semantic match)
      // -------------------------------------------------------------------
      console.log("🔍 RAG: looking up cached selector by descriptor embedding...");
      const descriptorEmbedding = await generateActionEmbedding(
        { type: planStep.expectedAction, description: planStep.descriptor } as Action,
        config.embeddingConfig
      );
      const cached: VectorSearchResult | null = await findPersistentSelector(
        config.testSuiteId,
        planStep.descriptor,
        descriptorEmbedding
        // NOTE: no stepNumber → forces semantic / exact-description path
      );

      let targetElement = cached
        ? findElementBySelector(snapshot.actionableElements, cached.selector, cached.selectorType)
        : null;

      let healing: StepLog["healing"] = { attempted: false, successful: false };
      let cachedSelectorBroken = false;
      let firstTimeDiscovery = false;

      if (cached && !targetElement) {
        // Branch B-i: cached selector exists but doesn't match the live DOM
        // → this is a TRUE healing event (drift detected)
        console.log(`💥 Cached selector "${cached.selector}" not found in current DOM`);
        console.log(`🔧 HEALER: invoking LLM to recover selector for "${planStep.descriptor}"`);
        cachedSelectorBroken = true;
      } else if (!cached) {
        // Branch B-ii: first time we see this descriptor
        // → this is NOT healing. The Thinker is just deciding fresh.
        console.log(`🧠 THINKER: no cached selector for "${planStep.descriptor}", deciding fresh`);
        firstTimeDiscovery = true;
      } else {
        // Branch A: cache hit and selector still valid
        console.log(`✅ Cache hit (selector still valid in DOM): ${cached.selector}`);
      }

      // -------------------------------------------------------------------
      // 3c. LLM call — same underlying capability, two different roles:
      //     - Thinker: picks element on first encounter (just learning)
      //     - Healer:  picks element AFTER drift (this is healing)
      // -------------------------------------------------------------------
      if (!targetElement) {
        const llmResult = await llmHeal(
          planStep.descriptor,
          planStep.expectedAction,
          snapshot.actionableElements,
          config.aiModel
        );

        if (llmResult.healed && llmResult.elementId) {
          const matched = snapshot.actionableElements.find((el) => el.id === llmResult.elementId);
          if (matched) {
            targetElement = matched;

            if (cachedSelectorBroken) {
              // ✅ TRUE HEALING — record the old→new diff for the UI panel
              const oldSelector = cached?.selector ?? "";
              const newSelector =
                matched.selectors.css || matched.selectors.xpath || matched.selectors.testId || "";

              const matchedOn = {
                text: !!cached?.metadata?.text && cached.metadata.text === matched.text,
                role:
                  !!cached?.metadata?.role &&
                  cached.metadata.role === (matched.attributes?.role as string | undefined),
                tag: !!cached?.metadata?.tagName && cached.metadata.tagName === matched.tagName,
                attrs:
                  !!cached?.metadata?.placeholder &&
                  cached.metadata.placeholder ===
                    (matched.attributes?.placeholder as string | undefined),
              };

              healing = {
                attempted: true,
                successful: true,
                oldSelector,
                newSelector,
                selectorType: "css",
                confidence: llmResult.confidence,
                method: "vector-db", // LLM-mediated RAG healing
                matchedOn,
              };
              healedSteps++;
              console.log(`✅ HEALER: ${oldSelector} → ${newSelector} (${(llmResult.confidence * 100).toFixed(0)}%)`);
            } else if (firstTimeDiscovery) {
              // 🧠 First-time discovery — the Thinker just decided what to do.
              // This is NOT a healing event. healing.attempted stays false.
              console.log(
                `🧠 THINKER: chose ${matched.selectors.css || matched.selectors.xpath || matched.id} (${(llmResult.confidence * 100).toFixed(0)}%)`
              );
            }
          }
        } else {
          // LLM couldn't find an element. If we had a cached selector that
          // broke, that's a failed healing event. Otherwise it's a Thinker
          // dead-end (we'll fail the step below).
          if (cachedSelectorBroken) {
            healing = {
              attempted: true,
              successful: false,
              oldSelector: cached?.selector ?? "",
              confidence: 0,
              method: "failed",
            };
            console.log("❌ HEALER: failed to recover selector");
          } else {
            console.log("❌ THINKER: could not pick an element for this step");
          }
        }
      }

      if (!targetElement) {
        // Could not resolve an element — abort this step
        console.log("❌ Could not resolve a target element for this step");
        failedSteps++;
        logs.push({
          stepNumber: planStep.id,
          action: {
            type: planStep.expectedAction,
            description: planStep.descriptor,
            value: planStep.expectedValue,
          } as Action,
          result: null,
          healing,
          reasoning: "No element on the page satisfied the step descriptor.",
          timestamp: new Date(),
        });
        break;
      }

      // -------------------------------------------------------------------
      // 3d. Act
      // -------------------------------------------------------------------
      const action: Action = {
        type: planStep.expectedAction,
        targetElementId: targetElement.id,
        value: planStep.expectedValue,
        description: planStep.descriptor,
      };

      const actionResult: ActionResult = await act(action, page, snapshot.actionableElements);

      const selectorUsed =
        targetElement.selectors.css ||
        targetElement.selectors.xpath ||
        targetElement.selectors.testId ||
        "";
      const selectorType: "css" | "xpath" | "testId" | "aria" = "css";

      if (actionResult.success) {
        successfulSteps++;

        // -------------------------------------------------------------------
        // 3e. Update vector DB memory
        // -------------------------------------------------------------------
        try {
          const elementEmbedding = await generateElementEmbedding(targetElement, config.embeddingConfig);

          if (cachedSelectorBroken) {
            // Healing succeeded — overwrite the broken cached selector with
            // the new one we just learned via the LLM healer.
            console.log("💾 Updating cached selector after successful healing");
            await updatePersistentSelector(
              config.testSuiteId,
              planStep.descriptor,
              selectorUsed,
              selectorType,
              descriptorEmbedding
            );
          } else {
            // First time we've seen this descriptor — save it.
            console.log("💾 Saving new golden state for this descriptor");
            await saveGoldenState(
              config.testSuiteId,
              planStep.descriptor,
              selectorUsed,
              selectorType,
              targetElement,
              descriptorEmbedding // <-- we key by descriptor embedding, not element embedding
            );
          }
          // Note: elementEmbedding is generated for parity with the legacy path
          // but the cache is keyed on the descriptor embedding for stable lookup.
          void elementEmbedding;
        } catch (dbErr) {
          console.warn("⚠️  Failed to update vector DB:", dbErr);
        }
      } else {
        failedSteps++;
      }

      logs.push({
        stepNumber: planStep.id,
        action,
        result: actionResult,
        healing,
        reasoning: cached
          ? `Cache ${cachedSelectorBroken ? "drift — healed via LLM" : "hit"}`
          : "First time — selector learned via LLM healer",
        timestamp: new Date(),
        selectorUsed: actionResult.success ? selectorUsed : undefined,
        selectorType: actionResult.success ? selectorType : undefined,
      });

      if (!actionResult.success) {
        console.log("❌ Action failed — stopping execution");
        break;
      }

      await waitForPageStable(page, config.timeout);
    }

    // If we executed every planned step successfully, the goal is achieved.
    isGoalAchieved = totalSteps === plan.steps.length && failedSteps === 0;

    return {
      success: isGoalAchieved,
      totalSteps,
      successfulSteps,
      failedSteps,
      healedSteps,
      totalCost: 0,
      executionTimeMs: Date.now() - startTime,
      logs,
    };
  } catch (error: any) {
    console.error("❌ Plan-Execute Agent: fatal error:", error);
    return {
      success: false,
      totalSteps,
      successfulSteps,
      failedSteps,
      healedSteps,
      totalCost: 0,
      executionTimeMs: Date.now() - startTime,
      error: error?.message ?? String(error),
      logs,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function findElementBySelector(
  elements: import("./observer").ActionableElement[],
  selector: string,
  selectorType: "css" | "xpath" | "testId" | "aria"
) {
  return (
    elements.find((el) => {
      if (selectorType === "css") return el.selectors.css === selector;
      if (selectorType === "xpath") return el.selectors.xpath === selector;
      if (selectorType === "testId") return el.selectors.testId === selector;
      if (selectorType === "aria") return el.selectors.ariaLabel === selector;
      return false;
    }) || null
  );
}

// Re-export PlanStep so callers don't need to know about planner.ts
export type { PlanStep };
