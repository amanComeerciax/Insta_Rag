'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Sparkles, Database, Cpu } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // On full-screen application views like Dashboard and Ask AI, the global footer is hidden
  // so it does not interfere with the sidebar and chat interfaces.
  if (pathname === '/dashboard' || pathname === '/ask') {
    return null;
  }

  return (
    <footer className="border-t border-neutral-800/80 bg-[#0a0b0e] mt-16 py-8 text-xs text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold shadow-sm">
              <Bookmark className="w-3.5 h-3.5 text-black fill-black" />
            </div>
            <div>
              <span className="font-bold text-neutral-200 text-sm">Insta_Rag</span>
              <p className="text-[11px] text-neutral-400">Multimodal RAG Knowledge Base for your saved Instagram posts.</p>
            </div>
          </div>

          {/* Minimal Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-blue-400" /> Gemini 2.5 Flash
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1.5 shadow-sm">
              <Cpu className="w-3 h-3 text-purple-400" /> text-embedding-004
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1.5 shadow-sm">
              <Database className="w-3 h-3 text-emerald-400" /> Supabase pgvector
            </span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} Insta_Rag. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-neutral-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/ask" className="hover:text-neutral-300 transition-colors">
              Ask AI
            </Link>
            <Link href="/chat" className="hover:text-neutral-300 transition-colors">
              Direct Messages
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
