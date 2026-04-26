// ============================================================================
// AGENT LOOP - Main Orchestrator with True RAG
// ============================================================================
// This module orchestrates the Observe → Think → Act loop with:
// 1. Vector Database lookup BEFORE each action (persistent memory)
// 2. Golden State saving AFTER successful actions
// 3. RAG healing on failures with DB updates
// 4. Final script generation
// ============================================================================

import type { Page } from "puppeteer";
import { captureSnapshot, waitForPageStable } from "./observer";
import { think, type AIModelConfig, type Action } from "./thinker";
import { act, type ActionResult } from "./actor";
import { healSelector, recordSuccess, recordFailure, type SelectorHistory } from "./healer";
import { 
  saveGoldenState, 
  findPersistentSelector, 
  updatePersistentSelector 
} from "./vectorDB";
import { 
  generateElementEmbedding, 
  generateActionEmbedding,
  type EmbeddingConfig 
} from "./embeddings";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentConfig {
  goal: string;
  startUrl: string;
  maxSteps: number;
  timeout: number;
  aiModel: AIModelConfig;
  testSuiteId: string; // For Vector DB storage
  embeddingConfig: EmbeddingConfig; // For generating embeddings
  // Optional cancellation hook — checked at every step boundary
  shouldCancel?: () => boolean;
}

export interface AgentResult {
  success: boolean;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  healedSteps: number;
  totalCost: number;
  executionTimeMs: number;
  error?: string;
  logs: StepLog[];
}

export interface StepLog {
  stepNumber: number;
  action: Action | null;
  result: ActionResult | null;
  healing: {
    attempted: boolean;
    successful: boolean;
    // Rich healing detail — populated when the healer engages so that
    // the UI can display "old → new selector | confidence | method".
    oldSelector?: string;
    newSelector?: string;
    selectorType?: "css" | "xpath" | "testId" | "aria";
    confidence?: number;
    method?: "vector-db" | "exact-match" | "text-similarity" | "structural-similarity" | "failed";
    matchedOn?: { text?: boolean; role?: boolean; tag?: boolean; attrs?: boolean };
  };
  reasoning: string;
  timestamp: Date;
  selectorUsed?: string; // The actual selector that worked (for script generation)
  selectorType?: "css" | "xpath" | "testId" | "aria";
}

// ============================================================================
// MAIN AGENT LOOP
// ============================================================================

/**
 * Execute the full Observe → Think → Act loop
 */
