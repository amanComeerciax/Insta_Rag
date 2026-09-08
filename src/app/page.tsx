'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  ArrowRight, 
  Check, 
  Code2, 
  Layers, 
  Bookmark, 
  Copy, 
  Eye, 
  FolderTree,
  Terminal,
  Cpu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SignedIn, SignedOut } from '@clerk/nextjs';

/**
 * Iconic Google Gemini multi-stop gradient sparkle SVG
 */
function GeminiStar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
        fill="url(#gemini-sparkle-hero)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-hero" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.4" stopColor="#9B72CB" />
          <stop offset="0.75" stopColor="#D96570" />
          <stop offset="1" stopColor="#FBBC05" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Interactive demo presets
interface DemoPreset {
  id: string;
  pillLabel: string;
  query: string;
  aiResponse: string;
  extractedColors: string[];
  extractedFonts: string[];
  codeSnippet: string;
  postAuthor: string;
  postCategory: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'design-tokens',
    pillLabel: '[ 01: EXTRACT DESIGN TOKENS ]',
    query: 'Show color palette and Tailwind CSS config for the dark mode Bento card design',
    aiResponse: 'Based on your saved Instagram post from @ux_designer, the card uses a luxury obsidian background with indigo neon glow accents. Extracted 4 primary color tokens and ready-to-copy Tailwind configuration.',
    extractedColors: ['#0A0A0B', '#18181B', '#6366F1', '#EC4899'],
    extractedFonts: ['Clash Display (Bold)', 'Geist Sans (400, 500)'],
    codeSnippet: `// tailwind.config.js - Extracted from Saved Post
module.exports = {
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0A0B',
        surface: '#18181B',
        neonIndigo: '#6366F1',
        electricPink: '#EC4899',
      }
    }
  }
};`,
    postAuthor: '@ux_designer',
    postCategory: 'UI/UX Design',
  },
  {
    id: 'food-delivery',
    pillLabel: '[ 02: FOOD DELIVERY UI STUDY ]',
    query: 'Break down the EATLY food delivery homepage layout I bookmarked last month',
    aiResponse: 'Found your saved carousel from @ui.daily: "EATLY — Food Delivery Web App Concept". Key highlights include a 3-step ordering flow, floating transparent glassmorphism badges, and 4.8★ user review widgets.',
    extractedColors: ['#FF5722', '#1E1E1E', '#FFFFFF', '#4CAF50'],
    extractedFonts: ['Plus Jakarta Sans', 'Outfit SemiBold'],
    codeSnippet: `<!-- Extracted CTA Component Structure -->
<button class="bg-[#FF5722] hover:bg-[#F4511E] text-white px-6 py-3 font-semibold shadow-lg shadow-orange-500/20 transition-all">
  Order Now · $14.99
</button>`,
    postAuthor: '@ui.daily',
    postCategory: 'Web Design',
  },
  {
    id: 'gemini-workflow',
    pillLabel: '[ 03: GEMINI DEV PROMPTS ]',
    query: 'What was that reel explaining how to integrate vector RAG with Supabase?',
    aiResponse: 'Located your saved reel from @code_architect: "Building Fullstack Multimodal RAG with Supabase pgvector & Next.js 14". Recommends 768-dimension cosine distance embeddings using Google Generative AI.',
    extractedColors: ['#4285F4', '#9B72CB', '#34A853', '#000000'],
    extractedFonts: ['JetBrains Mono', 'Inter'],
    codeSnippet: `// Supabase pgvector cosine search match function
create or replace function match_saved_posts (
  query_embedding vector(768),
  match_threshold float,
  match_count int
) returns setof saved_posts language sql stable as $$
  select * from saved_posts
  where 1 - (saved_posts.embedding <=> query_embedding) > match_threshold
  order by (saved_posts.embedding <=> query_embedding) asc
  limit match_count;
$$;`,
    postAuthor: '@code_architect',
    postCategory: 'Tech & AI',
  },
];

