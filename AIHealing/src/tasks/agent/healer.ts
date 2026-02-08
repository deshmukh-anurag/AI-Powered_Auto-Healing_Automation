// ============================================================================
// HEALER MODULE - RAG-based Selector Healing
// ============================================================================
// This module implements the self-healing capability using vector similarity
// to find alternative selectors when the original ones break.
// ============================================================================

import type { ActionableElement, ElementSelectors } from "./observer";
import type { Action } from "./thinker";

// ============================================================================
// TYPES
// ============================================================================

export interface HealingResult {
  healed: boolean;
  originalSelector: string;
  healedSelector?: string;
  confidence: number;
  method: "exact-match" | "text-similarity" | "structural-similarity" | "failed";
}

export interface SelectorHistory {
  action: Action;
  element: ActionableElement;
  timestamp: Date;
  successful: boolean;
}

// ============================================================================
// HEALER FUNCTIONS
// ============================================================================

/**
 * Attempt to heal a broken selector by finding a similar element
 * This is the "RAG-based Healing" component
 */
export async function healSelector(
  brokenAction: Action,
  brokenElement: ActionableElement,
  currentElements: ActionableElement[],
  history: SelectorHistory[]
): Promise<HealingResult> {
  console.log("🔧 Healer: Attempting to heal broken selector...");

  // Strategy 1: Try exact text match first
  const textMatch = findByExactText(brokenElement, currentElements);
  if (textMatch) {
    console.log("✅ Healer: Found exact text match");
    return {
      healed: true,
      originalSelector: brokenElement.selectors.css || "",
      healedSelector: textMatch.selectors.css,
      confidence: 0.95,
      method: "exact-match",
    };
  }

  // Strategy 2: Try similar text (fuzzy matching)
  const similarTextMatch = findBySimilarText(brokenElement, currentElements);
  if (similarTextMatch && similarTextMatch.confidence > 0.7) {
    console.log("✅ Healer: Found similar text match");
    return {
      healed: true,
      originalSelector: brokenElement.selectors.css || "",
      healedSelector: similarTextMatch.element.selectors.css,
      confidence: similarTextMatch.confidence,
      method: "text-similarity",
    };
  }

  // Strategy 3: Try structural similarity (same tag, similar attributes)
  const structuralMatch = findByStructuralSimilarity(brokenElement, currentElements);
  if (structuralMatch && structuralMatch.confidence > 0.6) {
    console.log("✅ Healer: Found structural match");
    return {
      healed: true,
      originalSelector: brokenElement.selectors.css || "",
      healedSelector: structuralMatch.element.selectors.css,
      confidence: structuralMatch.confidence,
      method: "structural-similarity",
    };
  }

  console.log("❌ Healer: Unable to heal selector");
  return {
    healed: false,
    originalSelector: brokenElement.selectors.css || "",
    confidence: 0,
    method: "failed",
  };
}

/**
 * Find element by exact text match
 */
function findByExactText(
  target: ActionableElement,
  candidates: ActionableElement[]
): ActionableElement | null {
  if (!target.text) return null;

  return candidates.find(el => 
    el.text === target.text && 
    el.tagName === target.tagName
  ) || null;
}

/**
 * Find element by similar text using simple similarity scoring
 */
function findBySimilarText(
  target: ActionableElement,
  candidates: ActionableElement[]
): { element: ActionableElement; confidence: number } | null {
  if (!target.text) return null;

  let bestMatch: { element: ActionableElement; confidence: number } | null = null;

  for (const candidate of candidates) {
    if (!candidate.text || candidate.tagName !== target.tagName) continue;

    const similarity = calculateTextSimilarity(target.text, candidate.text);
    
    if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = { element: candidate, confidence: similarity };
    }
  }

  return bestMatch;
}

/**
 * Find element by structural similarity
 */
function findByStructuralSimilarity(
  target: ActionableElement,
  candidates: ActionableElement[]
): { element: ActionableElement; confidence: number } | null {
  let bestMatch: { element: ActionableElement; confidence: number } | null = null;

  for (const candidate of candidates) {
    if (candidate.tagName !== target.tagName) continue;

    let score = 0;
    let maxScore = 0;

    // Check attribute similarity
    const targetAttrs = Object.keys(target.attributes);
    const candidateAttrs = Object.keys(candidate.attributes);

    // Same classes
    if (target.attributes.class && candidate.attributes.class) {
      const targetClasses = target.attributes.class.split(' ');
      const candidateClasses = candidate.attributes.class.split(' ');
      const commonClasses = targetClasses.filter(c => candidateClasses.includes(c));
      score += commonClasses.length;
      maxScore += targetClasses.length;
    }

    // Same type (for inputs)
    if (target.attributes.type === candidate.attributes.type) {
      score += 1;
      maxScore += 1;
    }

    // Same name
    if (target.attributes.name === candidate.attributes.name) {
      score += 1;
      maxScore += 1;
    }

    // Same placeholder
    if (target.attributes.placeholder === candidate.attributes.placeholder) {
      score += 1;
      maxScore += 1;
    }

    const confidence = maxScore > 0 ? score / maxScore : 0;

    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { element: candidate, confidence };
    }
  }

  return bestMatch;
}

/**
 * Calculate text similarity (simple Levenshtein-based)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // Normalize texts
  const normalized1 = text1.toLowerCase().trim();
  const normalized2 = text2.toLowerCase().trim();

  if (normalized1 === normalized2) return 1;

  // Simple substring matching as a proxy for similarity
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const longerLength = Math.max(len1, len2);
    const shorterLength = Math.min(len1, len2);
    return shorterLength / longerLength;
  }

  // Levenshtein distance (simplified)
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(len1, len2);
  
  return 1 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Record a successful selector usage for future healing
 */
export function recordSuccess(
  action: Action,
  element: ActionableElement
): SelectorHistory {
  return {
    action,
    element,
    timestamp: new Date(),
    successful: true,
  };
}

/**
 * Record a failed selector usage
 */
export function recordFailure(
  action: Action,
  element: ActionableElement
): SelectorHistory {
  return {
    action,
    element,
    timestamp: new Date(),
    successful: false,
  };
}
