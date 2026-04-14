// ============================================================================
// EMBEDDINGS - Generate Vector Representations of Elements
// ============================================================================
// This module generates embeddings (vectors) for elements and step descriptions
// Supports multiple providers:
// - OpenAI: text-embedding-3-small (1536 dimensions)
// - Gemini: text-embedding-004 (768 dimensions) - FREE!
// - Local: Simple hash-based (384 dimensions) - for testing
// ============================================================================

import type { ActionableElement } from "./observer";
import type { Action } from "./thinker";

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingConfig {
  provider: "openai" | "gemini" | "local";
  apiKey?: string;
  model?: string; // default: "text-embedding-3-small" for OpenAI, "gemini-embedding-001" for Gemini
}

// ============================================================================
// ELEMENT TO TEXT
// ============================================================================

/**
 * Convert an element to a text representation for embedding
 * This captures the "identity" of the element
 */
export function buildElementText(element: ActionableElement): string {
  const parts: string[] = [];

  // Tag name
  parts.push(`tag:${element.tagName}`);

  // Text content (most important for matching)
  if (element.text) {
    parts.push(`text:"${element.text.trim()}"`);
  }

  // Attributes that help identify the element
  if (element.attributes) {
    if (element.attributes.role) {
      parts.push(`role:${element.attributes.role}`);
    }
    if (element.attributes.type) {
      parts.push(`type:${element.attributes.type}`);
    }
    if (element.attributes.placeholder) {
      parts.push(`placeholder:"${element.attributes.placeholder}"`);
    }
    if (element.attributes.ariaLabel) {
      parts.push(`aria-label:"${element.attributes.ariaLabel}"`);
    }
    if (element.attributes.name) {
      parts.push(`name:${element.attributes.name}`);
    }
  }

  // Position context (helps distinguish between similar elements)
  parts.push(`position:${element.position.x},${element.position.y}`);

  return parts.join(" | ");
}

/**
 * Convert an action to a text representation for embedding
 * This captures the "intent" of the step
 */
export function buildActionText(action: Action): string {
  const parts: string[] = [];

  parts.push(`action:${action.type}`);
  parts.push(`description:"${action.description}"`);

  if (action.value) {
    parts.push(`value:"${action.value}"`);
  }

  return parts.join(" | ");
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(
  text: string,
  apiKey: string,
  model: string = "text-embedding-3-small"
): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("❌ Failed to generate OpenAI embedding:", error);
    throw error;
  }
}

/**
 * Generate embedding using Google Gemini API (FREE!)
 * Uses text-embedding-004 model (768 dimensions)
 */
async function generateGeminiEmbedding(
  text: string,
  apiKey: string,
  model: string = "gemini-embedding-001"
): Promise<number[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: {
            parts: [{ text }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.embedding.values;
  } catch (error) {
    console.error("❌ Failed to generate Gemini embedding:", error);
    throw error;
  }
}

/**
 * Generate a simple local embedding for testing (no API needed)
 * Uses a basic hash-based approach - NOT suitable for production
 */
function generateLocalEmbedding(text: string): number[] {
  // Create a simple 384-dimensional vector based on text
  const dimensions = 384;
  const vector: number[] = new Array(dimensions).fill(0);

  // Simple hash-based approach
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = charCode % dimensions;
    vector[index] += charCode / 1000;
  }

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => magnitude > 0 ? val / magnitude : 0);
}

/**
 * Main embedding generation function
 * Chooses provider based on config
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  if (config.provider === "openai") {
    if (!config.apiKey) {
      throw new Error("OpenAI API key required for OpenAI embeddings");
    }
    return generateOpenAIEmbedding(text, config.apiKey, config.model);
  } else if (config.provider === "gemini") {
    if (!config.apiKey) {
      throw new Error("Gemini API key required for Gemini embeddings");
    }
    return generateGeminiEmbedding(text, config.apiKey, config.model);
  } else {
    // Local embeddings for testing
    console.warn("⚠️  Using local embeddings (not suitable for production)");
    return generateLocalEmbedding(text);
  }
}

/**
 * Generate embedding for an element
 */
export async function generateElementEmbedding(
  element: ActionableElement,
  config: EmbeddingConfig
): Promise<number[]> {
  const text = buildElementText(element);
  return generateEmbedding(text, config);
}

/**
 * Generate embedding for an action/step
 */
export async function generateActionEmbedding(
  action: Action,
  config: EmbeddingConfig
): Promise<number[]> {
  const text = buildActionText(action);
  return generateEmbedding(text, config);
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns 0-1 where 1 is identical
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct / (magA * magB);
}
