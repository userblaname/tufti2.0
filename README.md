# Reality Film (Tufti 2.0)

> *"You are the director of your own reality film."* — Tufti the Priestess

A premium conversational AI interface inspired by the teachings of **Tufti the Priestess** and **Reality Transurfing** by Vadim Zeland. This app provides a mystical yet grounded experience where users interact with an AI embodying the Tufti persona, exploring concepts of reality creation through the "reality film" metaphor.

---

## ✨ Key Features

### 🎭 Tufti AI Persona
- **Authentic Character**: AI responses channel Tufti's theatrical, wisdom-sharing personality
- **RAG-Enhanced Knowledge**: Retrieves real quotes from books AND practitioner courses
- **Extended Thinking Mode**: Toggle deep reasoning with Claude's thinking capability
- **Elite Intent Detection**: Emotional awareness + source-aware routing
- **Anti-Hallucination Guard**: Explicit source manifest prevents inventing non-existent content

### 📚 Knowledge Sources

**Books (Vadim Zeland):**
- Reality Transurfing Steps I-V (3,508 paragraphs)
- Tufti the Priestess (666 paragraphs)
- What Tufti Didn't Say (748 paragraphs)
- Master of Reality (693 paragraphs)
- Transurfing Yourself (607 paragraphs) ✨ *NEW*
- Hacking the Technogenic System (1,171 paragraphs) ✨ *NEW*

**Courses (Renee Garcia):**
- Reality 2.0 (11 modules - Pendulums, Alternatives Space, Wave of Fortune, etc.)
- Becoming Magnetic (4 days - Self-love, relationships, declarations)
- Mo Money (4 lessons - Wealth, limiting beliefs, materialization)

**Total: 8,389+ paragraphs embedded in Pinecone**

### 💬 Premium Chat Experience
- **Streaming Responses**: Word-by-word streaming with blinking cursor
- **AI-Generated Suggestions**: Tufti predicts your next questions contextually
- **Vision Support**: Upload images for Tufti to analyze and discuss
- **Voice Input**: Speech-to-text microphone integration
- **Text-to-Speech**: Listen to Tufti's responses with Azure TTS
- **Message Actions**: Copy, edit user messages, regenerate AI responses

### 🎨 Elite 2026 UI/UX
- **Shiny Send Button**: Animated conic-gradient border with pulsing glow
- **Spotlight Effects**: Mouse-follow glow on user message bubbles
- **Cinematic Scroll Button**: Golden orb with subtle ambient pulse
- **Premium Animations**: Spring physics, framer-motion throughout
- **Dark Theme**: Deep zinc/slate with amber and teal accents

### 💾 Persistence & Auth
- **Google Authentication**: Secure sign-in via Supabase Auth
- **Continuous Conversation**: Single persistent conversation per user
- **Infinite History**: Robust pagination retrieves complete history (1000+ messages)
- **Offline Safety Net**: Local backup of last 2000 messages prevents data loss
- **User Onboarding**: Profile setup for personalized experience

### 🧠 Journey Memory System
- **Rolling Summary**: Auto-compresses your entire journey into structured summary
- **Personalized Context**: Tufti remembers your struggles, breakthroughs, and current focus
- **Auto-Update**: Every 20 messages, Claude extracts key moments and updates your profile
- **Robust Extraction**: Safe handling of multi-modal messages (images/text) and strict system prompt filtering to prevent API token overflow
- **Backfill Recovery**: Top-200 importance-ranked message extraction to rebuild context after gaps
- **Conversation Export**: Full message history export with timestamps, roles, and date grouping
- **Cloud Storage**: Journey data stored in Supabase, works across devices

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **UI Components** | Shadcn/UI, Radix UI, Framer Motion |
| **State** | React Context, Zustand |
| **Backend** | Node.js, Express |
| **AI** | Azure Anthropic (Claude Opus 4.5), Extended Thinking |
| **RAG** | Pinecone Vector DB, Azure text-embedding-3-large (3072 dims) |
| **Auth & DB** | Supabase (PostgreSQL, Google OAuth) |
| **TTS** | Azure Cognitive Services Speech SDK |
| **Deployment** | Netlify (Serverless Functions) |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/userblaname/tufti2.0.git
cd tufti2.0

# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 2. Environment Variables

**Frontend** (`.env.local` in root):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend** (`backend/.env`):
```env
# Anthropic (Claude)
ANTHROPIC_ENDPOINT=your_azure_anthropic_endpoint
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_MODEL=claude-opus-4-5

# Pinecone (RAG)
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=tufti-knowledge-v2

# Azure Embeddings
AZURE_EMBEDDING_ENDPOINT=your_azure_endpoint
AZURE_EMBEDDING_KEY=your_azure_key
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large-2

# Supabase (for journey tracking)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Azure TTS (optional)
AZURE_TTS_KEY=your_tts_key
AZURE_TTS_REGION=your_region
```

