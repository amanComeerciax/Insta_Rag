'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bookmark, AlertCircle, Check } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        if (error.message.includes('placeholder') || error.message.includes('fetch')) {
          setErrorMsg('Supabase credentials not configured in .env.local yet. You can click "Continue without sign up" below.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        if (data.session) {
          router.push('/onboarding');
        } else {
          setSuccessMsg('Account created! Please check your email to confirm.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign up.');
      setLoading(false);
    }
  };

  const handleBypass = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-neutral-950 p-8 rounded-xl border border-neutral-800 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center mx-auto mb-3">
            <Bookmark className="w-4 h-4 fill-black text-black" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-neutral-400">
            Organize your saved Instagram bookmarks
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-start gap-2 text-xs text-neutral-300">
            <AlertCircle className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-start gap-2 text-xs text-neutral-300">
            <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3.5">
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
              Password (min. 6 chars)
            </label>
            <input
              type="password"
              required
              minLength={6}
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
            {loading ? <span>Creating...</span> : <span>Create Account</span>}
          </button>
        </form>

        <div className="pt-2 text-center space-y-3">
          <button
            type="button"
            onClick={handleBypass}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            Continue to Dashboard without account →
          </button>

          <p className="text-xs text-neutral-500">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