const FAQS = [
  {
    code: '01',
    question: 'How does Insta_Rag access my saved Instagram posts?',
    answer: 'You have complete privacy and control. You can either connect using your direct Instagram session key for 1-click live syncing, or upload your official Instagram data export zip file. We never store your Instagram password.',
  },
  {
    code: '02',
    question: 'Can I search text that appears inside images and reels?',
    answer: 'Yes. Powered by Google Gemini 2.5 Flash, Insta_Rag performs deep multimodal OCR on video frames, carousel slides, and images to index text, UI buttons, code snippets, and infographics into searchable 768-dimensional vector embeddings.',
  },
  {
    code: '03',
    question: 'How does the 1-Click Code & Design Export feature work?',
    answer: 'When you ask AI about any saved design or view a post detail, Insta_Rag automatically analyzes the visual elements and lets you copy or download production-ready Tailwind CSS colors, CSS root variables, Figma design tokens, and Markdown reports.',
  },
  {
    code: '04',
    question: 'Is my Instagram data private and secure?',
    answer: 'Absolutely. Every user’s saved bookmarks, vectors, and sync logs are strictly isolated using Clerk authentication and Supabase Row Level Security (RLS). Your data is never shared with third parties or used for model training.',
  },
  {
    code: '05',
    question: 'Which AI models power the semantic search and question answering?',
    answer: 'Insta_Rag uses a dual-engine architecture: Google Gemini 2.5 Flash for vision, OCR, and multimodal comprehension, combined with Groq LLaMA 120B for ultra-fast, sub-second natural language reasoning and code generation.',
  },
];

