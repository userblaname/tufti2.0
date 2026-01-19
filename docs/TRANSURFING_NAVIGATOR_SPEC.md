# Transurfing Navigator - Technical Specification

> **A Modern Web Experience for Reality Transurfing Practitioners**

---

## 🎯 Project Overview

**Transurfing Navigator** is an immersive web application that helps users explore, understand, and apply the principles of Reality Transurfing by Vadim Zeland. It combines AI-powered guidance, interactive exercises, and a beautiful, mystical UI to create a transformative user experience.

---

## 📋 Core Features

### 1. **AI-Powered Tufti Chat Assistant**
- Real-time conversational AI using Claude (Anthropic)
- Character: "Tufti the Priestess" - theatrical, mystical, direct
- Features:
  - **Normal Mode**: Quick responses
  - **Presence Mode**: Extended thinking with visible reasoning
  - **Oracle Mode**: Multi-agent deep research
  - **Experiment Mode**: 3-pass iterative refinement (~3 min)
- RAG integration with Pinecone for book knowledge retrieval
- Voice synthesis (Azure TTS) for spoken responses

### 2. **Knowledge Base & Book Library**
- Full content from Reality Transurfing books indexed in Pinecone
- Semantic search across all Zeland materials
- Direct book quotes with chapter/section references
- Works included:
  - Reality Transurfing (Steps I-V)
  - Tufti the Priestess
  - Priestess Itfat
  - The Master of Reality

### 3. **User Journey Tracking**
- Persistent user profiles via Supabase
- Journey stages: Awakening → Exploring → Practicing → Mastering
- Discovered concepts tracker
- Breakthrough moments log
- Personal context memory for personalized responses

### 4. **Target Slide Visualizer** (Premium Feature)
- AI-generated visual representations of user's ideal reality
- Based on their described goals and intentions
- Downloadable high-quality images
- Guided slide visualization exercises

### 5. **Practice Library**
- Interactive exercises:
  - Importance Dropping
  - Pendulum Detection
  - Slide Technique
  - Heart & Mind Unity
  - Coordination & Intention
- Progress tracking per exercise
- Timed meditation/practice sessions

### 6. **Concept Glossary**
- Interactive dictionary of Transurfing terms
- Visual explanations with examples
- Links to relevant book excerpts
- Terms: Pendulums, Alternatives Space, Outer Intention, Slides, etc.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18+** | UI Framework |
| **Vite** | Build tool & dev server |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Lucide React** | Icons |
| **React Query** | Data fetching & caching |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | API Server |
| **Anthropic Claude API** | AI responses (via Azure) |
| **Pinecone** | Vector database for RAG |
| **Azure OpenAI** | Embeddings (text-embedding-3-large) |
| **Azure TTS** | Voice synthesis |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth |
| **Google OAuth** | Sign-in method |

### Deployment
| Technology | Purpose |
|------------|---------|
| **Netlify** | Frontend hosting + Functions |
| **Netlify Functions** | Serverless API (production) |

---

## 🗂️ Project Structure

```
transurfing-navigator/
├── src/
│   ├── components/
│   │   ├── auth/           # Login, AuthPage
│   │   ├── chat/           # ChatInput, MessageList, Sidebar
│   │   ├── message/        # Message, MessageContent, VirtualList
│   │   ├── onboarding/     # OnboardingForm
│   │   ├── practice/       # Exercise components
│   │   └── ui/             # Reusable UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── MessageContext.tsx
│   ├── hooks/
│   │   ├── useChat.ts      # Core chat logic
│   │   ├── useTTS.ts       # Voice synthesis
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── chat-service.ts # AI API communication
│   │   ├── supabase/       # Database operations
│   │   ├── tufti/          # Tufti character prompts
│   │   └── constants.ts    # System prompts, configs
│   └── App.tsx
├── backend/
│   ├── server.js           # Express API server
│   ├── lib/
│   │   ├── rag.js          # RAG retrieval system
│   │   ├── multi-agent.js  # Multi-agent thinking
│   │   ├── deep-experiment.js # 3-pass pipeline
│   │   ├── audio-service.js   # TTS
│   │   └── journey-manager.js # User journey
│   └── scripts/            # Embedding, migrations
├── netlify/
│   └── functions/
│       └── ai-proxy.cjs    # Production API proxy
├── supabase/
│   └── migrations/         # Database schemas
└── docs/                   # Documentation
```

---

## 🎨 Design System

