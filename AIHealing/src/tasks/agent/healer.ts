// ============================================================================
// HEALER MODULE — LLM-based Healing (Plan-then-Execute architecture)
// ============================================================================
// CURRENT (used by planExecute.ts):
//   llmHeal(descriptor, expectedAction, candidates, model)
//     → asks the LLM "which element on this page satisfies this user intent?"
//     → returns an element id + confidence
//
// LEGACY (commented-out below for reference):
//   healSelector + 4 strategies (Vector DB, exact text, Levenshtein,
//   structural similarity) — was used by the deprecated runAgentLoop in
//   index.ts. Preserved as `// `-prefixed lines so it can be revived if
//   ever needed.
// ============================================================================

// Type-only imports kept for the legacy block + active llmHeal.
import type { ActionableElement } from "./observer";
import type { AIModelConfig } from "./thinker";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// TYPES
// ============================================================================

// export interface HealingResult {
//   healed: boolean;
//   originalSelector: string;
//   healedSelector?: string;
//   selectorType?: "css" | "xpath" | "testId" | "aria";
//   confidence: number;
//   method: "vector-db" | "exact-match" | "text-similarity" | "structural-similarity" | "failed";
// }
// 
// export interface SelectorHistory {
//   action: Action;
//   element: ActionableElement;
//   timestamp: Date;
//   successful: boolean;
// }
// 
// // ============================================================================
// // HEALER FUNCTIONS
// // ============================================================================
// 
// /**
//  * Attempt to heal a broken selector using Vector DB first, then fallback strategies
//  * This is the "True RAG-based Healing" component with persistent memory
//  */
// export async function healSelector(
//   brokenAction: Action,
//   brokenElement: ActionableElement,
//   currentElements: ActionableElement[],
//   history: SelectorHistory[],
//   testSuiteId: string,
//   embeddingConfig: EmbeddingConfig
// ): Promise<HealingResult> {
//   console.log("🔧 Healer: Attempting to heal broken selector...");
// 
//   // Strategy 1: Try Vector Database lookup (PERSISTENT MEMORY)
//   try {
//     const elementText = `${brokenElement.tagName} ${brokenElement.text || ""}`.trim();
//     const embedding = await generateElementEmbedding(brokenElement, embeddingConfig);
//     
//     const vectorResult = await vectorSimilaritySearch(
//       testSuiteId,
//       brokenAction.description,
//       embedding,
//       currentElements
//     );
// 
//     if (vectorResult && vectorResult.confidence > 0.85) {
//       console.log(`✅ Healer: Found in Vector DB (${(vectorResult.confidence * 100).toFixed(1)}% confidence)`);
//       return {
//         healed: true,
//         originalSelector: brokenElement.selectors.css || brokenElement.selectors.xpath || "",
//         healedSelector: vectorResult.selector,
//         selectorType: vectorResult.selectorType,
//         confidence: vectorResult.confidence,
//         method: "vector-db",
//       };
//     }
//   } catch (error) {
//     console.warn("⚠️  Vector DB search failed, falling back to simple matching:", error);
//   }
// 
//   // Strategy 2: Try exact text match
//   const textMatch = findByExactText(brokenElement, currentElements);
//   if (textMatch) {
//     console.log("✅ Healer: Found exact text match");
//     return {
//       healed: true,
//       originalSelector: brokenElement.selectors.css || "",
//       healedSelector: textMatch.selectors.css,
//       selectorType: "css",
//       confidence: 0.95,
//       method: "exact-match",
//     };
//   }
// 
//   // Strategy 3: Try fuzzy text match (Levenshtein)
//   const similarText = findBySimilarText(brokenElement, currentElements);
//   if (similarText && similarText.element && similarText.confidence > 0.7) {
//     console.log(`✅ Healer: Found similar text (${(similarText.confidence * 100).toFixed(1)}% match)`);
//     return {
//       healed: true,
//       originalSelector: brokenElement.selectors.css || "",
//       healedSelector: similarText.element.selectors.css,
//       selectorType: "css",
//       confidence: similarText.confidence,
//       method: "text-similarity",
//     };
//   }
// 
//   // Strategy 4: Try structural similarity
//   const structuralMatch = findByStructuralSimilarity(brokenElement, currentElements);
//   if (structuralMatch && structuralMatch.element && structuralMatch.confidence > 0.6) {
//     console.log(`✅ Healer: Found structural match (${(structuralMatch.confidence * 100).toFixed(1)}% match)`);
//     return {
//       healed: true,
//       originalSelector: brokenElement.selectors.css || "",
//       healedSelector: structuralMatch.element.selectors.css,
//       selectorType: "css",
//       confidence: structuralMatch.confidence,
//       method: "structural-similarity",
//     };
//   }
// 
//   // All strategies failed
//   console.log("❌ Healer: Could not find alternative selector");
//   return {
//     healed: false,
//     originalSelector: brokenElement.selectors.css || "",
//     confidence: 0,
//     method: "failed",
//   };
// }
// 
// /**
//  * Find element by exact text match
//  */
// function findByExactText(
//   target: ActionableElement,
//   candidates: ActionableElement[]
// ): ActionableElement | null {
//   if (!target.text) return null;
// 
//   return candidates.find(el => 
//     el.text === target.text && 
//     el.tagName === target.tagName
//   ) || null;
// }
// 
// /**
//  * Find element by similar text using simple similarity scoring
//  */
// function findBySimilarText(
//   target: ActionableElement,
//   candidates: ActionableElement[]
// ): { element: ActionableElement; confidence: number } | null {
//   if (!target.text) return null;
// 
//   let bestMatch: { element: ActionableElement; confidence: number } | null = null;
// 
//   for (const candidate of candidates) {
//     if (!candidate.text || candidate.tagName !== target.tagName) continue;
// 
//     const similarity = calculateTextSimilarity(target.text, candidate.text);
//     
//     if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.confidence)) {
//       bestMatch = { element: candidate, confidence: similarity };
//     }
//   }
// 
//   return bestMatch;
// }
// 
// /**
//  * Find element by structural similarity
//  */
// function findByStructuralSimilarity(
//   target: ActionableElement,
//   candidates: ActionableElement[]
// ): { element: ActionableElement; confidence: number } | null {
//   let bestMatch: { element: ActionableElement; confidence: number } | null = null;
// 
//   for (const candidate of candidates) {
//     if (candidate.tagName !== target.tagName) continue;
// 
//     let score = 0;
//     let maxScore = 0;
// 
//     // Check attribute similarity
//     const targetAttrs = Object.keys(target.attributes);
//     const candidateAttrs = Object.keys(candidate.attributes);
// 
//     // Same classes
//     if (target.attributes.class && candidate.attributes.class) {
//       const targetClasses = target.attributes.class.split(' ');
//       const candidateClasses = candidate.attributes.class.split(' ');
//       const commonClasses = targetClasses.filter(c => candidateClasses.includes(c));
//       score += commonClasses.length;
//       maxScore += targetClasses.length;
//     }
// 
//     // Same type (for inputs)
//     if (target.attributes.type === candidate.attributes.type) {
//       score += 1;
//       maxScore += 1;
//     }
// 
//     // Same name
//     if (target.attributes.name === candidate.attributes.name) {
//       score += 1;
//       maxScore += 1;
//     }
// 
//     // Same placeholder
//     if (target.attributes.placeholder === candidate.attributes.placeholder) {
//       score += 1;
//       maxScore += 1;
//     }
// 
//     const confidence = maxScore > 0 ? score / maxScore : 0;
// 
//     if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
//       bestMatch = { element: candidate, confidence };
//     }
//   }
// 
//   return bestMatch;
// }
// 
// /**
//  * Calculate text similarity (simple Levenshtein-based)
//  */
// function calculateTextSimilarity(text1: string, text2: string): number {
//   const len1 = text1.length;
//   const len2 = text2.length;
// 
//   if (len1 === 0) return len2 === 0 ? 1 : 0;
//   if (len2 === 0) return 0;
// 
//   // Normalize texts
//   const normalized1 = text1.toLowerCase().trim();
//   const normalized2 = text2.toLowerCase().trim();
// 
//   if (normalized1 === normalized2) return 1;
// 
//   // Simple substring matching as a proxy for similarity
//   if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
//     const longerLength = Math.max(len1, len2);
//     const shorterLength = Math.min(len1, len2);
//     return shorterLength / longerLength;
//   }
// 
//   // Levenshtein distance (simplified)
//   const distance = levenshteinDistance(normalized1, normalized2);
//   const maxLength = Math.max(len1, len2);
//   
//   return 1 - (distance / maxLength);
// }
// 
// /**
//  * Calculate Levenshtein distance between two strings
//  */
// function levenshteinDistance(str1: string, str2: string): number {
//   const m = str1.length;
//   const n = str2.length;
//   const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
// 
//   for (let i = 0; i <= m; i++) dp[i][0] = i;
//   for (let j = 0; j <= n; j++) dp[0][j] = j;
// 
//   for (let i = 1; i <= m; i++) {
//     for (let j = 1; j <= n; j++) {
//       if (str1[i - 1] === str2[j - 1]) {
//         dp[i][j] = dp[i - 1][j - 1];
//       } else {
//         dp[i][j] = Math.min(
//           dp[i - 1][j] + 1,    // deletion
//           dp[i][j - 1] + 1,    // insertion
//           dp[i - 1][j - 1] + 1 // substitution
//         );
//       }
//     }
//   }
// 
//   return dp[m][n];
// }
// 
// /**
//  * Record a successful selector usage for future healing
//  */
// export function recordSuccess(
//   action: Action,
//   element: ActionableElement
// ): SelectorHistory {
//   return {
//     action,
//     element,
//     timestamp: new Date(),
//     successful: true,
//   };
// }
// 
// /**
//  * Record a failed selector usage
//  */
// export function recordFailure(
//   action: Action,
//   element: ActionableElement
// ): SelectorHistory {
//   return {
//     action,
//     element,
//     timestamp: new Date(),
//     successful: false,
//   };
// }
// 
// ============================================================================
// LLM-BASED HEALING (Plan-then-Execute architecture)
// ============================================================================
// When a step's cached selector no longer matches anything in the current DOM,
// we call this function. It hands the broken step's USER INTENT (the
// descriptor) plus the fresh DOM to an LLM and asks: "which element on this
// page satisfies this intent?".
//
// This is the canonical "RAG healing" path:
//   - Retrieve  → cached descriptor pulled from vector DB
//   - Augment   → that descriptor + the current DOM
//   - Generate  → LLM picks the best matching element id
// ============================================================================

