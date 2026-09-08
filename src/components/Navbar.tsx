'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Auto-close on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 901 && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  // On internal app routes & auth pages, the marketing navbar is hidden
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
    <>
      <header
        className="sticky top-0 z-[60] w-full border-b border-[rgba(255,255,255,0.12)] bg-black/80 backdrop-blur-md transition-colors"
        style={{
          padding: '0 clamp(20px, 2.4vw, 34px)',
        }}
      >
        <div className="w-full h-16 sm:h-20 flex items-center justify-between gap-8">
          {/* LEFT — Logo Link "INSTA_RAG" in Sora 200 */}
          <NextLink
            href="/"
            onClick={() => setMobileOpen(false)}
            className="text-white no-underline leading-none select-none uppercase tracking-[0.16em] transition-opacity hover:opacity-85"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 200,
              fontSize: 'clamp(20px, 1.75vw, 30px)',
            }}
          >
            INSTA_RAG
          </NextLink>

          {/* RIGHT — Nav Cluster */}
          <div className="flex items-center gap-[clamp(24px,3.2vw,62px)]">
            {/* Desktop Navigation Links (≥901px) */}
            <nav className="hidden lg:flex items-center gap-[clamp(20px,2.8vw,56px)]">
              <NextLink
                href="/dashboard"
                className="text-white uppercase tracking-[0.18em] transition-colors duration-200 hover:text-[rgba(255,255,255,0.62)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                }}
              >
                SAVED POSTS
              </NextLink>

              <NextLink
                href="/ask"
                className="text-white uppercase tracking-[0.18em] transition-colors duration-200 hover:text-[rgba(255,255,255,0.62)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                }}
              >
                ASK AI
              </NextLink>

              <NextLink
                href="/chat"
                className="text-white uppercase tracking-[0.18em] transition-colors duration-200 hover:text-[rgba(255,255,255,0.62)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                }}
              >
                DIRECT MESSAGES
              </NextLink>

              <NextLink
                href="/#playground"
                className="text-white uppercase tracking-[0.18em] transition-colors duration-200 hover:text-[rgba(255,255,255,0.62)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 'clamp(11px, 0.78vw, 14px)',
                }}
              >
                PLAYGROUND
              </NextLink>
            </nav>

            {/* Desktop Auth CTAs (≥901px) */}
            <div className="hidden lg:flex items-center gap-4">
              <SignedIn>
                <NextLink
                  href="/dashboard"
                  className="uppercase tracking-[0.18em] transition-all duration-200 border border-[var(--line-strong)] hover:bg-[var(--fill-ghost)] hover:border-[rgba(255,255,255,0.5)] text-white"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 'clamp(11px, 0.78vw, 14px)',
                    padding: 'clamp(10px, 0.9vw, 14px) clamp(18px, 1.6vw, 28px)',
                  }}
                >
                  DASHBOARD →
                </NextLink>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'w-7 h-7 rounded-none border border-[rgba(255,255,255,0.24)]',
                    },
                  }}
                />
              </SignedIn>

              <SignedOut>
                <NextLink
                  href="/login"
                  className="uppercase tracking-[0.18em] text-[var(--text-dim)] hover:text-white transition-colors duration-200 text-xs mr-2"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  SIGN IN
                </NextLink>
                <NextLink
                  href="/signup"
                  className="uppercase tracking-[0.18em] transition-all duration-200 border border-[var(--line-strong)] hover:bg-[var(--fill-ghost)] hover:border-[rgba(255,255,255,0.5)] text-white"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 'clamp(11px, 0.78vw, 14px)',
                    padding: 'clamp(10px, 0.9vw, 14px) clamp(18px, 1.6vw, 28px)',
                  }}
                >
                  JOIN UP
                </NextLink>
              </SignedOut>
            </div>

            {/* Mobile Hamburger Button (≤900px) */}
            <button
              type="button"
              aria-label={mobileOpen ? 'Close site menu' : 'Open site menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-site-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden relative w-11 h-11 flex items-center justify-center text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
            >
              <span className="sr-only">Menu</span>
              <div className="relative w-[22px] h-[13px] flex flex-col justify-between">
                {/* Bar 1 */}
                <span
                  className="w-full h-px bg-white transition-all duration-300 origin-center"
                  style={{
                    transform: mobileOpen ? 'translateY(6px) rotate(45deg)' : 'none',
                  }}
                />
                {/* Bar 2 */}
                <span
                  className="w-full h-px bg-white transition-all duration-200"
                  style={{
                    opacity: mobileOpen ? 0 : 1,
                    transform: mobileOpen ? 'scaleX(0)' : 'scaleX(1)',
                  }}
                />
                {/* Bar 3 */}
                <span
                  className="w-full h-px bg-white transition-all duration-300 origin-center"
                  style={{
                    transform: mobileOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
                  }}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay (Fullscreen Backdrop Blur) */}
      <div
        id="mobile-site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation menu"
        aria-hidden={!mobileOpen}
        className={`fixed inset-0 z-[55] lg:hidden bg-[rgba(4,4,6,0.95)] backdrop-blur-2xl transition-all duration-500 flex flex-col items-center justify-center p-8 ${
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col items-center text-center gap-8 w-full max-w-sm">
          <NextLink
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="text-white uppercase tracking-[0.14em] text-2xl transition-colors hover:text-[var(--text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            SAVED POSTS
          </NextLink>

          <NextLink
            href="/ask"
            onClick={() => setMobileOpen(false)}
            className="text-white uppercase tracking-[0.14em] text-2xl transition-colors hover:text-[var(--text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ASK AI
          </NextLink>

          <NextLink
            href="/chat"
            onClick={() => setMobileOpen(false)}
            className="text-white uppercase tracking-[0.14em] text-2xl transition-colors hover:text-[var(--text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            DIRECT MESSAGES
          </NextLink>

          <NextLink
            href="/#playground"
            onClick={() => setMobileOpen(false)}
            className="text-white uppercase tracking-[0.14em] text-2xl transition-colors hover:text-[var(--text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            PLAYGROUND
          </NextLink>

          <div className="w-full pt-6 border-t border-[rgba(255,255,255,0.14)] flex flex-col gap-4">
            <SignedIn>
              <NextLink
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="w-full uppercase tracking-[0.22em] text-center border border-[var(--line-strong)] text-white py-4"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                DASHBOARD →
              </NextLink>
            </SignedIn>

            <SignedOut>
              <NextLink
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="w-full uppercase tracking-[0.22em] text-center border border-[var(--line-strong)] text-white py-4 hover:bg-[var(--fill-ghost)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                JOIN UP
              </NextLink>
              <NextLink
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full uppercase tracking-[0.18em] text-center text-[var(--text-dim)] hover:text-white py-2 text-xs"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                SIGN IN
              </NextLink>
            </SignedOut>
          </div>
        </nav>
      </div>
    </>
  );
}
