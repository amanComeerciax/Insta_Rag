'use client';
import React, { useState, useEffect } from 'react';
import { Key, X, Loader2, CheckCircle2, AlertCircle, ArrowRight, HelpCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface CookieSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CookieSyncModal({ isOpen, onClose, onSuccess }: CookieSyncModalProps) {
  const { user } = useUser();
  const igSessionKey = user?.id ? `instasaved_ig_session_${user.id}` : 'instasaved_ig_session_guest';

  const [sessionId, setSessionId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maxPosts, setMaxPosts] = useState('100');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  // Restore saved session ID on modal open
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(igSessionKey);
        if (saved) setSessionId(saved);
      }
    } catch {}
  }, [isOpen, igSessionKey]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setErrorMsg('Please paste your Instagram sessionid cookie.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/import/cookie-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          maxPosts: parseInt(maxPosts, 10),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync with Instagram.');
      }

      // Persist session ID for 1-click future refreshes
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(igSessionKey, sessionId.trim());
        }
      } catch {}

      setSuccessMsg(`Success! Synced ${data.postsAdded || data.totalFetched} saved posts.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync. Please make sure the sessionid is fresh.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <Key className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Direct Instagram Cookie Sync</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-start gap-2 text-xs text-neutral-300">
            <AlertCircle className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-start gap-2 text-xs text-white">
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-300">
                Instagram sessionid Cookie
              </label>
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                <span>How to get this?</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Paste sessionid (or full cookie string) here..."
                className="w-full pr-10 pl-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                title={showPassword ? 'Hide value' : 'Show value'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible How-To Guide */}
          {showInstructions && (
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5 leading-relaxed">
              <span className="font-semibold text-white block">How to find your sessionid (Chrome):</span>
              <p>1. Open <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-white underline inline-flex items-center gap-0.5">instagram.com <ExternalLink className="w-2.5 h-2.5 inline" /></a> where you are logged in.</p>
              <p>2. Right-click anywhere ➔ <strong>Inspect</strong> (or press <code className="bg-neutral-800 px-1 py-0.5 rounded text-white">F12</code>).</p>
              <p>3. Go to <strong>Application</strong> tab (top) ➔ <strong>Cookies</strong> (left) ➔ <strong>https://www.instagram.com</strong>.</p>
              <p>4. Find the row named <strong className="text-white">sessionid</strong>, double-click its value, and copy it here.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Posts to Fetch
            </label>
            <select
              value={maxPosts}
              onChange={(e) => setMaxPosts(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-white"
            >
              <option value="50">Fetch 50 posts (~5 sec)</option>
              <option value="100">Fetch 100 posts (~10 sec)</option>
              <option value="200">Fetch 200 posts (~20 sec)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching directly from Instagram...</span>
              </>
            ) : (
              <>
                <span>Start Direct Sync</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
