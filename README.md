# 🧑‍💻 RepoLens – AI-Powered Developer Collaboration Platform

**RepoLens** is an advanced AI-driven platform designed to simplify developer collaboration. It integrates cutting-edge tools for codebase understanding, agentic PR reviews, meeting intelligence, and robust AI observability. 

Built not just as a wrapper, but as a full-fledged AI Engineering project featuring **Hybrid RAG**, **Agentic Workflows**, and **LLM Observability**.

---

## 🚀 AI Engineering Highlights

This project demonstrates advanced AI engineering patterns beyond basic LLM API calls:

### 🧠 3-Stage Hybrid RAG Engine
- **Vector Search:** Dense retrieval using `pgvector` for semantic codebase search.
- **BM25 Keyword Re-ranking:** TF-IDF based term frequency scoring (built natively in TypeScript) to boost exact-match variable/file names.
- **LLM Cross-Encoder Re-ranking:** Uses Gemini-2.0-Flash to score and re-rank the top candidates based on contextual relevance to the query.

### 🤖 Agentic PR Reviews (Plan → Retrieve → Review → Reflect)
A multi-step autonomous agent that reviews Pull Requests:
1. **Plan:** Parses the PR diff via GitHub API to determine scope.
2. **Retrieve:** Runs the Hybrid RAG engine per changed file to fetch related context.
3. **Review:** Generates a structured JSON review (bugs, improvements, security).
4. **Reflect:** Self-corrects by verifying each comment against the retrieved context to eliminate hallucinations.

### 📊 AI Observability & Evaluation
- **RAGAS-style Faithfulness Scoring:** Every Q&A answer is automatically evaluated (0-100) to measure how grounded it is in the retrieved codebase context.
- **Latency & Cost Tracking:** Every LLM call is logged with prompt/completion token usage and latency metrics.
- **Analytics Dashboard:** A dedicated dashboard visualizing RAG quality trends, API call volume, and feature-level token costs using Recharts.

---

## 📸 Platform Features

### 📄 Intelligent Codebase Q&A
Ask natural language questions about your codebase. See the exact files referenced and a real-time **Faithfulness Confidence Score** for the answer.

### 🔍 Automated Code Documentation & Search
Automatically generates embeddings and summaries for every file in your repository, allowing lightning-fast contextual search.

### 🎙️ Meeting Transcription & Intelligence
Powered by **AssemblyAI**, RepoLens transcribes team meetings, extracts key topics, and allows contextual chat against past discussions.

### 📝 Commit Message Summaries
AI-powered commit summarization keeps you up to date with repository changes instantly.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **UI:** [Shadcn UI](https://ui.shadcn.com/) + Tailwind CSS + Recharts
- **Database:** PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- **Vector Store:** Supabase with `pgvector`
- **AI Models:** Google Gemini 2.0 Flash (`@google/generative-ai`)
- **Audio Intelligence:** [AssemblyAI](https://www.assemblyai.com/)
- **LLM Orchestration:** Custom Agentic TS pipelines + AI SDK

---

## 📂 Architecture

```mermaid
graph TD
    A[User Query] --> B(Vector Search: pgvector)
    B --> C(BM25 Keyword Scoring)
    C --> D(LLM Re-ranking: Gemini)
    D --> E[Final Top Context]
    E --> F(LLM Answer Generation)
    F --> G(Faithfulness Evaluator)
    G --> H[Final Output + Confidence Score]
    
    style A fill:#4f46e5,stroke:#fff,color:#fff
    style H fill:#10b981,stroke:#fff,color:#fff
```

---

## ⚡ Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/RepoLens.git
   cd RepoLens/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**  
   Create a `.env` file and add:
   ```bash
   DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
   DIRECT_URL="postgresql://postgres:password@host:5432/postgres"
   GITHUB_ACCESS_TOKEN="your_github_token"
   GEMINI_API_KEY="your_gemini_key"
   ASSEMBLY_API_KEY="your_assemblyai_key"
   NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) 🚀  

---

## 🤝 Contributing
Contributions are welcome! Please fork this repository and submit a pull request.

## 📜 License
Licensed under the **MIT License**.