export async function runAgentLoop(
  page: Page,
  config: AgentConfig
): Promise<AgentResult> {
  console.log("🚀 Agent Loop: Starting execution");
  console.log(`📝 Goal: ${config.goal}`);
  console.log(`🌐 Starting at: ${config.startUrl}`);

  const startTime = Date.now();
  const logs: StepLog[] = [];
  const history: SelectorHistory[] = [];
  const previousActions: Action[] = [];

  let totalSteps = 0;
  let successfulSteps = 0;
  let failedSteps = 0;
  let healedSteps = 0;
  let totalCost = 0;
  let isGoalAchieved = false;

  try {
    // Navigate to start URL
    await page.goto(config.startUrl, { waitUntil: "domcontentloaded" });
    await waitForPageStable(page, config.timeout);

    // Main loop
    for (let step = 1; step <= config.maxSteps; step++) {
      // Cancellation check — exit cleanly if the user pressed Stop
      if (config.shouldCancel?.()) {
        console.log("🛑 Agent Loop: Cancellation requested — aborting");
        logs.push({
          stepNumber: step,
          action: null,
          result: null,
          healing: { attempted: false, successful: false },
          reasoning: "Run cancelled by user",
          timestamp: new Date(),
        });
        break;
      }

      totalSteps = step;
      console.log(`\n📍 Step ${step}/${config.maxSteps}`);

      // 1. OBSERVE: Capture current page state
      // Ensure we are operating on the most recently opened tab (crucial for E-commerce sites that use target="_blank")
      const pages = await page.browser().pages();
      page = pages[pages.length - 1];
      await page.bringToFront();
      
      const snapshot = await captureSnapshot(page);

      // 2. THINK: Decide next action
      const thinkingResult = await think(
        config.goal,
        snapshot,
        previousActions,
        config.aiModel
      );

      // Check if goal is achieved
      if (thinkingResult.isGoalAchieved) {
        console.log("🎉 Goal achieved!");
        isGoalAchieved = true;

        logs.push({
          stepNumber: step,
          action: null,
          result: null,
          healing: { attempted: false, successful: false },
          reasoning: thinkingResult.reasoning,
          timestamp: new Date(),
        });

        break;
      }

      // If no action suggested, we're stuck
      if (!thinkingResult.nextAction) {
        console.log("❌ AI couldn't suggest next action");
        failedSteps++;
        
        logs.push({
          stepNumber: step,
          action: null,
          result: null,
          healing: { attempted: false, successful: false },
          reasoning: "AI couldn't determine next action",
          timestamp: new Date(),
        });

        break;
      }

      const action = thinkingResult.nextAction;
      previousActions.push(action);

      // Find the target element
      let targetElement = snapshot.actionableElements.find(
        el => el.id === action.targetElementId
      );

      if (!targetElement) {
        console.log("❌ Target element not found");
        failedSteps++;
        logs.push({
          stepNumber: step,
          action,
          result: null,
          healing: { attempted: false, successful: false },
          reasoning: "Target element not found in snapshot",
          timestamp: new Date(),
        });
        break;
      }

      // === NEW RAG LOGIC START ===
      // Check if we have a "Healed" version of this step from a previous run
      console.log("🔍 Checking Vector DB for persistent selector...");
      const actionEmbedding = await generateActionEmbedding(action, config.embeddingConfig);
      const knownSelector = await findPersistentSelector(
        config.testSuiteId,
        action.description,
        actionEmbedding
      );

      if (knownSelector && knownSelector.confidence > 0.85) {
        console.log(`✅ Found persistent selector from previous run (${(knownSelector.confidence * 100).toFixed(1)}% confidence)`);
        
        // Find the element using the known good selector
        const healedElement = snapshot.actionableElements.find(
          el => {
            if (knownSelector.selectorType === "css") {
              return el.selectors.css === knownSelector.selector;
            } else if (knownSelector.selectorType === "xpath") {
              return el.selectors.xpath === knownSelector.selector;
            } else if (knownSelector.selectorType === "testId") {
              return el.selectors.testId === knownSelector.selector;
            } else if (knownSelector.selectorType === "aria") {
              return el.selectors.ariaLabel === knownSelector.selector;
            }
            return false;
          }
        );

        if (healedElement) {
          targetElement = healedElement;
          action.targetElementId = healedElement.id;
        }
      }
      // === NEW RAG LOGIC END ===

      // 3. ACT: Execute the action
      let actionResult = await act(action, page, snapshot.actionableElements);

      // 4. HEAL: If action failed, try to heal the selector
      let healingAttempted = false;
      let healingSuccessful = false;
      let selectorUsed = targetElement.selectors.css || targetElement.selectors.xpath || "";
      let selectorType: "css" | "xpath" | "testId" | "aria" = "css";
      // Capture rich healing details for logging + DB persistence
      let healingDetails: StepLog["healing"] = {
        attempted: false,
        successful: false,
      };

      if (!actionResult.success && targetElement) {
        console.log("🔧 Action failed, attempting self-healing...");
        healingAttempted = true;

        const healingResult = await healSelector(
          action,
          targetElement,
          snapshot.actionableElements,
          history,
          config.testSuiteId,
          config.embeddingConfig
        );

        if (healingResult.healed && healingResult.healedSelector) {
          console.log(`✅ Selector healed via ${healingResult.method}! Confidence: ${healingResult.confidence}`);

          // Retry the action with healed selector
          const healedElement = snapshot.actionableElements.find(
            el => {
              if (healingResult.selectorType === "css") return el.selectors.css === healingResult.healedSelector;
              if (healingResult.selectorType === "xpath") return el.selectors.xpath === healingResult.healedSelector;
              if (healingResult.selectorType === "testId") return el.selectors.testId === healingResult.healedSelector;
              return false;
            }
          );

          if (healedElement) {
            actionResult = await act(
              { ...action, targetElementId: healedElement.id },
              page,
              snapshot.actionableElements
            );

            if (actionResult.success) {
              healedSteps++;
              healingSuccessful = true;
              recordSuccess(action, healedElement);

              // Record what matched between broken element and healed element
              const matchedOn = {
                text: !!targetElement.text && targetElement.text === healedElement.text,
                role: !!(targetElement as any).attributes?.role &&
                  (targetElement as any).attributes.role === (healedElement as any).attributes?.role,
                tag: targetElement.tagName === healedElement.tagName,
                attrs:
                  (targetElement as any).attributes?.placeholder ===
                    (healedElement as any).attributes?.placeholder ||
                  (targetElement as any).attributes?.name ===
                    (healedElement as any).attributes?.name,
              };

              healingDetails = {
                attempted: true,
                successful: true,
                oldSelector: healingResult.originalSelector,
                newSelector: healingResult.healedSelector,
                selectorType: healingResult.selectorType || "css",
                confidence: healingResult.confidence,
                method: healingResult.method,
                matchedOn,
              };
              
              // === UPDATE VECTOR DB with the healed selector ===
              if (healingResult.method === "text-similarity" || healingResult.method === "structural-similarity") {
                console.log("💾 Updating Vector DB with healed selector...");
                const elementEmbedding = await generateElementEmbedding(healedElement, config.embeddingConfig);
                await updatePersistentSelector(
                  config.testSuiteId,
                  action.description,
                  healingResult.healedSelector,
                  healingResult.selectorType || "css",
                  elementEmbedding
                );
              }
              
              selectorUsed = healingResult.healedSelector;
              selectorType = healingResult.selectorType || "css";
            }
          }
        }

        if (!healingSuccessful) {
          if (targetElement) {
            recordFailure(action, targetElement);
          }
          // Failed healing — still record the attempt so the UI can surface it
          healingDetails = {
            attempted: true,
            successful: false,
            oldSelector: targetElement.selectors.css || targetElement.selectors.xpath || "",
            confidence: 0,
            method: "failed",
          };
        }
      } else if (actionResult.success && targetElement) {
        // === SUCCESS: Save this to the Vector DB as the "Golden State" ===
        console.log("💾 Saving successful action to Vector DB...");
        recordSuccess(action, targetElement);
        
        try {
          const elementEmbedding = await generateElementEmbedding(targetElement, config.embeddingConfig);
          await saveGoldenState(
            config.testSuiteId,
            action.description,
            selectorUsed,
            selectorType,
            targetElement,
            elementEmbedding
          );
        } catch (error) {
          console.warn("⚠️  Failed to save golden state:", error);
        }
      }

      // Track results
      if (actionResult.success) {
        successfulSteps++;
      } else {
        failedSteps++;
      }

      // Log this step (with selector info for script generation)
      logs.push({
        stepNumber: step,
        action,
        result: actionResult,
        healing: healingAttempted
          ? healingDetails
          : { attempted: false, successful: false },
        reasoning: thinkingResult.reasoning,
        timestamp: new Date(),
        selectorUsed: actionResult.success ? selectorUsed : undefined,
        selectorType: actionResult.success ? selectorType : undefined,
      });

      // If action failed and couldn't be healed, stop
      if (!actionResult.success) {
        console.log("❌ Action failed and couldn't be healed");
        break;
      }

      // Wait for page to stabilize after action
      await waitForPageStable(page, config.timeout);
    }

    const executionTime = Date.now() - startTime;

    return {
      success: isGoalAchieved,
      totalSteps,
      successfulSteps,
      failedSteps,
      healedSteps,
      totalCost,
      executionTimeMs: executionTime,
      logs,
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error("❌ Agent Loop: Fatal error:", error);

    return {
      success: false,
      totalSteps,
      successfulSteps,
      failedSteps,
      healedSteps,
      totalCost,
      executionTimeMs: executionTime,
      error: error.message,
      logs,
    };
  }
}
