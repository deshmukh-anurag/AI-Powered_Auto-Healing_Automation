// ============================================================================
// VECTOR DATABASE - Persistent RAG Memory
// ============================================================================
// This module provides the "Golden State" storage for self-healing tests
// Uses ChromaDB for semantic similarity search with OpenAI embeddings
// ============================================================================

import { ChromaClient } from "chromadb";
import type { ActionableElement } from "./observer";

// ============================================================================
// TYPES
// ============================================================================

export interface GoldenState {
  id: string;
  stepDescription: string;
  selector: string;
  selectorType: "css" | "xpath" | "testId" | "aria";
  embedding: number[];
  elementMetadata: {
    tagName: string;
    text?: string;
    role?: string;
    type?: string;
    placeholder?: string;
  };
  successCount: number;
  lastUsedAt: Date;
  testSuiteId: string;
}

export interface VectorSearchResult {
  selector: string;
  selectorType: "css" | "xpath" | "testId" | "aria";
  confidence: number; // 0-1 similarity score
  metadata: GoldenState["elementMetadata"];
}

// ============================================================================
// CHROMADB CLIENT
// ============================================================================

let chromaClient: ChromaClient | null = null;
const COLLECTION_NAME = "golden_states";

/**
 * Initialize ChromaDB connection
 */
async function getChromaClient(): Promise<ChromaClient> {
  if (!chromaClient) {
    chromaClient = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }
  return chromaClient;
}

/**
 * Get or create the golden states collection
 */
async function getCollection() {
  const client = await getChromaClient();
  
  try {
    return await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" }, // Use cosine similarity
    });
  } catch (error) {
    console.error("❌ Failed to get/create collection:", error);
    throw error;
  }
}

// ============================================================================
// CORE RAG FUNCTIONS
// ============================================================================

/**
 * Save a successful selector as "Golden State" in the Vector DB
 * This is called AFTER every successful action
 */
