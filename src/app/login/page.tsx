'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bookmark, LogIn, AlertCircle, ArrowRight, Check } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(searchParams?.get('error') || '');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('placeholder') || error.message.includes('fetch') || error.message.includes('invalid URL')) {
          setErrorMsg('Supabase credentials not configured in .env.local yet. You can click "Continue without login" below.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg('Google OAuth requires configuring Google credentials in Supabase Dashboard.');
    }
  };

  const handleBypass = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-neutral-950 p-8 rounded-xl border border-neutral-800 space-y-6">
        {/* Branding */}
        <div className="text-center space-y-1">
          <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center mx-auto mb-3">
            <Bookmark className="w-4 h-4 fill-black text-black" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Sign in to SaveSort AI
          </h1>
          <p className="text-xs text-neutral-400">
            Access your organized Instagram bookmarks
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-start gap-2 text-xs text-neutral-300">
            <AlertCircle className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* OAuth */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-white transition-colors flex items-center justify-center gap-2"
        >
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-800 w-full" />
          <span className="bg-neutral-950 px-2 text-[10px] text-neutral-500 uppercase tracking-wider">
            or
          </span>
        </div>

        {/* Email form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? <span>Signing In...</span> : <span>Sign In</span>}
          </button>
        </form>

        <div className="pt-2 text-center space-y-3">
          <button
            type="button"
            onClick={handleBypass}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            Continue to Dashboard without sign in →
          </button>

          <p className="text-xs text-neutral-500">
            No account?{' '}
            <Link href="/signup" className="text-white hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-neutral-500 text-xs">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
