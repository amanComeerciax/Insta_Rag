'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Sparkles, Database, Cpu } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // On full-screen application views (Dashboard, Ask AI, Chat, Onboarding, Auth), the global footer is hidden
  const isAppRoute =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/ask') ||
    pathname?.startsWith('/chat') ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup');

  if (isAppRoute) {
    return null;
  }

  return (
    <footer className="border-t border-[rgba(255,255,255,0.14)] bg-black py-10 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white text-black flex items-center justify-center font-bold">
              <Bookmark className="w-3.5 h-3.5 text-black fill-black" />
            </div>
            <div>
              <span
                className="text-white text-sm uppercase block"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  letterSpacing: '0.08em',
                }}
              >
                INSTA_RAG
              </span>
              <p
                className="text-[11px] uppercase mt-0.5"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-dim)',
                  letterSpacing: '0.12em',
                }}
              >
                MULTIMODAL RAG KNOWLEDGE BASE FOR SAVED POSTS
              </p>
            </div>
          </div>

          {/* Minimal Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-3 py-1 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] text-white text-[10px] uppercase flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
            >
              [ GEMINI 2.5 FLASH ]
            </span>
            <span
              className="px-3 py-1 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] text-white text-[10px] uppercase flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
            >
              [ 768-D EMBEDDINGS ]
            </span>
            <span
              className="px-3 py-1 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] text-white text-[10px] uppercase flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
            >
              [ PGVECTOR DATABASE ]
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)] flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px]">
          <p
            className="uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              letterSpacing: '0.12em',
            }}
          >
            © {new Date().getFullYear()} INSTA_RAG. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="uppercase text-[var(--text-dim)] hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
            >
              DASHBOARD
            </Link>
            <Link
              href="/ask"
              className="uppercase text-[var(--text-dim)] hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
            >
              ASK AI
            </Link>
            <Link
              href="/chat"
              className="uppercase text-[var(--text-dim)] hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
            >
              DIRECT MESSAGES
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
