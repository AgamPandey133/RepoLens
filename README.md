# 🧑‍💻 RepoLens – AI-Powered Developer Collaboration Platform

**RepoLens** is a powerful AI-driven platform designed to simplify developer collaboration.  
It integrates cutting-edge tools for documentation, code understanding, meeting intelligence, and teamwork—making software development more **efficient, transparent, and collaborative**.  

---
## Images
![Dashboard](/public/Screenshot%202025-10-04%20230526.png)
![QuestionPage](/public/Screenshot%202025-10-04%20230545.png)
![AskQuestion](/public/Screenshot%202025-10-04%20230607.png)
![meetingPage](/public/Screenshot%202025-10-04%20230617.png)
![meetingSummaries](/public/Screenshot%202025-10-04%20230629.png)
![projectStructure](/public/Screenshot%202025-10-04%20231234.png)


## 🚀 Features

### 📄 Automatic Code Documentation
- **RepoLens** automatically generates detailed and structured documentation from your codebase.  
- Helps both newcomers and experienced developers quickly understand project structure, logic, and purpose.  

### 🔍 Codebase Search
- **Context-aware search** across the entire codebase.  
- Instantly find functions, classes, and components without manually digging through files.  

### 📝 Commit Message Summaries
- AI-powered commit summarization keeps you up to date with repository changes.  
- Saves time in understanding commit history.  

### 🎙️ Meeting Transcription
- Powered by **AssemblyAI**, **RepoLens** transcribes team meetings.  
- Extracts **key topics** and provides accurate summaries for future reference.  

### ⚡ Real-Time Contextual Meeting Search
- Ask contextual questions about **past meetings** and get real-time answers.  
- Never lose track of discussions or action items.  

### 🤝 Collaborative Platform
- Centralized place for dev teams to:
  - Access **documentation**  
  - Review **commit & meeting summaries**  
  - Perform **intelligent codebase searches**  
  - Collaborate seamlessly with AI support  

---

## 🛠️ Tech Stack

- 🌐 **[Next.js 15](https://nextjs.org/)** with the modern **App Router**  
- 🎨 **[Shadcn](https://ui.shadcn.com/)** + **[Tailwind CSS](https://tailwindcss.com/)** for beautiful, consistent UI  
- 🧠 **[Google Gemini AI API](https://ai.google.dev/)** for advanced language model features  
- 🗃️ **ORMs** for efficient and type-safe database interaction  
- 🔗 **LangChain** for orchestration of AI workflows and context-aware retrieval  
- 🎙️ **[AssemblyAI](https://www.assemblyai.com/)** for meeting transcription & audio summarization  

---

## 📂 Project Structure

```
RepoLens/
│── app/               # Next.js App Router
│── components/        # Reusable UI components (Shadcn, Tailwind)
│── lib/               # AI & utility functions (Gemini, LangChain, AssemblyAI)
│── pages/             # Route handling
│── public/            # Static assets
│── styles/            # Tailwind global styles
│── package.json       # Dependencies & scripts
```

---

## ⚡ Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/RepoLens.git
   cd RepoLens
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**  
   Create a `.env.local` file and add:
   ```bash
    DATABASE_URL = 
    NODE_ENV = 
    URL = 
    GITHUB_TOKEN = 
    GEMINI_API_KEY = 
    ASSEMBLY_API_KEY = 

    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY= 

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser 🚀  

---

## 📌 Roadmap

- [ ] GitHub & GitLab integration for automatic commit tracking  
- [ ] AI-powered PR reviews  
- [ ] Slack/Discord bot integration for instant meeting summaries  
- [ ] Multi-language support for global dev teams  

---

## 🤝 Contributing

Contributions are welcome!  
Please fork this repository and submit a pull request for review.  

---

## 📜 License

This project is licensed under the **MIT License** – feel free to use and adapt it for your own projects.  

---

## 🌟 Acknowledgements

- [Next.js](https://nextjs.org/)  
- [Shadcn](https://ui.shadcn.com/)  
- [Tailwind CSS](https://tailwindcss.com/)  
- [Google Gemini AI](https://ai.google.dev/)  
- [LangChain](https://www.langchain.com/)  
- [AssemblyAI](https://www.assemblyai.com/)  

---

🚀 **RepoLens – Making Developer Collaboration Smarter with AI**  
