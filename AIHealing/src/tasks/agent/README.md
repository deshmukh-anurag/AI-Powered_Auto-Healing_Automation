# AI Agent Core - Self-Healing Automation Engine

This module implements the core AI agent that powers the self-healing test automation.

## Architecture: Observe → Think → Act Loop

```
┌─────────────────────────────────────────────────────┐
│                   AGENT LOOP                        │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │ OBSERVE  │ ──>│  THINK   │ ──>│   ACT    │    │
│  └──────────┘    └──────────┘    └──────────┘    │
│       │               │                │           │
│       │               │                │           │
│       v               v                v           │
│  DOM Snapshot    AI Reasoning    Execute Action   │
│  + Selectors     (Gemini/GPT)    (Puppeteer)      │
│                                                     │
│                       │                             │
│                       v                             │
│                  ┌──────────┐                      │
│                  │  HEALER  │                      │
│                  └──────────┘                      │
│                  RAG-based Selector Healing        │
└─────────────────────────────────────────────────────┘
```

## Modules

### 1. Observer (`observer.ts`)
**Responsibility**: Capture the current state of the web page

- Extracts all interactive elements (buttons, inputs, links)
- Generates multiple selector strategies for each element:
  - CSS selectors
  - XPath selectors  
  - data-testid attributes
  - ARIA labels
- Takes screenshots for debugging
- Provides page context to the AI

### 2. Thinker (`thinker.ts`)
**Responsibility**: Use AI to decide the next action

- Sends page snapshot to LLM (Gemini Flash/Pro or GPT-4o)
- AI analyzes the page and decides:
  - Is the goal achieved?
  - What action should we take next?
  - Which element to interact with?
- Returns structured decision with confidence score
- Tracks token usage for cost calculation

### 3. Actor (`actor.ts`)
**Responsibility**: Execute browser actions

Supported actions:
- `click` - Click on an element
- `type` - Type text into an input field
- `select` - Choose from a dropdown
- `wait` - Wait for a specified time
- `navigate` - Go to a different URL
- `verify` - Check if text exists on page

Each action tries multiple selector strategies until one succeeds.

### 4. Healer (`healer.ts`)
**Responsibility**: Fix broken selectors automatically

When a selector fails, the healer attempts multiple strategies:

1. **Exact Text Match**: Find element with same text content
2. **Fuzzy Text Match**: Find element with similar text (using Levenshtein distance)
3. **Structural Similarity**: Find element with similar attributes (same tag, classes, etc.)

Each healing attempt has a confidence score. Only high-confidence heals are applied.

### 5. Orchestrator (`index.ts`)
**Responsibility**: Coordinate the entire loop

- Manages the Observe → Think → Act cycle
- Handles healing when actions fail
- Tracks metrics (steps, healing rate, cost)
- Generates detailed execution logs
- Implements max steps and timeout protection

## Usage Example

```typescript
import { runAgentLoop } from './agent';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

const result = await runAgentLoop(page, {
  goal: "Login with test@example.com and password123, then verify dashboard",
  startUrl: "https://myapp.com/login",
  maxSteps: 10,
  timeout: 30000,
  aiModel: {
    model: "gemini-flash",
    apiKey: process.env.GEMINI_API_KEY!,
    temperature: 0.7,
  }
});

console.log(`Success: ${result.success}`);
console.log(`Steps: ${result.totalSteps}`);
console.log(`Healed: ${result.healedSteps}`);
console.log(`Cost: $${result.totalCost.toFixed(3)}`);

await browser.close();
```

## Next Steps

1. **Add Puppeteer**: Install `puppeteer` package
2. **Implement AI API calls**: Add actual Gemini/GPT integration in `thinker.ts`
3. **Add vector database**: For advanced RAG-based healing (optional)
4. **Add parallel execution**: Run multiple test suites concurrently
5. **Add reporting**: Generate HTML reports with screenshots

## Cost Optimization

- Use `gemini-flash` for most tests ($0.35 per 1M tokens)
- Use `gemini-pro` for complex scenarios ($1.25 per 1M tokens)
- Use `gpt-4o` only when highest accuracy is needed ($5.00 per 1M tokens)

Average cost per test suite: **$0.001 - $0.01**
