import React from 'react';
import Link from 'next/link';
import { Bookmark, Sparkles, Database, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black mt-24 py-10 text-xs text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center font-bold">
              <Bookmark className="w-3.5 h-3.5 text-black fill-black" />
            </div>
            <div>
              <span className="font-medium text-neutral-200">SaveSort AI</span>
              <p className="text-[11px] text-neutral-500">Organize and search your Instagram saves using AI.</p>
            </div>
          </div>

          {/* Minimal Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-neutral-400" /> Gemini 2.5 Flash
            </span>
            <span className="px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-neutral-400" /> text-embedding-004
            </span>
            <span className="px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
              <Database className="w-3 h-3 text-neutral-400" /> Supabase pgvector
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} SaveSort AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-neutral-300 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
