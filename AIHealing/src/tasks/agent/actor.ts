// ============================================================================
// ACTOR MODULE - Execute Browser Actions
// ============================================================================
// This module executes the actions decided by the Thinker on the actual
// browser page using Puppeteer.
// ============================================================================

import type { Page } from "puppeteer";
import type { Action } from "./thinker";
import type { ActionableElement } from "./observer";

// ============================================================================
// TYPES
// ============================================================================

export interface ActionResult {
  success: boolean;
  error?: string;
  screenshot?: string;
  selectorUsed?: string; // Which selector strategy worked
  executionTimeMs: number;
}

// ============================================================================
// ACTOR FUNCTIONS
// ============================================================================

/**
 * Execute an action on the page
 * This is the "Act" step in the Agentic Loop
 */
export async function act(
  action: Action,
  page: Page,
  elements: ActionableElement[]
): Promise<ActionResult> {
  console.log(`🎬 Actor: Executing ${action.type} - ${action.description}`);
  
  const startTime = Date.now();

  try {
    switch (action.type) {
      case "click":
        return await executeClick(action, page, elements);
      
      case "type":
        return await executeType(action, page, elements);
      
      case "select":
        return await executeSelect(action, page, elements);
      
      case "wait":
        return await executeWait(action, page);
      
      case "navigate":
        return await executeNavigate(action, page);
      
      case "verify":
        return await executeVerify(action, page);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Actor: Action failed - ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      executionTimeMs: executionTime,
    };
  }
}

/**
 * Execute a click action
 */
async function executeClick(
  action: Action,
  page: Page,
  elements: ActionableElement[]
): Promise<ActionResult> {
  const element = elements.find(el => el.id === action.targetElementId);
  if (!element) {
    throw new Error(`Element ${action.targetElementId} not found`);
  }

  // Try different selector strategies in order of reliability
  const selectorStrategies = [
    { type: 'testId', value: element.selectors.testId },
    { type: 'css', value: element.selectors.css },
    { type: 'xpath', value: element.selectors.xpath },
  ];

  for (const strategy of selectorStrategies) {
    if (!strategy.value) continue;

    try {
      if (strategy.type === 'xpath') {
        // Use page.locator for XPath in newer Puppeteer
        const element = await page.waitForSelector(`::-p-xpath(${strategy.value})`, { timeout: 2000 });
        if (element) {
          await element.click();
          return {
            success: true,
            selectorUsed: `xpath: ${strategy.value}`,
            executionTimeMs: 0, // Will be calculated by caller
          };
        }
      } else {
        await page.click(strategy.value);
        return {
          success: true,
          selectorUsed: `${strategy.type}: ${strategy.value}`,
          executionTimeMs: 0,
        };
      }
    } catch (error) {
      // Try next strategy
      continue;
    }
  }

  throw new Error(`Failed to click element with any selector strategy`);
}

/**
 * Execute a type action (input text)
 */
async function executeType(
  action: Action,
  page: Page,
  elements: ActionableElement[]
): Promise<ActionResult> {
  const element = elements.find(el => el.id === action.targetElementId);
  if (!element) {
    throw new Error(`Element ${action.targetElementId} not found`);
  }

  if (!action.value) {
    throw new Error("Type action requires a value");
  }

  // Try different selector strategies
  const selectorStrategies = [
    { type: 'testId', value: element.selectors.testId },
    { type: 'css', value: element.selectors.css },
    { type: 'xpath', value: element.selectors.xpath },
  ];

  for (const strategy of selectorStrategies) {
    if (!strategy.value) continue;

    try {
      if (strategy.type === 'xpath') {
        // Use page.locator for XPath in newer Puppeteer
        const element = await page.waitForSelector(`::-p-xpath(${strategy.value})`, { timeout: 2000 });
        if (element) {
          await element.click(); // Focus first
          await page.keyboard.type(action.value);
          return {
            success: true,
            selectorUsed: `xpath: ${strategy.value}`,
            executionTimeMs: 0,
          };
        }
      } else {
        await page.type(strategy.value, action.value);
        return {
          success: true,
          selectorUsed: `${strategy.type}: ${strategy.value}`,
          executionTimeMs: 0,
        };
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error(`Failed to type into element with any selector strategy`);
}

/**
 * Execute a select action (dropdown)
 */
async function executeSelect(
  action: Action,
  page: Page,
  elements: ActionableElement[]
): Promise<ActionResult> {
  const element = elements.find(el => el.id === action.targetElementId);
  if (!element) {
    throw new Error(`Element ${action.targetElementId} not found`);
  }

  if (!action.value) {
    throw new Error("Select action requires a value");
  }

  const selector = element.selectors.css || element.selectors.xpath;
  if (!selector) {
    throw new Error("No valid selector found for select element");
  }

  await page.select(selector, action.value);

  return {
    success: true,
    selectorUsed: selector,
    executionTimeMs: 0,
  };
}

/**
 * Execute a wait action
 */
async function executeWait(
  action: Action,
  page: Page
): Promise<ActionResult> {
  const waitTime = parseInt(action.value || "1000");
  // Use standard setTimeout wrapped in promise instead of deprecated waitForTimeout
  await new Promise(resolve => setTimeout(resolve, waitTime));

  return {
    success: true,
    executionTimeMs: waitTime,
  };
}

/**
 * Execute a navigate action
 */
async function executeNavigate(
  action: Action,
  page: Page
): Promise<ActionResult> {
  if (!action.value) {
    throw new Error("Navigate action requires a URL");
  }

  await page.goto(action.value, { waitUntil: "networkidle0" });

  return {
    success: true,
    executionTimeMs: 0,
  };
}

/**
 * Execute a verify action (check if something exists)
 */
async function executeVerify(
  action: Action,
  page: Page
): Promise<ActionResult> {
  if (!action.value) {
    throw new Error("Verify action requires a text to search for");
  }

  const pageText = await page.evaluate(() => document.body.innerText);
  const found = pageText.includes(action.value!);

  if (!found) {
    throw new Error(`Verification failed: "${action.value}" not found on page`);
  }

  return {
    success: true,
    executionTimeMs: 0,
  };
}
