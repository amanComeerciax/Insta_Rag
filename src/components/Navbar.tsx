'use client';

import React from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, LayoutDashboard, MessageSquare, Sparkles } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Navbar() {
  const pathname = usePathname();

  // On Dashboard, the dedicated full-bleed sidebar & top-nav takes over
  if (pathname === '/dashboard') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Minimal Monochrome Logo */}
        <NextLink href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
            <Bookmark className="w-4 h-4 text-black fill-black" />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-white">
              Insta<span className="text-neutral-400 font-normal">_Rag</span>
            </span>
          </div>
        </NextLink>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/80 px-2 py-1 rounded-lg border border-neutral-800">
          <NextLink
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
            Saved Posts
          </NextLink>
          <NextLink
            href="/ask"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            Ask AI
          </NextLink>
          <NextLink
            href="/chat"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
            Direct Messages
          </NextLink>
        </nav>

        {/* Right CTA / Clerk Auth Status */}
        <div className="flex items-center gap-3">
          <SignedIn>
            <div className="flex items-center gap-3">
              <NextLink
                href="/dashboard"
                className="hidden sm:inline-flex text-xs font-medium text-neutral-300 hover:text-white px-3 py-1.5 transition-colors"
              >
                Dashboard
              </NextLink>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8 rounded-lg border border-neutral-700',
                  },
                }}
              />
            </div>
          </SignedIn>

          <SignedOut>
            <div className="flex items-center gap-2">
              <NextLink
                href="/login"
                className="text-xs font-medium text-neutral-400 hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign In
              </NextLink>
              <NextLink
                href="/dashboard"
                className="text-xs font-medium text-black bg-white hover:bg-neutral-200 px-3.5 py-1.5 rounded-lg transition-colors"
              >
                Open Dashboard
              </NextLink>
            </div>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
