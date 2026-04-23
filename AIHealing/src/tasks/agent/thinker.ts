// ============================================================================
// THINKER MODULE - AI Reasoning & Decision Making
// ============================================================================
// This module uses LLMs (Gemini/GPT) to reason about the current page state
// and decide what action to take next to achieve the goal.
// ============================================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
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
  // Sort elements to ensure buttons and inputs are prioritized, then trim to ~120 elements to avoid Token limits
  const maxElements = [...snapshot.actionableElements].sort((a, b) => {
    const aPriority = (a.tagName.toLowerCase() === 'button' || a.tagName.toLowerCase() === 'input') ? 1 : 0;
    const bPriority = (b.tagName.toLowerCase() === 'button' || b.tagName.toLowerCase() === 'input') ? 1 : 0;
    return bPriority - aPriority;
  }).slice(0, 120);
  const elementsDescription = maxElements
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
    "targetElementId": "element-X",
    "value": "text to type (if applicable)",
    "description": "Human-readable description of this action"
  },
  "confidence": 0.0-1.0
}
(Note: Set "nextAction" to null if goal is achieved)

Think step by step. Be precise. Only suggest actions that are clearly achievable with the visible elements.`;
}

/**
 * Call the AI model API
 */
async function callAIModel(
  prompt: string,
  config: AIModelConfig
): Promise<string> {
  console.log("🤖 Thinker: Calling AI model:", config.model);

  try {
    if (config.model === "gemini-flash" || config.model === "gemini-pro") {
      try {
        const response = await callGemini(prompt, config);
        // Validate that Gemini returned parseable JSON, otherwise trigger fallback
        try {
          const cleaned = response.trim().replace(/^```(json)?\n?|\n?```$/gi, "");
          JSON.parse(cleaned);
        } catch (parseErr) {
          throw new Error("Gemini returned truncated or malformed JSON");
        }
        return response;
      } catch (geminiError: any) {
        console.warn("⚠️ Gemini failed or returned invalid JSON, falling back to Llama 3.3:", geminiError.message);
        try {
          // Tier 2 Fallback: Groq Llama 3.3
          return await callFallbackAI(prompt, config, "llama-3.3-70b-versatile");
        } catch (llamaError: any) {
          console.warn("⚠️ Llama 3.3 failed, cascading down to Llama 3.1:", llamaError.message);
          // Tier 3 Fallback: Groq Llama 3.1 
          return await callFallbackAI(prompt, config, "llama-3.1-8b-instant");
        }
      }
    } else if (config.model === "gpt-4o") {
      throw new Error("GPT-4o is not free. Please use gemini-flash or gemini-pro for this university project.");
    } else {
      throw new Error(`Unsupported model: ${config.model}`);
    }
  } catch (error) {
    console.error("❌ Thinker: AI model call failed:", error);

    // Return a safe fallback response
  const fallbackResponse = {
    isGoalAchieved: false,
    reasoning: `AI model call failed: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to safe navigation.`,
    nextAction: {
      type: "wait",
      description: "Wait for manual intervention due to AI failure"
    },
    confidence: 0.1
  };

  return JSON.stringify(fallbackResponse);
}
}

/**
 * Fallback to Groq or xAI (Grok) using OpenAI compatible fetching
 */
async function callFallbackAI(
  prompt: string,
  config: AIModelConfig,
  specificModelName?: string
): Promise<string> {
  // Load variables specifically from process.env since script loaded `.env` using bash
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error("No GROQ_API_KEY or GROK_API_KEY found in environment for fallback.");
  }

  const isGroq = !!process.env.GROQ_API_KEY;
  const baseUrl = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.x.ai/v1/chat/completions";
  const modelName = specificModelName || (isGroq ? "llama-3.3-70b-versatile" : "grok-beta");

  console.log(`🚀 Thinker (Fallback): Sending request to ${modelName} at ${baseUrl}...`);

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fallback API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Fallback API returned empty content.");
  }

  console.log(`✅ Thinker (Fallback): Received response (${text.length} chars)`);
  return text;
}

/**
 * Call Google Gemini API (FREE TIER)
 * Gemini 1.5 Flash and Pro have generous free quotas
 */
async function callGemini(
  prompt: string,
  config: AIModelConfig
): Promise<string> {
  // Initialize Gemini client
  const genAI = new GoogleGenerativeAI(config.apiKey);

  // Select the model
  const modelName = config.model === "gemini-flash"
    ? "gemini-2.5-flash"  // Fastest, most cost-effective
    : "gemini-2.5-pro";    // More capable

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 2048,
      responseMimeType: "application/json", // Force JSON output
    },
  });

  console.log(`🚀 Thinker: Sending request to ${modelName}...`);

  // Call the API
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  console.log(`✅ Thinker: Received response (${text.length} chars)`);

  return text;
}

/**
 * Parse the AI's JSON response
 */
function parseAIResponse(response: string): ThinkingResult {
  let cleaned = response.trim();
  // Strip markdown formatting if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\n/, "").replace(/\n```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);

    return {
      nextAction: parsed.nextAction,
      reasoning: parsed.reasoning,
      isGoalAchieved: parsed.isGoalAchieved,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("RAW RESPONSE WAS:", response);

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
 * NOTE: Gemini models are FREE for university/research projects within quota limits
 */
export function calculateCost(
  tokensUsed: number,
  model: string
): number {
  // Pricing per 1M tokens (Gemini is FREE within quota)
  const pricing: Record<string, number> = {
    "gemini-flash": 0.00,  // FREE (up to 15 requests/min, 1M tokens/min, 1500 requests/day)
    "gemini-pro": 0.00,    // FREE (up to 2 requests/min, 32K tokens/min, 50 requests/day)
    "gpt-4o": 5.00,        // NOT RECOMMENDED - costs money
  };

  const pricePerMillion = pricing[model] || 0.0;
  return (tokensUsed / 1_000_000) * pricePerMillion;
}
