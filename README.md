# Insta_Rag — Multimodal RAG Personal Knowledge Base for Instagram Saved Posts

<div align="center">
  <p><strong>Transform Instagram bookmarks into a permanent, AI-powered personal second brain.</strong></p>
  <p>Powered by <strong>Multimodal RAG</strong>, <strong>Groq LLaMA 120B</strong>, <strong>Google Gemini Flash</strong>, and <strong>Vector Search</strong>.</p>
</div>

---

## 🌟 Key Features

1. **AI Semantic Vector Search (pgvector)**
   - Don't remember exact words or account names? Search by concept: *"easy 20-minute garlic pasta recipe"*, *"minimalist typography for website branding"*, or *"deep work morning habits"*.
   - Generates high-fidelity 768-dimensional embeddings and performs cosine distance matching.
2. **Automated Categorization & 1-Sentence Summaries**
   - Gemini 2.5 Flash parses raw captions and assigns meaningful taxonomies (*Recipes & Cooking*, *Design & Typography*, *Coding & Tech*, *Fitness & Health*, *Travel*, etc.) alongside concise summaries.
3. **Dual Ingestion Pipelines**
   - **Manual ZIP Import**: Defensively extracts saved posts from official Instagram data export archives (`.zip`), decoding Latin-1 UTF-8 quirks and recursive directory trees.
   - **Companion Chrome Extension**: Ingest saved posts continuously directly while browsing Instagram on desktop.
4. **Rich Dark Modern UI**
   - Next.js 14 App Router, Tailwind CSS, glassmorphism, category filters with post counts, media type filtering (Photos, Reels, Videos, Carousels), and post detail inspection modals.
5. **100% Free-Tier Architecture**
   - Built to run completely within Google AI Studio free quota limits and Supabase free tier.

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url> instasaved
cd instasaved
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your keys:

```env
# Google Gemini API Key (Free: https://aistudio.google.com/apikey)
GEMINI_API_KEY=AIzaSy...

# Supabase Project (Free: https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Chrome Extension Secret Key
EXTENSION_API_SECRET=savesort_ext_secret

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔑 How to Get Your Free API Keys

### 1. Google Gemini API Key (100% Free, No Credit Card Required)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **"Create API Key"** (or select an existing Google Cloud project).
4. Copy the API key and paste it as `GEMINI_API_KEY` in `.env.local`.

### 2. Supabase Free Database Setup
1. Create a free account at [Supabase.com](https://supabase.com).
2. Click **"New Project"**, name it `savesort-ai`, and set a database password.
3. Once the project is provisioned, go to the **SQL Editor** tab in the left sidebar.
4. Open the [`schema.sql`](./schema.sql) file from this repository, copy all its contents, paste it into the Supabase SQL Editor, and click **Run**.
   - This automatically enables `pgvector`, creates `saved_posts` & `sync_logs`, applies Row Level Security (RLS), and registers the `match_saved_posts` vector search stored procedure.
5. Go to **Project Settings** → **API**:
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 💻 Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> **Instant Demo Mode**: You can test the application right away! Go to `/dashboard` and click **"Add Demo Data"** to load realistic AI-enriched saved posts and try semantic search immediately even before your first export ZIP is ready.

---

## 📦 How to Export Instagram Saved Posts (ZIP Flow)

1. Open Instagram (app or web) → **Settings** → **Accounts Center**.
2. Select **"Your information and permissions"** → **"Download your information"**.
3. Choose **"Download or transfer information"** → select **"Some of your information"**.
4. Check only **"Saved"** data.
5. Select **Format: JSON** (Important!) and Date range: **All time**.
6. Submit the request. Instagram will email you a download link when your `.zip` archive is ready.
7. Download the `.zip` and upload it directly on the SaveSort AI `/onboarding` page!

---

## 🧩 Companion Chrome Extension

The repository includes a Manifest V3 companion Chrome Extension located in the `extension/` directory.

### Installation:
1. Open Chrome/Brave/Edge and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **"Load unpacked"** and select the `extension/` directory.
4. Navigate to `instagram.com/<your_username>/saved/` in your browser.
5. Click the SaveSort AI extension icon, confirm your API endpoint, and click **"⚡ Sync Instagram Saved Posts"**.

---

## 🗄️ Database Schema Summary (`schema.sql`)

- **`saved_posts`**: Stores post ID, URL, media type, caption, thumbnail, AI summary, category, timestamp, and the 768-dimensional `vector` embedding column with an HNSW cosine similarity index.
- **`sync_logs`**: Tracks manual export uploads and extension sync runs.
- **`match_saved_posts(...)`**: RPC function calculating `(1 - (embedding <=> query_embedding))` with user isolation and optional category filtering.
- **Row Level Security (RLS)**: Enforces that users can only access their own saved posts.

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. In the **Environment Variables** section, add `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Click **Deploy**!

---

## 📄 License
MIT License. Built for open-source AI productivity.
