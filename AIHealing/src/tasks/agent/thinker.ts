// ============================================================================
// THINKER MODULE - AI Reasoning & Decision Making
// ============================================================================
// This module uses LLMs (Gemini/GPT) to reason about the current page state
// and decide what action to take next to achieve the goal.
// ============================================================================

import type { DOMSnapshot } from "./observer";

// ============================================================================
// TYPES
// ============================================================================

export interface ThinkingResult {
  nextAction: Action | null;
  reasoning: string;
  isGoalAchieved: boolean;
  confidence: number; // 0-1 score
}

export interface Action {
  type: "click" | "type" | "select" | "wait" | "navigate" | "verify";
  targetElementId?: string; // Reference to ActionableElement.id
  value?: string; // For type/select actions
  description: string;
}

export interface AIModelConfig {
  model: "gemini-flash" | "gemini-pro" | "gpt-4o";
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// THINKER FUNCTIONS
// ============================================================================

/**
 * Use AI to think about the next step
 * This is the "Think" step in the Agentic Loop
 */
export async function think(
  goal: string,
  snapshot: DOMSnapshot,
  previousActions: Action[],
  config: AIModelConfig
): Promise<ThinkingResult> {
  console.log("🤔 Thinker: Analyzing page and deciding next action...");

  // Build the prompt for the AI
  const prompt = buildPrompt(goal, snapshot, previousActions);

  // Call the appropriate AI model
  const response = await callAIModel(prompt, config);

  // Parse the AI's response
  const result = parseAIResponse(response);

  console.log(`✅ Thinker: ${result.isGoalAchieved ? "Goal achieved!" : `Next action: ${result.nextAction?.type}`}`);
  return result;
}

/**
 * Build the prompt for the AI model
 */
function buildPrompt(
  goal: string,
  snapshot: DOMSnapshot,
  previousActions: Action[]
): string {
  // Simplify actionable elements for the prompt
  const elementsDescription = snapshot.actionableElements
    .map((el, idx) => {
      return `[${el.id}] ${el.tagName} - "${el.text}" (${Object.keys(el.selectors).length} selectors available)`;
    })
    .join('\n');

  const actionsHistory = previousActions.length > 0
    ? previousActions.map(a => `- ${a.type}: ${a.description}`).join('\n')
    : "None yet - this is the first step";

  return `You are an expert QA automation agent. Your goal is to:
"${goal}"

CURRENT PAGE STATE:
URL: ${snapshot.url}
Title: ${snapshot.title}

ACTIONABLE ELEMENTS:
${elementsDescription}

ACTIONS TAKEN SO FAR:
${actionsHistory}

INSTRUCTIONS:
1. Analyze the current page and determine if the goal is already achieved
2. If not, decide the next best action to take
3. Respond in this exact JSON format:

{
  "isGoalAchieved": boolean,
  "reasoning": "Explain your thinking",
  "nextAction": {
    "type": "click|type|select|wait|navigate|verify",
    "targetElementId": "element-X (if applicable)",
    "value": "text to type (if applicable)",
    "description": "Human-readable description of this action"
  } OR null if goal is achieved,
  "confidence": 0.0-1.0
}

Think step by step. Be precise. Only suggest actions that are clearly achievable with the visible elements.`;
}

/**
 * Call the AI model API
 */
async function callAIModel(
  prompt: string,
  config: AIModelConfig
): Promise<string> {
  // TODO: Implement actual API calls to Gemini/GPT
  // For now, return a stub response
  
  console.log("🤖 Thinker: Calling AI model:", config.model);
  
  // This is a stub - will be implemented with actual API integration
  const stubResponse = {
    isGoalAchieved: false,
    reasoning: "I can see a login form with username and password fields. Need to fill them.",
    nextAction: {
      type: "type",
      targetElementId: "element-0",
      value: "test@example.com",
      description: "Type email into username field"
    },
    confidence: 0.9
  };

  return JSON.stringify(stubResponse);
}

/**
 * Parse the AI's JSON response
 */
function parseAIResponse(response: string): ThinkingResult {
  try {
    const parsed = JSON.parse(response);
    
    return {
      nextAction: parsed.nextAction,
      reasoning: parsed.reasoning,
      isGoalAchieved: parsed.isGoalAchieved,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    
    // Return a safe default
    return {
      nextAction: null,
      reasoning: "Failed to understand AI response",
      isGoalAchieved: false,
      confidence: 0,
    };
  }
}

/**
 * Calculate cost of an AI model call
 */
export function calculateCost(
  tokensUsed: number,
  model: string
): number {
  // Pricing per 1M tokens (approximate)
  const pricing: Record<string, number> = {
    "gemini-flash": 0.35,
    "gemini-pro": 1.25,
    "gpt-4o": 5.00,
  };

  const pricePerMillion = pricing[model] || 1.0;
  return (tokensUsed / 1_000_000) * pricePerMillion;
}
