// ============================================================================
// OBSERVER MODULE - DOM Snapshot & Selector Extraction
// ============================================================================
// This module captures the state of the web page and extracts actionable
// elements and their selectors for the AI agent to reason about.
// ============================================================================

import type { Page } from "puppeteer";

// ============================================================================
// TYPES
// ============================================================================

export interface DOMSnapshot {
  url: string;
  title: string;
  html: string; // Full HTML for context
  actionableElements: ActionableElement[];
  screenshot?: string; // Base64 encoded screenshot
  timestamp: Date;
}

export interface ActionableElement {
  id: string; // Unique identifier for this observation
  tagName: string;
  text?: string;
  attributes: Record<string, string>;
  selectors: ElementSelectors;
  position: { x: number; y: number };
  isVisible: boolean;
  isInteractive: boolean;
}

export interface ElementSelectors {
  css?: string; // CSS selector
  xpath?: string; // XPath selector
  testId?: string; // data-testid attribute
  ariaLabel?: string; // aria-label attribute
  placeholder?: string; // placeholder text
}

// ============================================================================
// OBSERVER FUNCTIONS
// ============================================================================

/**
 * Capture a snapshot of the current page state
 * This is the "Observe" step in the Agentic Loop
 */
export async function captureSnapshot(page: Page): Promise<DOMSnapshot> {
  console.log("📸 Observer: Capturing DOM snapshot...");

  // Get basic page info
  const url = page.url();
  const title = await page.title();

  // Get full HTML for context
  const html = await page.content();

  // Capture screenshot (optional, useful for debugging)
  const screenshot = await page.screenshot({ encoding: "base64" });

  // Extract all actionable elements
  const actionableElements = await extractActionableElements(page);

  const snapshot: DOMSnapshot = {
    url,
    title,
    html,
    actionableElements,
    screenshot,
    timestamp: new Date(),
  };

  console.log(`✅ Observer: Found ${actionableElements.length} actionable elements`);
  return snapshot;
}

/**
 * Extract all interactive/actionable elements from the page
 * These are elements the AI can click, type into, etc.
 */
async function extractActionableElements(page: Page): Promise<ActionableElement[]> {
  return await page.evaluate(() => {
    const elements: ActionableElement[] = [];
    
    // Target interactive elements
    const selectors = [
      'button',
      'a',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[onclick]',
      '[data-testid]',
    ];

    const nodes = document.querySelectorAll(selectors.join(','));

    nodes.forEach((node, index) => {
      const element = node as HTMLElement;
      
      // Check if element is visible and interactive
      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
                        window.getComputedStyle(element).visibility !== 'hidden' &&
                        window.getComputedStyle(element).display !== 'none';

      if (!isVisible) return; // Skip hidden elements

      // Extract text content
      const text = element.textContent?.trim() || 
                   (element as HTMLInputElement).value ||
                   element.getAttribute('aria-label') ||
                   element.getAttribute('placeholder') ||
                   '';

      // Extract attributes
      const attributes: Record<string, string> = {};
      Array.from(element.attributes).forEach(attr => {
        attributes[attr.name] = attr.value;
      });

      // Generate multiple selector strategies
      const selectors: ElementSelectors = {
        css: generateCSSSelector(element),
        xpath: generateXPathSelector(element),
        testId: element.getAttribute('data-testid') || undefined,
        ariaLabel: element.getAttribute('aria-label') || undefined,
        placeholder: element.getAttribute('placeholder') || undefined,
      };

      elements.push({
        id: `element-${index}`,
        tagName: element.tagName.toLowerCase(),
        text,
        attributes,
        selectors,
        position: { x: rect.left, y: rect.top },
        isVisible,
        isInteractive: true,
      });
    });

    return elements;

    // Helper: Generate CSS selector for an element
    function generateCSSSelector(element: Element): string {
      // Try ID first
      if (element.id) return `#${element.id}`;
      
      // Try data-testid
      const testId = element.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;

      // Try class + tag
      if (element.className) {
        const classes = element.className.split(' ').filter(c => c).join('.');
        if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
      }

      // Fallback to tag name
      return element.tagName.toLowerCase();
    }

    // Helper: Generate XPath for an element
    function generateXPathSelector(element: Element): string {
      if (element.id) return `//*[@id="${element.id}"]`;
      
      const testId = element.getAttribute('data-testid');
      if (testId) return `//*[@data-testid="${testId}"]`;

      // Simple XPath fallback
      return `//${element.tagName.toLowerCase()}`;
    }
  });
}

/**
 * Wait for page to be stable (no network activity, animations complete)
 */
export async function waitForPageStable(page: Page, timeout: number = 5000): Promise<void> {
  try {
    await page.waitForNetworkIdle({ timeout });
  } catch (error) {
    console.warn("⚠️ Observer: Page did not become idle within timeout");
  }
}

/**
 * Extract text content from the page (useful for verification)
 */
export async function extractPageText(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return document.body.innerText;
  });
}