export async function saveGoldenState(
  testSuiteId: string,
  stepDescription: string,
  selector: string,
  selectorType: "css" | "xpath" | "testId" | "aria",
  element: ActionableElement,
  embedding: number[],
  stepNumber?: number
): Promise<void> {
  try {
    const collection = await getCollection();

    // Prefer deterministic step-number keying when provided so that the cache
    // is stable across runs even when the LLM phrases descriptions differently.
    // Fall back to description-based ID for callers that don't pass stepNumber.
    const id = stepNumber !== undefined
      ? `${testSuiteId}_step_${stepNumber}`
      : `${testSuiteId}_${stepDescription.replace(/\s+/g, "_")}`;
    
    const metadata: GoldenState["elementMetadata"] = {
      tagName: element.tagName,
      text: element.text,
      role: element.attributes.role,
      type: element.attributes.type,
      placeholder: element.attributes.placeholder,
    };

    // Check if this step already exists
    const existing = await collection.get({ ids: [id] });
    
    if (existing.ids.length > 0) {
      // Update existing entry (increment success count)
      await collection.update({
        ids: [id],
        embeddings: [embedding],
        metadatas: [{
          testSuiteId,
          stepDescription,
          selector,
          selectorType,
          ...metadata,
          successCount: (existing.metadatas[0]?.successCount as number || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        }],
      });
      
      console.log(`✅ Updated Golden State: ${stepDescription} (Success count: ${(existing.metadatas[0]?.successCount as number || 0) + 1})`);
    } else {
      // Create new entry
      await collection.add({
        ids: [id],
        embeddings: [embedding],
        metadatas: [{
          testSuiteId,
          stepDescription,
          selector,
          selectorType,
          ...metadata,
          successCount: 1,
          lastUsedAt: new Date().toISOString(),
        }],
      });
      
      console.log(`✅ Saved new Golden State: ${stepDescription}`);
    }
  } catch (error) {
    console.error("❌ Failed to save Golden State:", error);
    // Don't throw - we don't want to break the test if DB save fails
  }
}

/**
 * Find a persistent selector from previous successful runs
 * This is called BEFORE each action to check if we have "memory" of this step
 */
export async function findPersistentSelector(
  testSuiteId: string,
  stepDescription: string,
  embedding: number[],
  stepNumber?: number
): Promise<VectorSearchResult | null> {
  try {
    const collection = await getCollection();

    // 1a. PREFERRED: deterministic step-number lookup. This is the only path
    //     that's stable across runs when the LLM rewords descriptions.
    //     CRITICAL: when stepNumber is provided, we MUST NOT fall back to
    //     semantic search — doing so leaks step N-1's selector into step N's
    //     slot when there's no entry yet, which corrupts the cache.
    if (stepNumber !== undefined) {
      const stepId = `${testSuiteId}_step_${stepNumber}`;
      const stepMatch = await collection.get({ ids: [stepId] });

      if (stepMatch.ids.length > 0) {
        const metadata = stepMatch.metadatas[0] as any;
        console.log(`🔍 Found cached selector for step ${stepNumber}: "${metadata.selector}" (saved for: "${metadata.stepDescription}")`);
        return {
          selector: metadata.selector,
          selectorType: metadata.selectorType,
          confidence: 1.0,
          metadata: {
            tagName: metadata.tagName,
            text: metadata.text,
            role: metadata.role,
            type: metadata.type,
            placeholder: metadata.placeholder,
          },
        };
      }

      // Step number was provided but no entry exists for this step yet —
      // this is a fresh step, treat as cache miss (no semantic fallback).
      console.log(`🔍 Vector DB: no cached selector yet for step ${stepNumber} (first time)`);
      return null;
    }

    // 1b. LEGACY: exact description lookup (kept for backwards compat with
    //     callers that don't pass stepNumber, e.g. the healer's RAG strategy).
    const id = `${testSuiteId}_${stepDescription.replace(/\s+/g, "_")}`;
    const exactMatch = await collection.get({ ids: [id] });

    if (exactMatch.ids.length > 0) {
      const metadata = exactMatch.metadatas[0] as any;
      console.log(`🔍 Found exact persistent selector for: ${stepDescription}`);
      return {
        selector: metadata.selector,
        selectorType: metadata.selectorType,
        confidence: 1.0,
        metadata: {
          tagName: metadata.tagName,
          text: metadata.text,
          role: metadata.role,
          type: metadata.type,
          placeholder: metadata.placeholder,
        },
      };
    }

    // 2. Query for similar steps (semantic search) if exact ID didn't match
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 1,
      where: { testSuiteId }, // Only search within this test suite
    });

    if (results.ids[0]?.length > 0 && results.distances && results.distances[0]?.length > 0) {
      const distance = results.distances[0][0];

      if (distance === null || distance === undefined) {
        console.log("🔍 Vector DB: nearest neighbour had null distance — skipping");
        return null;
      }

      const confidence = 1 - distance; // L2 distance → similarity (0-1)

      // STRICT threshold (0.92) — only accept near-identical descriptors.
      //
      // Why so high? Different action types like "Type X into search field" vs
      // "Click Y button" share enough grammatical structure that embeddings
      // give them ~0.7-0.85 cosine similarity even though they refer to
      // DIFFERENT steps. With a low threshold, step 2 of a run was getting
      // matched to step 1's cached entry, returning the wrong selector.
      //
      // We rely on the exact-ID lookup (above) for stable descriptor matching
      // across runs — the planner uses temperature 0.2 and a deterministic
      // fallback chain, so descriptors are reproducible. Semantic search is
      // only the safety net for slight rewording, which should still be ≥0.92.
      const THRESHOLD = 0.92;
      console.log(`🔍 Vector DB: nearest neighbour confidence ${(confidence * 100).toFixed(1)}% (threshold ${THRESHOLD * 100}%)`);

      if (confidence > THRESHOLD) {
        const metadata = results.metadatas[0]?.[0] as any;
        console.log(`🔍 Found similar persistent selector with ${(confidence * 100).toFixed(1)}% confidence`);

        return {
          selector: metadata.selector,
          selectorType: metadata.selectorType,
          confidence,
          metadata: {
            tagName: metadata.tagName,
            text: metadata.text,
            role: metadata.role,
            type: metadata.type,
            placeholder: metadata.placeholder,
          },
        };
      }
    } else {
      console.log("🔍 Vector DB: no neighbours returned for this suite");
    }

    return null;
  } catch (error) {
    console.error("❌ Failed to find persistent selector:", error);
    return null;
  }
}

