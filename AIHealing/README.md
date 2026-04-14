# Basic Starter – A Simple ToDo App

Basic starter is a well-rounded template that showcases the most important bits of working with Wasp.

## 🚀 AI Healing Agent Features

This template includes an **AI-Powered Auto-Healing Test Automation Agent** with:
- 🤖 Autonomous browser navigation using Gemini AI
- 🔧 Self-healing selectors with RAG (Retrieval-Augmented Generation)
- 📊 **FREE Gemini embeddings** for semantic matching (no cost!)
- 🎯 4-layer healing strategy (Vector DB → Exact → Fuzzy → Structural)
- 💾 Persistent memory with ChromaDB

### Embedding Providers

The agent supports multiple embedding providers for semantic healing:

1. **Google Gemini** (RECOMMENDED - FREE! ✨)
   - Model: `text-embedding-004` (768 dimensions)
   - Cost: FREE
   - Best for: Production, demos, real-world testing

2. **OpenAI** (Paid)
   - Model: `text-embedding-3-small` (1536 dimensions)
   - Cost: $0.00002 per 1K tokens
   - Best for: Maximum accuracy

3. **Local** (Testing only)
   - Simple hash-based (384 dimensions)
   - Cost: FREE
   - Best for: Offline testing

See [EMBEDDING_PROVIDERS.md](./EMBEDDING_PROVIDERS.md) for detailed setup instructions.

## Prerequisites

- **Node.js** (newest LTS version recommended): We recommend install Node through a Node version manager, e.g. `nvm`.
- **Wasp** (latest version): Install via
  ```sh
  curl -sSL https://get.wasp.sh/installer.sh | sh
  ```

## Using the template

You can use this template through the Wasp CLI:

```bash
wasp new <project-name>
# or
wasp new <project-name> -t basic
```

## Development

To start the application locally for development or preview purposes:

1. Run `wasp db migrate-dev` to migrate the database to the latest migration
2. Run `wasp start` to start the Wasp application. If running for the first time, this will also install the client and the server dependencies for you.
3. The application should be running on `localhost:3000`. Open in it your browser to access the client.

To improve your Wasp development experience, we recommend installing the [Wasp extension for VSCode](https://marketplace.visualstudio.com/items?itemName=wasp-lang.wasp).

## Learn more

To find out more about Wasp, visit out [docs](https://wasp.sh/docs).
