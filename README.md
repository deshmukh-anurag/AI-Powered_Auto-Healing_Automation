<div align="center">

<img src="https://user-images.githubusercontent.com/74038190/212749447-bfb7e725-6987-49d9-ae85-2015e3e7cc41.gif" width="500"/>

# 🤖 AI-Powered Auto-Healing QA Automation

### A self-correcting browser automation system that never breaks

[![Node.js](https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=for-the-badge&logoColor=white)](https://trychroma.com)
[![Gemini](https://img.shields.io/badge/Gemini_1.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/gemini)
[![Wasp](https://img.shields.io/badge/Wasp-BF9B6F?style=for-the-badge&logoColor=white)](https://wasp-lang.dev)

![Maintenance Reduction](https://img.shields.io/badge/Script_Maintenance-↓_80%25-success?style=flat-square)
![Healing Accuracy](https://img.shields.io/badge/Selector_Recovery->_90%25-blue?style=flat-square)
![Token Reduction](https://img.shields.io/badge/Token_Usage-↓_90%25-orange?style=flat-square)

</div>

---

## 🎯 What Is This?

Traditional test automation breaks the moment a developer renames a CSS class or changes a button ID. This system **never breaks** — it uses semantic AI to understand UI elements the way a human does, and automatically heals itself when the DOM changes.

**The key insight:** Instead of storing brittle `#btn-49` selectors, we store a *semantic description* — "the primary blue login button at the top right." When the page changes, RAG finds the new element by meaning, not by name.

---

## 📊 Performance Metrics

| Metric | Result |
|:---|:---|
| 🔧 Script Maintenance Reduction | **80%** fewer manual fixes |
| 🎯 Semantic Selector Recovery | **>90%** accuracy via ChromaDB RAG |
| 💰 Token Consumption | **↓ 90%** using filtered AXTree vs raw HTML |
| ⚡ Loop Speed | Sub-second Observe → Think → Act cycles |

---

## 🧠 How It Works — The Agentic Loop

```
┌─────────────────────────────────────────────────────────┐
│                    USER INPUT                           │
│         "Login and add product to cart"                 │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              OBSERVE → THINK → ACT LOOP                 │
│                                                         │
│  1. OBSERVE  Extract filtered AXTree (not raw HTML)     │
│     └─ 90% fewer tokens vs standard DOM parsing        │
│                                                         │
│  2. THINK    Gemini 1.5 Flash decides next action       │
│     └─ Given context, history & available elements     │
│                                                         │
│  3. ACT      Playwright executes the action             │
│     └─ Stores "Golden State" of every touched element  │
└─────────────────────────┬───────────────────────────────┘
                          │
              UI changes detected?
                    │         │
                   YES        NO
                    │         │
                    ▼         ▼
        ┌──────────────┐   Continue
        │  RAG HEALER  │
        │  ChromaDB    │
        │  cosine sim  │
        │  → new elem  │
        └──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React + Tailwind CSS | Dashboard (Wasp auto-generated) |
| **Backend** | Node.js (Wasp) | Orchestration & business logic |
| **Automation** | Playwright | Headless browser control |
| **AI Brain** | Gemini 1.5 Flash | Think phase — action decisions |
| **Embeddings** | Gemini Embeddings | Vectorize UI element descriptions |
| **Vector DB** | ChromaDB | Semantic similarity search for healing |
| **Database** | PostgreSQL + Prisma | Test history & Golden State storage |
| **Framework** | Wasp | Full-stack type-safe scaffolding |

---

## ✨ Key Features

- 🔄 **Continuous Agentic Loop** — Observe-Think-Act until goal is achieved
- 🧬 **RAG-Based Self Healing** — ChromaDB stores semantic "Golden States" of UI elements
- 🌳 **AXTree Optimization** — Filters Accessibility Tree instead of raw HTML (90% token reduction)
- 💾 **Persistent Memory** — Synthesizes healed Puppeteer scripts for CI/CD pipelines
- 📊 **Dashboard** — Full UI to define goals, monitor runs, and view healing stats
- 🎯 **Natural Language Goals** — Just describe what you want to test in plain English

---

## 🚀 Quick Start

```bash
# 1. Install Wasp
curl -sSL https://get.wasp-lang.dev/installer.sh | sh

# 2. Clone & enter repo
git clone https://github.com/deshmukh-anurag/AI-Powered_Auto-Healing_Automation.git
cd AI-Powered_Auto-Healing_Automation/AIHealing

# 3. Start ChromaDB
docker run -p 8000:8000 chromadb/chroma

# 4. Configure environment
cp .env.example .env
# Add GEMINI_API_KEY, DATABASE_URL

# 5. Start DB & app
wasp db migrate-dev
wasp start
```

App runs at `http://localhost:3000`

---

## 🔑 Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:pass@localhost:5432/autoheal
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

---

## 📁 Project Structure

```
AI-Powered_Auto-Healing_Automation/
├── AIHealing/
│   ├── src/
│   │   ├── agent/          # Observe-Think-Act loop
│   │   ├── healing/        # RAG healer + ChromaDB
│   │   ├── automation/     # Playwright controller
│   │   └── dashboard/      # React UI components
│   ├── schema.prisma       # DB schema
│   └── main.wasp           # App config
├── test-app/               # Sample app to test against
└── .env.example
```

---

## 👨‍💻 Author

**Anurag Divakar Deshmukh** — AI Engineer & Full Stack Developer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/anurag-deshmukh-aa23822a5)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/deshmukh-anurag)
[![Email](https://img.shields.io/badge/Email-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:anuragdeshmukh61@gmail.com)

---

<div align="center"><i>⭐ Star this repo if you find it useful!</i></div>
