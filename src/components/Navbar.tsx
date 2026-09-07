'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { Bookmark, LayoutDashboard, LogOut, MessageSquare, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch {
      // Offline fallback
    }
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (e) {
      console.error(e);
    }
  };

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
              SaveSort <span className="text-neutral-400 font-normal">AI</span>
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

        {/* Right CTA / Auth Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-neutral-400 truncate max-w-[150px]">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}