export interface LlmHealResult {
  healed: boolean;
  elementId: string | null; // refers to ActionableElement.id in the snapshot
  confidence: number; // 0-1, self-reported by the LLM
  reasoning: string;
}

export async function llmHeal(
  descriptor: string,
  expectedAction: string,
  candidates: ActionableElement[],
  config: AIModelConfig
): Promise<LlmHealResult> {
  console.log(`🤖 LLM: searching for an element that satisfies "${descriptor}"`);

  if (candidates.length === 0) {
    return {
      healed: false,
      elementId: null,
      confidence: 0,
      reasoning: "No candidate elements were available in the current DOM.",
    };
  }

  const prompt = buildHealerPrompt(descriptor, expectedAction, candidates);
  const response = await callHealerLLM(prompt, config);
  const parsed = parseHealerResponse(response);

  if (!parsed.elementId) {
    console.log("❌ LLM Healer: could not identify a matching element");
    return {
      healed: false,
      elementId: null,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  }

  // Verify the LLM's pick actually exists in the candidate list (defence
  // against hallucinated ids).
  const valid = candidates.some((el) => el.id === parsed.elementId);
  if (!valid) {
    console.log(`⚠️  LLM Healer: returned unknown element id "${parsed.elementId}" — rejecting`);
    return {
      healed: false,
      elementId: null,
      confidence: 0,
      reasoning: `LLM returned id "${parsed.elementId}" which isn't in the candidate list (likely hallucination).`,
    };
  }

  console.log(`✅ LLM Healer: matched "${descriptor}" → element ${parsed.elementId} (${(parsed.confidence * 100).toFixed(0)}% confidence)`);
  return {
    healed: true,
    elementId: parsed.elementId,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
  };
}

function buildHealerPrompt(
  descriptor: string,
  expectedAction: string,
  candidates: ActionableElement[]
): string {
  // Trim and prioritise the candidate list (same heuristic as the Thinker).
  const trimmed = [...candidates]
    .sort((a, b) => {
      const ap = ["button", "input", "a", "select", "textarea"].includes(a.tagName.toLowerCase()) ? 1 : 0;
      const bp = ["button", "input", "a", "select", "textarea"].includes(b.tagName.toLowerCase()) ? 1 : 0;
      return bp - ap;
    })
    .slice(0, 80);

  const elementsBlock = trimmed
    .map((el) => {
      const text = (el.text || "").trim().slice(0, 60);
      const attrs = el.attributes || {};
      const placeholder = attrs.placeholder || "";
      const aria = attrs["aria-label"] || (attrs as any).ariaLabel || "";
      const role = attrs.role || "";
      const detail = [
        text && `text:"${text}"`,
        placeholder && `placeholder:"${placeholder}"`,
        aria && `aria:"${aria}"`,
        role && `role:"${role}"`,
      ]
        .filter(Boolean)
        .join(" ");
      return `[${el.id}] ${el.tagName.toLowerCase()} ${detail}`.trim();
    })
    .join("\n");

  return `You are a self-healing test automation agent. The selector for the step below no longer matches anything on the page (the page was likely redesigned). Find the element that satisfies the user intent.

STEP DESCRIPTOR (user intent):
"${descriptor}"

EXPECTED ACTION TYPE: ${expectedAction}

ACTIONABLE ELEMENTS ON THE CURRENT PAGE:
${elementsBlock}

INSTRUCTIONS:
1. Pick exactly one element id whose role/text/placeholder/aria best satisfies the descriptor.
2. Prefer matches by visible text or aria-label. Then placeholder. Then role+tag.
3. If NO element on the page reasonably matches the intent, return elementId: null.
4. Confidence should reflect how unambiguous the match is (1.0 = identical text, 0.5 = inferred from context, 0.0 = no match).

OUTPUT FORMAT (strict JSON, no markdown):
{
  "elementId": "el_3",
  "confidence": 0.95,
  "reasoning": "Element [el_3] is a BUTTON with visible text 'Search' which exactly matches the user intent 'Click the Search button'."
}

If no element matches:
{
  "elementId": null,
  "confidence": 0.0,
  "reasoning": "No element on this page corresponds to the requested user intent."
}`;
}

async function callHealerLLM(prompt: string, config: AIModelConfig): Promise<string> {
  if (config.model === "gemini-flash" || config.model === "gemini-pro") {
    try {
      return await callHealerGemini(prompt, config);
    } catch (geminiErr: any) {
      console.warn("⚠️ LLM Healer: Gemini failed, falling back to Llama 3.3:", geminiErr.message);
      try {
        return await callHealerGroq(prompt, "llama-3.3-70b-versatile");
      } catch (l33Err: any) {
        console.warn("⚠️ LLM Healer: Llama 3.3 failed, cascading to Llama 3.1:", l33Err.message);
        return await callHealerGroq(prompt, "llama-3.1-8b-instant");
      }
    }
  }
  throw new Error(`LLM Healer: Unsupported model ${config.model}`);
}

async function callHealerGemini(prompt: string, config: AIModelConfig): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const modelName = config.model === "gemini-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1, // Healing should be deterministic
      maxOutputTokens: 600,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callHealerGroq(prompt: string, modelName: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("No GROQ_API_KEY in env for LLM healer fallback.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM healer fallback API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("LLM healer fallback returned empty content.");
  return text;
}

function parseHealerResponse(response: string): {
  elementId: string | null;
  confidence: number;
  reasoning: string;
} {
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\n/, "").replace(/\n```$/, "");
  else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\n/, "").replace(/\n```$/, "");

  try {
    const parsed = JSON.parse(cleaned);
    return {
      elementId: parsed.elementId === null || parsed.elementId === undefined ? null : String(parsed.elementId),
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  } catch (err) {
    console.error("❌ LLM Healer: failed to parse response:", err);
    return { elementId: null, confidence: 0, reasoning: "Healer response was unparseable." };
  }
}