### Color Palette
```css
/* Primary - Mystical Purple */
--primary: #8B5CF6;
--primary-dark: #7C3AED;

/* Background - Deep Space */
--bg-primary: #0A0A0F;
--bg-secondary: #111118;
--bg-card: #1A1A24;

/* Accent - Ethereal Glow */
--accent-blue: #3B82F6;
--accent-pink: #EC4899;
--accent-green: #10B981;

/* Text */
--text-primary: #F8FAFC;
--text-secondary: #94A3B8;
--text-muted: #64748B;
```

### Typography
- **Headings**: Inter or Outfit (Google Fonts)
- **Body**: System UI stack
- **Accent**: Serif for mystical quotes

### UI Principles
1. **Dark, Immersive Theme** - Cinematic, mysterious feel
2. **Subtle Animations** - Breathing glows, smooth transitions
3. **Glassmorphism** - Frosted glass effects on cards
4. **Minimal but Rich** - Clean layouts with depth

---

## 📊 Database Schema

### Tables

```sql
-- Users (managed by Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT false,
  journey_stage TEXT DEFAULT 'awakening',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('user', 'tufti')),
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Journey
CREATE TABLE user_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  journey_stage TEXT DEFAULT 'awakening',
  discovered_concepts TEXT[] DEFAULT '{}',
  breakthrough_moments JSONB DEFAULT '[]',
  practice_log JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) - Users can only access their own data
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey ENABLE ROW LEVEL SECURITY;
```

---

## 🔌 API Endpoints

### Chat
```
POST /api/chat
Body: {
  messages: Array<{role, content}>,
  thinkingEnabled: boolean,
  deepResearchEnabled: boolean,
  deepExperimentEnabled: boolean,
  userId: string
}
Response: SSE stream of AI response chunks
```

### Audio
```
POST /api/audio
Body: { text: string, voice?: string }
Response: audio/mpeg stream
```

### Memory
```
POST /api/memory
Body: { userId, conversationHistory }
Response: { status, journeyContext }
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Vite + React + TypeScript)
- [ ] Supabase integration (Auth + Database)
- [ ] Basic chat UI
- [ ] Backend API with Claude integration
- [ ] Basic RAG with Pinecone

### Phase 2: Core Features (Week 3-4)
- [ ] Tufti character prompts & personality
- [ ] Multiple thinking modes (Normal, Presence, Oracle)
- [ ] Voice synthesis integration
- [ ] User journey tracking
- [ ] Message persistence

### Phase 3: Enhanced Experience (Week 5-6)
- [ ] Deep Experiment Mode (3-pass pipeline)
- [ ] Interactive practice library
- [ ] Concept glossary
- [ ] Onboarding flow
- [ ] User profile management

### Phase 4: Premium Features (Week 7-8)
- [ ] Target Slide Visualizer (AI image generation)
- [ ] Advanced analytics dashboard
- [ ] Subscription/payment integration
- [ ] Mobile responsiveness polish
- [ ] Performance optimization

### Phase 5: Launch Prep (Week 9-10)
- [ ] Netlify production deployment
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Mixpanel/Amplitude)
- [ ] SEO optimization
- [ ] Security audit

---

## 🔐 Environment Variables

### Frontend (.env.local)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Backend (.env)
```
# AI
ANTHROPIC_ENDPOINT=your_azure_endpoint
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_MODEL=claude-opus-4-5

# Vector DB
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=your_index

# Embeddings
AZURE_OPENAI_EMBEDDINGS_ENDPOINT=your_endpoint
AZURE_OPENAI_EMBEDDINGS_KEY=your_key
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT=text-embedding-3-large

# TTS
AZURE_TTS_KEY=your_tts_key
AZURE_TTS_REGION=your_region

# Server
PORT=3001
```

---

## 📝 Key Implementation Notes

### 1. Tufti Character Voice
The AI must embody "Tufti the Priestess":
- Theatrical, dramatic, wise
- Direct and challenging (not sycophantic)
- Uses Transurfing terminology naturally
- Refers to user as "my dear Director"
- Avoids typical AI phrases ("I understand...", "Great question!")

### 2. RAG System
- Embed all book content with Azure OpenAI embeddings
- Store vectors in Pinecone with metadata (book, chapter, section)
- Retrieve top 5-10 relevant passages per query
- Rerank by relevance before injecting into context

### 3. Streaming Responses
All AI responses use Server-Sent Events (SSE):
- Stream thinking content separately
- Stream final response progressively
- Handle multi-agent events for visualization

### 4. Performance
- Use React Query for caching
- Virtual scrolling for long message lists (1000+ messages)
- Lazy load components
- Optimize images (WebP, lazy loading)

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Anthropic Claude**: https://docs.anthropic.com
- **Pinecone**: https://docs.pinecone.io
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Netlify**: https://docs.netlify.com

---

*Document Version: 1.0*  
*Last Updated: January 2026*
