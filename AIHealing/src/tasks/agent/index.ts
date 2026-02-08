// ============================================================================
// AGENT LOOP - Main Orchestrator
// ============================================================================
// This module orchestrates the Observe → Think → Act loop with self-healing
// ============================================================================

import type { Page } from "puppeteer";
import { captureSnapshot, waitForPageStable } from "./observer";
import { think, type AIModelConfig, type Action } from "./thinker";
import { act, type ActionResult } from "./actor";
import { healSelector, recordSuccess, recordFailure, type SelectorHistory } from "./healer";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentConfig {
  goal: string;
  startUrl: string;
  maxSteps: number;
  timeout: number;
  aiModel: AIModelConfig;
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
  };
  reasoning: string;
  timestamp: Date;
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
    await page.goto(config.startUrl, { waitUntil: "networkidle0" });
    await waitForPageStable(page, config.timeout);

    // Main loop
    for (let step = 1; step <= config.maxSteps; step++) {
      totalSteps = step;
      console.log(`\n📍 Step ${step}/${config.maxSteps}`);

      // 1. OBSERVE: Capture current page state
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
      const targetElement = snapshot.actionableElements.find(
        el => el.id === action.targetElementId
      );

      // 3. ACT: Execute the action
      let actionResult = await act(action, page, snapshot.actionableElements);

      // 4. HEAL: If action failed, try to heal the selector
      let healingAttempted = false;
      let healingSuccessful = false;

      if (!actionResult.success && targetElement) {
        console.log("🔧 Action failed, attempting self-healing...");
        healingAttempted = true;

        const healingResult = await healSelector(
          action,
          targetElement,
          snapshot.actionableElements,
          history
        );

        if (healingResult.healed && healingResult.healedSelector) {
          console.log(`✅ Selector healed! Confidence: ${healingResult.confidence}`);
          
          // Retry the action with healed selector
          // Update the element with new selector
          const healedElement = snapshot.actionableElements.find(
            el => el.selectors.css === healingResult.healedSelector
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
            }
          }
        }

        if (!healingSuccessful) {
          if (targetElement) {
            recordFailure(action, targetElement);
          }
        }
      } else if (actionResult.success && targetElement) {
        // Record successful execution
        recordSuccess(action, targetElement);
      }

      // Track results
      if (actionResult.success) {
        successfulSteps++;
      } else {
        failedSteps++;
      }

      // Log this step
      logs.push({
        stepNumber: step,
        action,
        result: actionResult,
        healing: {
          attempted: healingAttempted,
          successful: healingSuccessful,
        },
        reasoning: thinkingResult.reasoning,
        timestamp: new Date(),
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