/**
 * Update a persistent selector after successful healing
 * This replaces the old broken selector with the new working one
 */
export async function updatePersistentSelector(
  testSuiteId: string,
  stepDescription: string,
  newSelector: string,
  selectorType: "css" | "xpath" | "testId" | "aria",
  embedding: number[],
  stepNumber?: number
): Promise<void> {
  try {
    const collection = await getCollection();
    const id = stepNumber !== undefined
      ? `${testSuiteId}_step_${stepNumber}`
      : `${testSuiteId}_${stepDescription.replace(/\s+/g, "_")}`;
    
    // Fetch existing metadata to avoid losing fields
    const existing = await collection.get({ ids: [id] });
    const existingMetadata = existing.metadatas[0] || {};
    
    // Update the selector while preserving other metadata
    await collection.update({
      ids: [id],
      embeddings: [embedding],
      metadatas: [{
        ...existingMetadata,
        selector: newSelector,
        selectorType,
        lastUsedAt: new Date().toISOString(),
      }],
    });
    
    console.log(`✅ Updated persistent selector for: ${stepDescription}`);
  } catch (error) {
    console.error("❌ Failed to update persistent selector:", error);
  }
}

/**
 * Perform vector similarity search to find the best matching element
 * This is the core RAG healing function
 */
export async function vectorSimilaritySearch(
  testSuiteId: string,
  stepDescription: string,
  targetEmbedding: number[],
  currentElements: ActionableElement[]
): Promise<VectorSearchResult | null> {
  try {
    // First, check if we have a known good selector in the DB
    const knownSelector = await findPersistentSelector(
      testSuiteId,
      stepDescription,
      targetEmbedding
    );

    if (knownSelector) {
      // CRITICAL: Validate that the cached selector still exists in the current
      // DOM. If it doesn't, the cached result is stale (selector drift) — we
      // MUST return null so the healer falls through to text/structural
      // similarity strategies that actually inspect the live DOM. Without this
      // check, the healer would "heal" by returning the same broken selector.
      const t = knownSelector.selectorType;
      const stillExists = currentElements.some(el => {
        if (t === "css") return el.selectors.css === knownSelector.selector;
        if (t === "xpath") return el.selectors.xpath === knownSelector.selector;
        if (t === "testId") return el.selectors.testId === knownSelector.selector;
        if (t === "aria") return el.selectors.ariaLabel === knownSelector.selector;
        return false;
      });

      if (stillExists) {
        return knownSelector;
      }

      console.log(`⚠️  Cached selector "${knownSelector.selector}" not found in current DOM — falling through to similarity-based healing`);
      return null;
    }

    // If not in DB, fall through to non-RAG healing strategies
    console.log("🔍 No persistent selector found, falling through to similarity-based healing");
    return null;
  } catch (error) {
    console.error("❌ Vector similarity search failed:", error);
    return null;
  }
}

/**
 * Get all golden states for a test suite
 * Useful for debugging and viewing what's in the DB
 */
export async function getGoldenStates(testSuiteId: string): Promise<GoldenState[]> {
  try {
    const collection = await getCollection();
    
    const results = await collection.get({
      where: { testSuiteId },
    });

    return results.ids.map((id, index) => ({
      id,
      ...(results.metadatas[index] as any),
      embedding: results.embeddings ? results.embeddings[index] : [],
    }));
  } catch (error) {
    console.error("❌ Failed to get golden states:", error);
    return [];
  }
}

/**
 * Clear all golden states for a test suite
 * Useful for resetting learned knowledge
 */
export async function clearGoldenStates(testSuiteId: string): Promise<void> {
  try {
    const collection = await getCollection();
    
    const results = await collection.get({
      where: { testSuiteId },
    });

    if (results.ids.length > 0) {
      await collection.delete({
        ids: results.ids,
      });
      
      console.log(`✅ Cleared ${results.ids.length} golden states`);
    }
  } catch (error) {
    console.error("❌ Failed to clear golden states:", error);
  }
}