### 3. Run Development Servers

```bash
# Terminal 1: Backend
cd backend && node server.js

# Terminal 2: Frontend
npm run dev
```

Access at: **http://localhost:5173**

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── chat/          # ChatInput, MessageList, Sidebar
│   │   ├── message/       # Message, MessageContent, VirtualMessageList
│   │   └── ui/            # Shadcn components
│   ├── contexts/          # Auth, Message providers
│   ├── hooks/             # Custom hooks (Speech, Validation, etc.)
│   └── lib/
│       ├── suggestions.ts # Related questions system
│       └── tufti/         # Tufti persona constants
├── backend/
│   ├── server.js          # Express API with RAG
│   ├── lib/
│   │   ├── rag.js         # Pinecone + Azure embeddings + Elite RAG v3.0
│   │   ├── intent-detector.js  # Elite Intent Detection System
│   │   └── journey-manager.js  # Rolling Journey Summary System
│   ├── scripts/
│   │   ├── clean-knowledge.js  # Cleans all books + courses
│   │   ├── embed-knowledge.js  # Embeds to Pinecone
│   │   ├── embed-single.js     # Incremental single-book embedding
│   │   ├── backfill-journey.js # Backfill journey from top-200 messages
│   │   ├── export-conversation.js # Export single user chat history to .md
│   │   └── export-all-other-users.js # Batch export all other users' histories
│   └── books/             # Transurfing book content
├── data/
│   ├── books/             # 6 Vadim Zeland books (.txt)
│   └── courses/
│       └── renee-garcia/  # Reality 2.0, Becoming Magnetic, Mo Money
├── netlify/
│   └── functions/
│       └── ai-proxy.cjs   # Serverless function for deployment
└── docs/
    └── anti-sycophancy-strategy.md  # Future implementation notes
```

---

## 🎯 RAG System (Elite v3.0)

The backend uses a sophisticated RAG pipeline:

### Pipeline Flow
1. **Elite Intent Detection**: Analyzes emotional state + intent type
2. **Query Embedding**: Azure text-embedding-3-large (3072 dimensions)
3. **Source-Aware Routing**: Favors books for quotes, courses for practice
4. **Vector Search**: Pinecone with metadata filtering
5. **Context Injection**: Real quotes + source manifest injected into prompt

### Anti-Hallucination System
Every RAG prompt includes an explicit source manifest:
```
⚠️ CRITICAL: YOUR AVAILABLE KNOWLEDGE SOURCES
📚 BOOKS: Reality Transurfing I-V, Tufti the Priestess, What Tufti Didn't Say, Master of Reality, Transurfing Yourself, Hacking the Technogenic System
🎓 COURSES: Reality 2.0, Becoming Magnetic, Mo Money
⛔ IF YOU DON'T HAVE IT ABOVE, IT DOESN'T EXIST.
```

### Citation Formats
- **Books**: *"exact quote"* — [Book Name]
- **Courses**: As Renee Garcia teaches in [Course Name]: "..."

---

## 🔧 Scripts

### Clean All Knowledge
```bash
cd backend && node scripts/clean-knowledge.js
```
Cleans and formats all books + courses into ~80 word paragraphs.

### Embed All to Pinecone (Full Rebuild)
```bash
cd backend && node scripts/embed-knowledge.js
```
Embeds all cleaned content to Pinecone with proper metadata. ⚠️ Clears the index first.

### Embed a Single Book (Incremental)
```bash
cd backend && node scripts/embed-single.js "../data/books/Book_Name.txt" book "Author Name"
```
Adds a single book to Pinecone without touching existing data. Includes duplicate detection.

### Export Conversations
```bash
# Export single user (defined in script)
cd backend && node scripts/export-conversation.js

# Batch export all other users (groups by user/conversation)
cd backend && node scripts/export-all-other-users.js
```
Exports messages from Supabase to markdown files with date headers, timestamps, and role labels.


---

## 🌐 Deployment (Netlify)

The app is configured for Netlify deployment:

1. **Frontend**: Static site (Vite build)
2. **Backend**: Serverless function at `netlify/functions/ai-proxy.cjs`
3. **Redirects**: `/api/*` → `/.netlify/functions/ai-proxy/:splat`

Set these environment variables in Netlify:
- `ANTHROPIC_ENDPOINT`
- `ANTHROPIC_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `AZURE_EMBEDDING_ENDPOINT`
- `AZURE_EMBEDDING_KEY`
- `AZURE_EMBEDDING_DEPLOYMENT`

---

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <em>"Don't fight pendulums. Don't give them energy. Simply observe your reality film with a smile."</em>
  <br><br>
  Built with 💛 and Transurfing principles
</p>