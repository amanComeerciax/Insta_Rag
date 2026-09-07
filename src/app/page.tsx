'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Search, 
  FolderTree, 
  ArrowRight, 
  Zap, 
  Check, 
  Key,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-16 sm:pt-24 lg:pt-32 text-center max-w-4xl mx-auto px-4 sm:px-6">
        {/* Minimal pill badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>AI-Powered Instagram Saved Posts Organizer</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
          Your Instagram Saves, <br className="hidden sm:inline" />
          Organized with AI.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-xl mx-auto leading-relaxed">
          Stop scrolling through unorganized bookmarks. Automatically categorize, summarize, and semantically search your saved Instagram library.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg text-sm font-semibold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Highlights bar */}
        <div className="mt-16 pt-8 border-t border-neutral-900 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-neutral-400">
          <div className="flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-neutral-300" />
            <span>Semantic Search</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-neutral-300" />
            <span>Auto Categorization</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-neutral-300" />
            <span>Direct Instagram Sync</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-neutral-300" />
            <span>AI Summaries</span>
          </div>
        </div>
      </section>

      {/* 2. Three Pillars / Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-neutral-900 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Semantic Natural Search</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Find posts by idea rather than exact words. Powered by 768-dimensional vector embeddings and cosine similarity search.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200">
                <FolderTree className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Zero-Effort Taxonomies</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Gemini 2.5 Flash analyzes captions, generates 1-sentence summaries, and categorizes bookmarks automatically into neat clusters.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Direct One-Click Sync</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Directly sync your saved posts using your Instagram session key without manual scrolling or third-party extensions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Ready CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-neutral-950 p-10 sm:p-14 rounded-2xl border border-neutral-800 space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to organize your saves?</h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            Sync your bookmarks directly and let AI organize, categorize, and index everything for you.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