export default function LandingPage() {
  const [activeDemo, setActiveDemo] = useState<DemoPreset>(DEMO_PRESETS[0]);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeDemo.codeSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-black text-white selection:bg-[rgba(255,255,255,0.2)] selection:text-white">
      {/* ========================================================================= */}
      {/* 1. CINEMATIC VIDEO HERO SECTION (ECHOID COMPOSITION)                      */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[100vh] lg:h-[100vh] flex flex-col justify-between overflow-hidden isolate bg-black -mt-16 pt-16">
        {/* Full-bleed Edge-to-Edge Cinematic Background Video */}
        <div className="absolute inset-0 -z-10 bg-black overflow-hidden pointer-events-none">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png"
            className="w-full h-full object-cover object-center"
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4"
              type="video/mp4"
            />
          </video>

          {/* Desktop Dual-Gradient Scrim (Left negative space, right-focus) */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(to right, transparent 0%, transparent 42%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.76) 100%),
                linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.75) 100%)
              `,
            }}
          />

          {/* Mobile Bottom Scrim */}
          <div
            className="md:hidden absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.85) 100%)',
            }}
          />
        </div>

        {/* Hero Body: Right-aligned Signup / Access Panel */}
        <div className="flex-1 flex items-center justify-end px-[clamp(20px,5vw,100px)] py-10 z-10">
          <div className="w-full sm:w-[min(70vw,520px)] lg:w-[min(35vw,620px)] lg:min-w-[380px] flex flex-col items-start text-left">
            {/* 1) CHIP: Sharp rectangle, no rounded pill */}
            <div
              className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                fontSize: 'clamp(11px, 0.72vw, 14px)',
                letterSpacing: '0.2em',
                padding: 'clamp(9px,0.8vw,14px) clamp(14px,1.1vw,20px)',
              }}
            >
              [ SAVED POSTS AI ]
            </div>

            {/* 2) H1: Dominant Hero Word in Sora 200 */}
            <h1
              className="text-white uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 200,
                fontSize: 'clamp(52px, 6.2vw, 118px)',
                letterSpacing: '0.03em',
                lineHeight: 0.95,
                marginTop: 'clamp(26px, 2.8vw, 48px)',
              }}
            >
              INSTA_RAG
            </h1>

            {/* 3) TAGLINE: JetBrains Mono 300, uppercase */}
            <p
              className="uppercase leading-[1.4]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 300,
                fontSize: 'clamp(11px, 0.92vw, 17px)',
                letterSpacing: '0.14em',
                color: 'var(--text-dim)',
                marginTop: 'clamp(14px, 1.4vw, 24px)',
              }}
            >
              YOUR INSTAGRAM SAVES, ORGANIZED WITH AI.
            </p>

            {/* 4) FORM */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailInput = form.elements.namedItem('email') as HTMLInputElement | null;
                const email = emailInput?.value?.trim();
                if (email) {
                  window.location.href = `/signup?email_address=${encodeURIComponent(email)}`;
                } else {
                  window.location.href = '/signup';
                }
              }}
              noValidate
              className="w-full flex flex-col"
              style={{
                marginTop: 'clamp(34px, 4.2vw, 76px)',
                gap: 'clamp(14px, 1.3vw, 22px)',
              }}
            >
              {/* a) Email Field */}
              <div className="w-full">
                <label htmlFor="hero-email" className="sr-only">
                  Email
                </label>
                <input
                  id="hero-email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  className="w-full bg-transparent text-white border-0 border-b outline-none rounded-none transition-colors duration-200"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 300,
                    fontSize: 'clamp(16px, 0.95vw, 18px)',
                    borderColor: 'var(--line-strong)',
                    padding: '0 2px clamp(12px, 1.1vw, 18px)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.85)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line-strong)';
                  }}
                />
              </div>

              {/* b) Button: Proceed using email / Open Dashboard */}
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="w-full rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 'clamp(11px, 0.78vw, 14px)',
                    letterSpacing: '0.22em',
                    padding: 'clamp(17px, 1.6vw, 27px) 20px',
                    backgroundColor: 'var(--fill-solid)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--fill-solid)';
                  }}
                >
                  OPEN DASHBOARD →
                </Link>
              </SignedIn>

              <SignedOut>
                <button
                  type="submit"
                  className="w-full rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 'clamp(11px, 0.78vw, 14px)',
                    letterSpacing: '0.22em',
                    padding: 'clamp(17px, 1.6vw, 27px) 20px',
                    backgroundColor: 'var(--fill-ghost)',
                    color: 'var(--text-dimmer)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.09)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--fill-ghost)';
                    e.currentTarget.style.color = 'var(--text-dimmer)';
                  }}
                >
                  PROCEED USING EMAIL
                </button>
              </SignedOut>

              {/* c) Button: Access Dashboard / Ask AI */}
              <SignedIn>
                <Link
                  href="/ask"
                  className="w-full rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase border border-neutral-800"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 'clamp(11px, 0.78vw, 14px)',
                    letterSpacing: '0.22em',
                    padding: 'clamp(17px, 1.6vw, 27px) 20px',
                    backgroundColor: 'var(--fill-ghost)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--fill-ghost)';
                  }}
                >
                  ASK AI AGENT
                </Link>
              </SignedIn>

              <SignedOut>
                <Link
                  href="/login"
                  className="w-full rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 'clamp(11px, 0.78vw, 14px)',
                    letterSpacing: '0.22em',
                    padding: 'clamp(17px, 1.6vw, 27px) 20px',
                    backgroundColor: 'var(--fill-solid)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--fill-solid)';
                  }}
                >
                  ACCESS
                </Link>
              </SignedOut>
            </form>

            {/* 5) Referral / Anchor Link */}
            <a
              href="#playground"
              className="transition-colors duration-200 uppercase self-center"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                fontSize: 'clamp(11px, 0.74vw, 14px)',
                letterSpacing: '0.18em',
                marginTop: 'clamp(26px, 2.6vw, 44px)',
                color: 'var(--text-dim)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.textUnderlineOffset = '4px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-dim)';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              EXPLORE INTERACTIVE PLAYGROUND ↓
            </a>
          </div>
        </div>

        {/* 6) Legal Footer Pinned to Bottom of Hero */}
        <div
          className="w-full border-t border-[rgba(255,255,255,0.14)] text-center z-10"
          style={{
            padding: 'clamp(16px, 1.4vw, 24px) var(--gutter)',
          }}
        >
          <p
            className="leading-[1.5]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 'clamp(12px, 0.82vw, 15px)',
              color: 'var(--text-dim)',
            }}
          >
            Organizing your Instagram library signals that you accept our{' '}
            <a
              href="#privacy-notice"
              className="text-white underline underline-offset-[3px] transition-colors hover:text-[rgba(255,255,255,0.62)]"
            >
              Privacy Notice
            </a>{' '}
            and{' '}
            <a
              href="#service-contract"
              className="text-white underline underline-offset-[3px] transition-colors hover:text-[rgba(255,255,255,0.62)]"
            >
              Service Contract
            </a>
            .
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE DEMO PREVIEW (TRY BEFORE LOGIN)                            */}
      {/* ========================================================================= */}
      <section id="playground" className="relative w-full border-t border-[rgba(255,255,255,0.14)] py-24 sm:py-32 scroll-mt-12 px-[clamp(20px,5vw,100px)]">
        {/* Section Header */}
        <div className="max-w-4xl mb-16">
          <div
            className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase mb-6"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 'clamp(11px, 0.72vw, 13px)',
              letterSpacing: '0.2em',
              padding: '8px 16px',
            }}
          >
            [ 01 // INTERACTIVE SYSTEM PLAYGROUND ]
          </div>

          <h2
            className="text-white uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(34px, 4.5vw, 68px)',
              letterSpacing: '0.03em',
            }}
          >
            MULTIMODAL RAG IN REAL-TIME.
          </h2>

          <p
            className="uppercase leading-[1.4] mt-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 300,
              fontSize: 'clamp(11px, 0.9vw, 15px)',
              letterSpacing: '0.14em',
              color: 'var(--text-dim)',
            }}
          >
            TEST LIVE VECTOR RETRIEVAL, OCR DECOMPOSITION, AND DESIGN TOKEN SYNTHESIS.
          </p>
        </div>

        {/* Sharp Monolithic Console Frame */}
        <div className="border border-[rgba(255,255,255,0.18)] bg-black w-full">
          {/* Top Control Strip */}
          <div className="border-b border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="text-white uppercase leading-none"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                }}
              >
                [ SYSTEM CONSOLE ]
              </span>
              <span className="text-[rgba(255,255,255,0.3)]">|</span>
              <span
                className="text-[var(--text-dim)] uppercase leading-none flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>STATE: ONLINE</span>
              </span>
            </div>

            <div
              className="text-[var(--text-dim)] uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.14em',
              }}
            >
              MODEL // GEMINI 2.5 FLASH + GROQ LLaMA 120B
            </div>
          </div>

          {/* Preset Buttons Bar (Sharp Rect Tabs) */}
          <div className="border-b border-[rgba(255,255,255,0.14)] p-4 sm:p-5 flex flex-wrap gap-2.5 bg-[rgba(255,255,255,0.02)]">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setActiveDemo(preset)}
                className="transition-colors duration-150 uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(10px, 0.7vw, 12px)',
                  letterSpacing: '0.18em',
                  padding: '10px 18px',
                  backgroundColor:
                    activeDemo.id === preset.id
                      ? 'rgba(255,255,255,0.14)'
                      : 'rgba(255,255,255,0.04)',
                  color: activeDemo.id === preset.id ? '#ffffff' : 'var(--text-dim)',
                  border: `1px solid ${
                    activeDemo.id === preset.id
                      ? 'rgba(255,255,255,0.45)'
                      : 'rgba(255,255,255,0.12)'
                  }`,
                }}
              >
                {preset.pillLabel}
              </button>
            ))}
          </div>

          {/* Main Console Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Query & Synthesized Knowledge (7 Cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-[rgba(255,255,255,0.14)] space-y-6">
              {/* User Query Block */}
              <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-5">
                <span
                  className="block text-[var(--text-dim)] uppercase text-[10px] mb-1.5"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.18em',
                  }}
                >
                  QUERY_INPUT //
                </span>
                <p
                  className="text-white text-sm sm:text-base leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 300,
                  }}
                >
                  "{activeDemo.query}"
                </p>
              </div>

              {/* AI Synthesized Intelligence */}
              <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
                  <span
                    className="text-white text-xs uppercase flex items-center gap-2"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.18em',
                    }}
                  >
                    <GeminiStar className="w-3.5 h-3.5" />
                    <span>SYNTHESIS_REPORT</span>
                  </span>
                  <span
                    className="text-[var(--text-dim)] text-[11px] uppercase"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.14em',
                    }}
                  >
                    SOURCE: {activeDemo.postAuthor}
                  </span>
                </div>

                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 300,
                    color: 'var(--text-dim)',
                  }}
                >
                  {activeDemo.aiResponse}
                </p>

                {/* Color Swatch Matrix */}
                <div className="pt-3 border-t border-[rgba(255,255,255,0.1)] space-y-2">
                  <span
                    className="block text-[10px] uppercase text-[var(--text-dim)]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.16em',
                    }}
                  >
                    EXTRACTED_PALETTE_HEX:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {activeDemo.extractedColors.map((hex) => (
                      <div
                        key={hex}
                        className="flex items-center gap-2 border border-[rgba(255,255,255,0.16)] bg-black px-2.5 py-1.5"
                      >
                        <span
                          className="w-3 h-3 border border-[rgba(255,255,255,0.2)]"
                          style={{ backgroundColor: hex }}
                        />
                        <span
                          className="text-[11px] text-white"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detected Fonts */}
                <div className="pt-2 space-y-2">
                  <span
                    className="block text-[10px] uppercase text-[var(--text-dim)]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.16em',
                    }}
                  >
                    DETECTED_TYPOGRAPHY:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeDemo.extractedFonts.map((font) => (
                      <span
                        key={font}
                        className="border border-[rgba(255,255,255,0.16)] bg-black text-white text-[11px] px-2.5 py-1"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {font}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Code & Token Compiler (5 Cols) */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[rgba(255,255,255,0.015)]">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(255,255,255,0.14)]">
                  <span
                    className="text-xs uppercase text-white"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.18em',
                    }}
                  >
                    COMPILED_CODE_BUFFER
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="border border-[rgba(255,255,255,0.22)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-white text-[10px] px-3 py-1.5 uppercase transition-colors"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.18em',
                    }}
                  >
                    {copiedSnippet ? '[ COPIED ]' : '[ COPY CODE ]'}
                  </button>
                </div>

                <pre
                  className="text-xs p-4 bg-black border border-[rgba(255,255,255,0.14)] overflow-x-auto leading-relaxed max-h-72"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <code>{activeDemo.codeSnippet}</code>
                </pre>
              </div>

              <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.14)] flex items-center justify-between">
                <span
                  className="text-[11px] uppercase text-[var(--text-dim)]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.14em',
                  }}
                >
                  CATEGORY // {activeDemo.postCategory}
                </span>
                <Link
                  href="/dashboard"
                  className="text-[11px] uppercase text-white hover:underline underline-offset-4"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.16em',
                  }}
                >
                  OPEN REPOSITORY →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PROBLEM VS SOLUTION (PARADIGM COMPARISON)                              */}
      {/* ========================================================================= */}
      <section className="relative w-full border-t border-[rgba(255,255,255,0.14)] py-24 sm:py-32 px-[clamp(20px,5vw,100px)]">
        {/* Section Header */}
        <div className="max-w-4xl mb-16">
          <div
            className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase mb-6"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 'clamp(11px, 0.72vw, 13px)',
              letterSpacing: '0.2em',
              padding: '8px 16px',
            }}
          >
            [ 02 // SYSTEM COMPARISON ]
          </div>

          <h2
            className="text-white uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(34px, 4.5vw, 68px)',
              letterSpacing: '0.03em',
            }}
          >
            THE NATIVE BOOKMARK VOID.
          </h2>

          <p
            className="uppercase leading-[1.4] mt-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 300,
              fontSize: 'clamp(11px, 0.9vw, 15px)',
              letterSpacing: '0.14em',
              color: 'var(--text-dim)',
            }}
          >
            WHY TRADITIONAL SOCIAL BOOKMARKS REMAIN PERMANENTLY UNSEARCHABLE.
          </p>
        </div>

        {/* Monolithic Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column A: Without Insta_Rag */}
          <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.02)] p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div
                className="text-[var(--text-dim)] uppercase text-xs mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                }}
              >
                [ 01 // LEGACY INSTAGRAM SAVES ]
              </div>

              <h3
                className="text-white uppercase text-2xl sm:text-3xl mb-8"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                  letterSpacing: '0.04em',
                }}
              >
                UNINDEXED ARCHIVE
              </h3>

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span
                    className="text-red-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✕ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      UNSEARCHABLE PIXELS
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Text in video reels, carousel infographics, and screenshots cannot be queried.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="text-red-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✕ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      LINEAR RETRIEVAL FAILURE
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Requires 20+ minutes of manual scrolling to locate bookmarked inspirations from 90 days ago.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="text-red-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✕ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      ZERO AUTOMATED TAXONOMY
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'var(--text-dim)',
                      }}
                    >
                      No automatic categorization, tag extraction, or one-sentence summaries.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="text-red-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✕ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      SILOED ASSETS
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Zero ability to export design palettes, fonts, or code tokens to your workflow.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Column B: With Insta_Rag */}
          <div className="border border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.06)] p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div
                className="text-white uppercase text-xs mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                }}
              >
                [ 02 // INSTA_RAG INTELLIGENCE PROTOCOL ]
              </div>

              <h3
                className="text-white uppercase text-2xl sm:text-3xl mb-8"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                  letterSpacing: '0.04em',
                }}
              >
                ACTIVE KNOWLEDGE ENGINE
              </h3>

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span
                    className="text-emerald-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✓ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      768-D VECTOR RETRIEVAL
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.85)',
                      }}
                    >
                      Search ideas and intentions instead of keywords. Sub-50ms cosine distance retrieval.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="text-emerald-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✓ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      MULTIMODAL GEMINI 2.5 OCR
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.85)',
                      }}
                    >
                      Decomposes frames, slides, and posters to extract embedded typography and text.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="text-emerald-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✓ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      ZERO-EFFORT TAXONOMY
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.85)',
                      }}
                    >
                      Automatically categorizes bookmarks into UI/UX, Dev, Recipes, and Design clusters.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="text-emerald-400 select-none text-xs mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    [ ✓ ]
                  </span>
                  <div>
                    <strong className="text-white text-xs uppercase block font-mono tracking-[0.14em] mb-1">
                      1-CLICK CODE COMPILER
                    </strong>
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.85)',
                      }}
                    >
                      Instantly compile saved design inspirations into Tailwind CSS, Figma tokens, and CSS variables.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE FEATURES BENTO GRID (ARCHITECTURE MATRIX)                         */}
      {/* ========================================================================= */}
      <section className="relative w-full border-t border-[rgba(255,255,255,0.14)] py-24 sm:py-32 px-[clamp(20px,5vw,100px)]">
        {/* Section Header */}
        <div className="max-w-4xl mb-16">
          <div
            className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase mb-6"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 'clamp(11px, 0.72vw, 13px)',
              letterSpacing: '0.2em',
              padding: '8px 16px',
            }}
          >
            [ 03 // ARCHITECTURE MATRIX ]
          </div>

          <h2
            className="text-white uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(34px, 4.5vw, 68px)',
              letterSpacing: '0.03em',
            }}
          >
            ENGINEERED FOR DEEP RETRIEVAL.
          </h2>

          <p
            className="uppercase leading-[1.4] mt-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 300,
              fontSize: 'clamp(11px, 0.9vw, 15px)',
              letterSpacing: '0.14em',
              color: 'var(--text-dim)',
            }}
          >
            HIGH-DIMENSIONAL SEMANTIC INDEXING FOR THE MODERN CREATOR.
          </p>
        </div>

        {/* Sharp Grid Cells */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 768-D Vector Search (2 Cols) */}
          <div className="md:col-span-2 border border-[rgba(255,255,255,0.16)] bg-black p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div
                className="text-[var(--text-dim)] uppercase text-[11px] mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                }}
              >
                [ CAPABILITY // 01 ]
              </div>

              <h3
                className="text-white uppercase text-2xl sm:text-3xl mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                  letterSpacing: '0.03em',
                }}
              >
                768-D SEMANTIC VECTOR SEARCH
              </h3>

              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Query your saves like you speak. Search for abstract concepts like "clean dark mode landing page with glowing gradient borders" and let pgvector cosine distance surface the exact match in under 50 milliseconds.
              </p>
            </div>

            <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] p-3.5 flex flex-wrap items-center justify-between gap-3">
              <span
                className="text-xs text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                QUERY: "Figma auto-layout shortcuts"
              </span>
              <span
                className="text-[10px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                SIMILARITY: 0.942
              </span>
            </div>
          </div>

          {/* Card 2: 1-Click Design Token Export (1 Col) */}
          <div className="border border-[rgba(255,255,255,0.16)] bg-black p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div
                className="text-[var(--text-dim)] uppercase text-[11px] mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                }}
              >
                [ CAPABILITY // 02 ]
              </div>

              <h3
                className="text-white uppercase text-2xl sm:text-3xl mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                  letterSpacing: '0.03em',
                }}
              >
                DESIGN TOKEN COMPILER
              </h3>

              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Extract copyable Tailwind configs, Figma tokens, or CSS color variables directly from saved inspiration cards.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="text-[10px] border border-[rgba(255,255,255,0.16)] px-2.5 py-1 text-white uppercase"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                TAILWIND
              </span>
              <span
                className="text-[10px] border border-[rgba(255,255,255,0.16)] px-2.5 py-1 text-white uppercase"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                FIGMA JSON
              </span>
              <span
                className="text-[10px] border border-[rgba(255,255,255,0.16)] px-2.5 py-1 text-white uppercase"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                CSS ROOT
              </span>
            </div>
          </div>

          {/* Card 3: Multimodal OCR (1 Col) */}
          <div className="border border-[rgba(255,255,255,0.16)] bg-black p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div
                className="text-[var(--text-dim)] uppercase text-[11px] mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                }}
              >
                [ CAPABILITY // 03 ]
              </div>

              <h3
                className="text-white uppercase text-2xl sm:text-3xl mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                  letterSpacing: '0.03em',
                }}
              >
                VISION OCR & FONTS
              </h3>

              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Gemini 2.5 Flash analyzes text inside reels, extracting typography hierarchies, heading styles, and dominant hex colors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-blue-500 border border-[rgba(255,255,255,0.2)]" />
              <span className="w-3.5 h-3.5 bg-purple-500 border border-[rgba(255,255,255,0.2)]" />
              <span className="w-3.5 h-3.5 bg-pink-500 border border-[rgba(255,255,255,0.2)]" />
              <span className="w-3.5 h-3.5 bg-amber-500 border border-[rgba(255,255,255,0.2)]" />
              <span
                className="text-[10px] uppercase text-[var(--text-dim)] ml-2"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                AUTO_SWATCH
              </span>
            </div>
          </div>

          {/* Card 4: Zero Effort Taxonomy (2 Cols) */}
          <div className="md:col-span-2 border border-[rgba(255,255,255,0.16)] bg-black p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div
                className="text-[var(--text-dim)] uppercase text-[11px] mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                }}
              >
                [ CAPABILITY // 04 ]
              </div>

              <h3
                className="text-white uppercase text-2xl sm:text-3xl mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                  letterSpacing: '0.03em',
                }}
              >
                AUTOMATIC KNOWLEDGE TAXONOMY
              </h3>

              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Never manually organize folders again. As posts sync, AI automatically clusters them into smart domains like UI/UX, Dev Architecture, Motion Graphics, and Recipes with 1-line digests.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                [ UI/UX DESIGN // 14 ]
              </span>
              <span
                className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                [ TECH & AI // 09 ]
              </span>
              <span
                className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                [ RECIPES // 07 ]
              </span>
              <span
                className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                [ TYPOGRAPHY // 05 ]
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PROTOCOL PIPELINE (HOW IT WORKS)                                       */}
      {/* ========================================================================= */}
      <section className="relative w-full border-t border-[rgba(255,255,255,0.14)] py-24 sm:py-32 px-[clamp(20px,5vw,100px)]">
        {/* Section Header */}
        <div className="max-w-4xl mb-16">
          <div
            className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase mb-6"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 'clamp(11px, 0.72vw, 13px)',
              letterSpacing: '0.2em',
              padding: '8px 16px',
            }}
          >
            [ 04 // PIPELINE PROTOCOL ]
          </div>

          <h2
            className="text-white uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(34px, 4.5vw, 68px)',
              letterSpacing: '0.03em',
            }}
          >
            THREE-STAGE SYSTEM INGESTION.
          </h2>

          <p
            className="uppercase leading-[1.4] mt-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 300,
              fontSize: 'clamp(11px, 0.9vw, 15px)',
              letterSpacing: '0.14em',
              color: 'var(--text-dim)',
            }}
          >
            FROM RAW BOOKMARKS TO PRODUCTION-READY CODE SPECIFICATION.
          </p>
        </div>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Stage 01 */}
          <div className="border border-[rgba(255,255,255,0.14)] bg-black p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div
                className="text-[clamp(42px,5vw,72px)] leading-none text-white mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                }}
              >
                01
              </div>

              <h3
                className="text-white uppercase text-lg sm:text-xl mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.14em',
                }}
              >
                INGESTION & SYNC
              </h3>

              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Connect your library with 1-click session key sync or upload your official Instagram data export ZIP. All requests are securely scoped to your private user ID.
              </p>
            </div>

            <div
              className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.1)] text-[11px] text-[var(--text-dim)] uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              STAGE // CONNECTION
            </div>
          </div>

          {/* Stage 02 */}
          <div className="border border-[rgba(255,255,255,0.14)] bg-black p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div
                className="text-[clamp(42px,5vw,72px)] leading-none text-white mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                }}
              >
                02
              </div>

              <h3
                className="text-white uppercase text-lg sm:text-xl mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.14em',
                }}
              >
                OCR & VECTOR COMPUTE
              </h3>

              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Gemini 2.5 Flash extracts video frames, text overlays, and fonts. High-dimensional 768-D vector embeddings are computed and indexed into pgvector.
              </p>
            </div>

            <div
              className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.1)] text-[11px] text-[var(--text-dim)] uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              STAGE // COMPILATION
            </div>
          </div>

          {/* Stage 03 */}
          <div className="border border-[rgba(255,255,255,0.14)] bg-black p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div
                className="text-[clamp(42px,5vw,72px)] leading-none text-white mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 200,
                }}
              >
                03
              </div>

              <h3
                className="text-white uppercase text-lg sm:text-xl mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.14em',
                }}
              >
                RETRIEVAL & EXPORT
              </h3>

              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--text-dim)',
                }}
              >
                Query your entire visual library using natural language, inspect source post citations, and export Tailwind code or Figma tokens with 1 click.
              </p>
            </div>

            <div
              className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.1)] text-[11px] text-[var(--text-dim)] uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              STAGE // GENERATION
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SYSTEM INQUIRIES (FAQ)                                                 */}
      {/* ========================================================================= */}
      <section className="relative w-full border-t border-[rgba(255,255,255,0.14)] py-24 sm:py-32 px-[clamp(20px,5vw,100px)]">
        {/* Section Header */}
        <div className="max-w-4xl mb-16">
          <div
            className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase mb-6"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 'clamp(11px, 0.72vw, 13px)',
              letterSpacing: '0.2em',
              padding: '8px 16px',
            }}
          >
            [ 05 // SYSTEM INQUIRIES ]
          </div>

          <h2
            className="text-white uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(34px, 4.5vw, 68px)',
              letterSpacing: '0.03em',
            }}
          >
            TECHNICAL SPECIFICATIONS.
          </h2>

          <p
            className="uppercase leading-[1.4] mt-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 300,
              fontSize: 'clamp(11px, 0.9vw, 15px)',
              letterSpacing: '0.14em',
              color: 'var(--text-dim)',
            }}
          >
            QUESTIONS REGARDING SECURITY, INGESTION, AND MODEL TOPOLOGY.
          </p>
        </div>

        {/* Sharp Accordion Matrix */}
        <div className="border-t border-[rgba(255,255,255,0.14)]">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="border-b border-[rgba(255,255,255,0.14)] transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left py-6 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span
                      className="text-white text-xs opacity-50 font-mono"
                    >
                      [{faq.code}]
                    </span>
                    <span
                      className="text-base sm:text-lg text-white group-hover:text-[var(--text-dim)] transition-colors"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                      }}
                    >
                      {faq.question}
                    </span>
                  </div>

                  <span
                    className="text-white text-xs font-mono select-none px-2"
                  >
                    {isOpen ? '[-]' : '[+]'}
                  </span>
                </button>

                {isOpen && (
                  <div className="pb-6 pl-10 sm:pl-14 max-w-3xl">
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        color: 'var(--text-dim)',
                      }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. INITIALIZE / FINAL REPOSITORY CTA (ECHOID AESTHETIC)                   */}
      {/* ========================================================================= */}
      <section className="relative w-full border-t border-[rgba(255,255,255,0.14)] py-24 sm:py-32 px-[clamp(20px,5vw,100px)] bg-black">
        <div className="max-w-4xl">
          <div
            className="inline-block bg-[rgba(255,255,255,0.09)] text-white leading-none uppercase mb-8"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 'clamp(11px, 0.72vw, 13px)',
              letterSpacing: '0.2em',
              padding: '8px 16px',
            }}
          >
            [ 06 // REPOSITORY INITIALIZATION ]
          </div>

          <h2
            className="text-white uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(36px, 5.5vw, 84px)',
              letterSpacing: '0.03em',
            }}
          >
            INITIALIZE YOUR INSTA_RAG REPOSITORY.
          </h2>

          <p
            className="uppercase leading-[1.4] mt-6 max-w-2xl"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 300,
              fontSize: 'clamp(11px, 0.9vw, 16px)',
              letterSpacing: '0.14em',
              color: 'var(--text-dim)',
            }}
          >
            TRANSFORM PASSIVE INSTAGRAM BOOKMARKS INTO AN ACTIONABLE MULTIMODAL INTELLIGENCE LAYER.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                  letterSpacing: '0.22em',
                  padding: '16px 36px',
                  backgroundColor: 'var(--fill-solid)',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--fill-solid)';
                }}
              >
                OPEN DASHBOARD →
              </Link>
              <Link
                href="/ask"
                className="rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase border border-[rgba(255,255,255,0.2)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                  letterSpacing: '0.22em',
                  padding: '16px 36px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-dim)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                ASK AI AGENT
              </Link>
            </SignedIn>

            <SignedOut>
              <Link
                href="/signup"
                className="rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                  letterSpacing: '0.22em',
                  padding: '16px 36px',
                  backgroundColor: 'var(--fill-solid)',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--fill-solid)';
                }}
              >
                INITIALIZE FREE ACCOUNT →
              </Link>
              <Link
                href="/login"
                className="rounded-none flex items-center justify-center transition-all duration-200 text-center uppercase border border-[rgba(255,255,255,0.2)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                  letterSpacing: '0.22em',
                  padding: '16px 36px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-dim)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                SIGN IN
              </Link>
            </SignedOut>
          </div>
        </div>
      </section>
    </div>
  );
}
