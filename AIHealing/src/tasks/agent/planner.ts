// ============================================================================
// PLANNER MODULE - Test Suite Decomposition (Plan-then-Execute)
// ============================================================================
// Converts a high-level goal + the starting page DOM into a fixed list of
// stable step descriptors. This runs ONCE per test suite. The descriptors
// become the cache identity for each step — stable across runs, stable across
// LLM models (Gemini / Llama / etc), because the plan is generated once.
//
// The descriptors must be written in terms of *user intent*, NOT selectors:
//   ✅ "Click the Search button to submit the query"
//   ❌ "Click #search-btn"
//
// This way the same descriptor matches the same element across runs even when
// the underlying selectors change.
// ============================================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DOMSnapshot } from "./observer";
import type { AIModelConfig } from "./thinker";

// ============================================================================
// TYPES
// ============================================================================

export interface PlanStep {
  id: number; // 1-indexed sequential position
  descriptor: string; // user-intent description; cache identity
  expectedAction: "click" | "type" | "select" | "wait" | "navigate" | "verify";
  expectedValue?: string; // text to type, URL to navigate, etc.
}

export interface PlanResult {
  steps: PlanStep[];
  reasoning: string;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function planTestSuite(
  goal: string,
  startingSnapshot: DOMSnapshot,
  config: AIModelConfig
): Promise<PlanResult> {
  console.log("📋 Planner: Decomposing goal into a stable plan...");

  const prompt = buildPlannerPrompt(goal, startingSnapshot);
  const response = await callPlannerLLM(prompt, config);
  const result = parsePlannerResponse(response);

  console.log(`✅ Planner: Produced ${result.steps.length} steps`);
  result.steps.forEach((s) => {
    console.log(`   ${s.id}. [${s.expectedAction}] ${s.descriptor}`);
  });

  return result;
}

// ============================================================================
// PROMPT
// ============================================================================

function buildPlannerPrompt(goal: string, snapshot: DOMSnapshot): string {
  // Trim and prioritise so the prompt fits in a small token budget.
  const elements = [...snapshot.actionableElements]
    .sort((a, b) => {
      const ap = ["button", "input", "a", "select"].includes(a.tagName.toLowerCase()) ? 1 : 0;
      const bp = ["button", "input", "a", "select"].includes(b.tagName.toLowerCase()) ? 1 : 0;
      return bp - ap;
    })
    .slice(0, 80);

  const elementsBlock = elements
    .map((el) => {
      const text = (el.text || "").trim().slice(0, 60);
      const placeholder = el.attributes?.placeholder || "";
      const aria = el.attributes?.["aria-label"] || (el as any).attributes?.ariaLabel || "";
      const role = el.attributes?.role || "";
      const detail = [text && `text:"${text}"`, placeholder && `placeholder:"${placeholder}"`, aria && `aria:"${aria}"`, role && `role:"${role}"`]
        .filter(Boolean)
        .join(" ");
      return `- ${el.tagName.toLowerCase()} ${detail}`.trim();
    })
    .join("\n");

  return `You are a senior QA engineer. Decompose the following goal into an ordered, deterministic plan of UI actions.

GOAL:
${goal}

STARTING PAGE:
URL:   ${snapshot.url}
TITLE: ${snapshot.title}

VISIBLE ACTIONABLE ELEMENTS (truncated):
${elementsBlock}

RULES FOR DESCRIPTORS:
- Write each step in terms of USER INTENT, never CSS selectors or DOM ids.
- Reference elements by their visible text, label, placeholder, or role.
- Be concise but unambiguous (e.g. "Click the Search button" not "Click on it").
- The same descriptor must work even if the page is later redesigned and ids/classes change.
- Cap the plan at ~6 steps. Do not invent verification steps unless the goal asks for them.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "reasoning": "1-2 sentences on how you decomposed the goal",
  "steps": [
    {
      "id": 1,
      "descriptor": "Type 'headphones' into the product search field",
      "expectedAction": "type",
      "expectedValue": "headphones"
    },
    {
      "id": 2,
      "descriptor": "Click the Search button",
      "expectedAction": "click"
    }
  ]
}

The "expectedAction" MUST be one of: click | type | select | wait | navigate | verify.
For "type" actions, ALWAYS include "expectedValue".`;
}

// ============================================================================
// LLM CALL (mirrors thinker.ts fallback chain)
// ============================================================================

async function callPlannerLLM(prompt: string, config: AIModelConfig): Promise<string> {
  console.log("🤖 Planner: Calling AI model:", config.model);

  if (config.model === "gemini-flash" || config.model === "gemini-pro") {
    try {
      const text = await callGemini(prompt, config);
      // Validate JSON
      try {
        const cleaned = text.trim().replace(/^```(json)?\n?|\n?```$/gi, "");
        JSON.parse(cleaned);
      } catch {
        throw new Error("Gemini returned malformed JSON");
      }
      return text;
    } catch (geminiErr: any) {
      console.warn("⚠️ Planner: Gemini failed, falling back to Llama 3.3:", geminiErr.message);
      try {
        return await callGroqFallback(prompt, config, "llama-3.3-70b-versatile");
      } catch (l33Err: any) {
        console.warn("⚠️ Planner: Llama 3.3 failed, cascading to Llama 3.1:", l33Err.message);
        return await callGroqFallback(prompt, config, "llama-3.1-8b-instant");
      }
    }
  }
  throw new Error(`Planner: Unsupported model ${config.model}`);
}

async function callGemini(prompt: string, config: AIModelConfig): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const modelName = config.model === "gemini-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2, // Plans should be deterministic
      maxOutputTokens: 1500,
      responseMimeType: "application/json",
    },
  });
  console.log(`🚀 Planner: Sending request to ${modelName}...`);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  console.log(`✅ Planner: Received response (${text.length} chars)`);
  return text;
}

async function callGroqFallback(
  prompt: string,
  _config: AIModelConfig,
  modelName: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("No GROQ_API_KEY in env for Planner fallback.");

  const url = "https://api.groq.com/openai/v1/chat/completions";
  console.log(`🚀 Planner (Fallback): Sending request to ${modelName}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Planner fallback API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Planner fallback API returned empty content.");
  console.log(`✅ Planner (Fallback): Received response (${text.length} chars)`);
  return text;
}

// ============================================================================
// PARSER
// ============================================================================

function parsePlannerResponse(response: string): PlanResult {
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\n/, "").replace(/\n```$/, "");
  else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\n/, "").replace(/\n```$/, "");

  try {
    const parsed = JSON.parse(cleaned);
    const steps: PlanStep[] = Array.isArray(parsed.steps)
      ? parsed.steps
          .filter((s: any) => s && typeof s.descriptor === "string" && typeof s.expectedAction === "string")
          .map((s: any, idx: number) => ({
            id: typeof s.id === "number" ? s.id : idx + 1,
            descriptor: String(s.descriptor).trim(),
            expectedAction: s.expectedAction,
            expectedValue: s.expectedValue ?? undefined,
          }))
      : [];

    return {
      steps,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  } catch (err) {
    console.error("❌ Planner: failed to parse response:", err);
    console.error("RAW:", response);
    return { steps: [], reasoning: "Planner failed to produce a valid plan." };
  }
}
