# SaveSort AI Copilot (Insta_Rag)

<div align="center">
  <p><strong>Transform Instagram bookmarks into a permanent, AI-powered personal second brain.</strong></p>
  <p>Powered by <strong>Multimodal RAG</strong>, <strong>Google Gemini Flash/Flash Lite</strong>, and <strong>Vector Search</strong>.</p>
</div>

---

## 🌟 Key Features

1. **Unified AI Search & Copilot (Sleek Monochrome UI)**
   - Beautiful, premium, and fully responsive monochrome design (White/Gray/Black glassmorphism).
   - Unified search bar: Live-filter your saved posts or press Enter to launch the **AI Overview Copilot** (similar to Google Search AI Mode).
2. **AI Semantic Vector Search**
   - Don't remember exact words? Search by concept: *"easy 20-minute garlic pasta recipe"*, *"minimalist typography for website branding"*.
   - Uses powerful 768-dimensional embeddings and performs cosine distance matching.
3. **Automated Categorization & Vision OCR**
   - **Gemini 2.5 RAG** parses raw captions and performs OCR on images to assign meaningful taxonomies (*Recipes & Cooking*, *Design & Typography*, etc.) and summaries.
   - Intelligent Query Reformulation: Remembers conversation context for follow-up questions!
4. **Direct Instagram Cookie Sync (1-Click)**
   - No need to wait for ZIP exports! Just paste your `sessionid` and sync **ALL** your saved posts in seconds directly from Instagram.
5. **Waterfall Model Fallback System**
   - Highly resilient architecture. If the primary AI model (e.g. Gemini Flash) hits a rate limit (503), the system automatically falls back to `gemini-flash-lite-latest` to ensure uninterrupted user experience.
6. **100% Free-Tier Architecture**
   - Built to run completely within Google AI Studio free quota limits, MongoDB/Supabase free tiers, and Clerk Auth.

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/amanComeerciax/Insta_Rag.git
cd Insta_Rag
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

# Clerk Auth Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Supabase or MongoDB)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

MONGODB_URI=mongodb+srv://...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔑 How to Get Your Free API Keys

### 1. Google Gemini API Key (100% Free, No Credit Card Required)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **"Create API Key"**.
4. Copy the API key and paste it as `GEMINI_API_KEY` in `.env.local`.

### 2. Clerk Authentication
1. Create a free account at [Clerk.com](https://clerk.com).
2. Create a new application and copy the Next.js API keys into `.env.local`.

---

## 💻 Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 How to Sync Instagram Saved Posts

1. Open [instagram.com](https://instagram.com) on your desktop browser.
2. Right-click anywhere ➔ **Inspect** (or press `F12`).
3. Go to the **Application** tab (top) ➔ **Cookies** (left) ➔ **https://www.instagram.com**.
4. Find the row named **`sessionid`**, double-click its value, and copy it.
5. In the SaveSort AI Dashboard, click **Sync from Instagram**, paste the `sessionid`, select **"Fetch ALL posts"**, and click Sync!

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. In the **Environment Variables** section, add your Gemini, Clerk, and Database keys.
4. Click **Deploy**!

---

## 📄 License
MIT License. Built for open-source AI productivity.
