'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SavedPost } from '@/types';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  Code2, 
  Loader2, 
  Download, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  Film,
  Image as ImageIcon
} from 'lucide-react';

interface PostDetailModalProps {
  post: SavedPost | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

interface ExtractedCode {
  explanation: string;
  html: string;
  css: string;
  javascript: string;
}

export default function PostDetailModal({ post, onClose, onDelete }: PostDetailModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeResult, setCodeResult] = useState<ExtractedCode | null>(null);
  const [extractingCode, setExtractingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [activeCodeTab, setActiveCodeTab] = useState<'css' | 'html' | 'js'>('css');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [summary, setSummary] = useState(post?.ai_summary || '');
  const [analyzingSummary, setAnalyzingSummary] = useState(false);
  const [mediaViewMode, setMediaViewMode] = useState<'cover' | 'player'>('cover');
  const [videoError, setVideoError] = useState(false);

  // Per-post cache and active post tracker to isolate requests
  const [codeCache, setCodeCache] = useState<Record<string, ExtractedCode>>({});
  const activePostIdRef = useRef<string>(post?.id || post?.instagram_post_id || '');

  // Reset slide index and code whenever post changes
  useEffect(() => {
    const currentId = post?.id || post?.instagram_post_id || '';
    activePostIdRef.current = currentId;

    setCurrentSlideIndex(0);
    setExtractingCode(false);
    setAnalyzingSummary(false);
    setCodeError('');
    setSummary(post?.ai_summary || '');
    setCodeResult(codeCache[currentId] || null);
    setMediaViewMode(post?.video_url ? 'player' : 'cover');
    setVideoError(false);
  }, [post?.id, post?.instagram_post_id, post?.video_url, codeCache]);

  const handleDeepAnalyze = async () => {
    if (!post) return;
    const targetPostId = post.id || post.instagram_post_id;
    setAnalyzingSummary(true);
    try {
      const res = await fetch('/api/analyze-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: targetPostId,
          caption: post.caption,
          postUrl: post.post_url,
        }),
      });
      const data = await res.json();
      if (activePostIdRef.current === targetPostId && data.ai_summary) {
        setSummary(data.ai_summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (activePostIdRef.current === targetPostId) {
        setAnalyzingSummary(false);
      }
    }
  };

  if (!post) return null;

  // Only show Code & CSS generator if post is actually code/developer related
  const isCodePost = (() => {
    if (!post) return false;
    if (post.category === 'Coding & Tech') return true;
    const text = `${post.caption || ''} ${post.ai_summary || ''} ${post.category || ''}`.toLowerCase();
    const codeRegex = /\b(html|css|javascript|js|react|nextjs|vue|python|coding|code|developer|frontend|backend|program|programming|web design|web dev|github|tailwind|component|snippets?|vscode|script|threejs|canvas)\b/;
    return codeRegex.test(text);
  })();

  // Gather all slides (carousel items or single thumbnail)
  const slides: string[] = [];
  if (post.carousel_media_urls && post.carousel_media_urls.length > 0) {
    slides.push(...post.carousel_media_urls);
  } else if (post.thumbnail_url) {
    slides.push(post.thumbnail_url);
  }

  const isVideoOrReel = Boolean(
    post.media_type === 'reel' || 
    post.media_type === 'video' || 
    post.video_url
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(post.post_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExtractCode = async () => {
    if (!post) return;
    const targetPostId = post.id || post.instagram_post_id;
    setExtractingCode(true);
    setCodeError('');

    try {
      const res = await fetch('/api/extract-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: post.caption,
          thumbnailUrl: slides[currentSlideIndex] || post.thumbnail_url,
          imageUrls: slides, // passes all carousel slides to Gemini Vision!
          postUrl: post.post_url,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract code.');
      }

      const extracted: ExtractedCode = {
        explanation: data.explanation || '',
        html: data.html || '',
        css: data.css || '',
        javascript: data.javascript || '',
      };

      // Store in per-post cache so it stays preserved
      setCodeCache((prev) => ({ ...prev, [targetPostId]: extracted }));

      // Only update UI if the user is STILL viewing this exact post
      if (activePostIdRef.current === targetPostId) {
        setCodeResult(extracted);
        if (data.css) {
          setActiveCodeTab('css');
        } else if (data.html) {
          setActiveCodeTab('html');
        }
      }
    } catch (err: any) {
      if (activePostIdRef.current === targetPostId) {
        setCodeError(err?.message || 'Error extracting code from post.');
      }
    } finally {
      if (activePostIdRef.current === targetPostId) {
        setExtractingCode(false);
      }
    }
  };

  const getActiveCodeContent = () => {
    if (!codeResult) return '';
    if (activeCodeTab === 'css') return codeResult.css;
    if (activeCodeTab === 'html') return codeResult.html;
    return codeResult.javascript;
  };

  const handleCopyCode = () => {
    const text = getActiveCodeContent();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadFile = () => {
    const text = getActiveCodeContent();
    if (!text) return;

    const extension = activeCodeTab === 'css' ? 'css' : activeCodeTab === 'html' ? 'html' : 'js';
    const mimeType = activeCodeTab === 'html' ? 'text/html' : 'text/css';
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post_${post.instagram_post_id}_style.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formattedDate = post.saved_at
    ? new Date(post.saved_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-neutral-900 text-xs font-medium text-neutral-200 border border-neutral-800">
              {post.category}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              #{post.instagram_post_id}
            </span>
            {slides.length > 1 && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                <Layers className="w-3 h-3" />
                {slides.length} Slides
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Mode Switcher for Reels & Videos */}
          {isVideoOrReel && (
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMediaViewMode('player')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    mediaViewMode === 'player'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch Video / Reel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaViewMode('cover')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    mediaViewMode === 'cover'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Cover Photo</span>
                </button>
              </div>

              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
              >
                <span>Instagram App ↗</span>
              </a>
            </div>
          )}

          {/* Video Player Mode */}
          {isVideoOrReel && mediaViewMode === 'player' ? (
            <div className="space-y-2">
              {post.video_url && !videoError ? (
                <div className="relative rounded-lg overflow-hidden max-h-[460px] bg-black flex items-center justify-center border border-neutral-800">
                  <video
                    key={post.video_url}
                    src={post.video_url}
                    poster={post.thumbnail_url || undefined}
                    controls
                    autoPlay
                    playsInline
                    crossOrigin="anonymous"
                    onError={() => setVideoError(true)}
                    className="w-full max-h-[460px] object-contain rounded-lg bg-black"
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center">
                  <iframe
                    src={`https://www.instagram.com/reel/${post.instagram_post_id}/embed/`}
                    className="w-full h-[480px] sm:h-[520px] border-0 rounded-lg bg-neutral-950"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                    scrolling="no"
                  />
                  <div className="w-full bg-neutral-900/90 px-3 py-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <Play className="w-3 h-3 fill-current text-neutral-400" />
                      Live Reel Player
                    </span>
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-neutral-200 hover:text-white font-medium hover:underline"
                    >
                      <span>Open on Instagram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multi-Slide Carousel or Cover Viewer */
            slides.length > 0 && (
              <div className="space-y-2">
                <div
                  className={`relative rounded-lg overflow-hidden max-h-80 bg-neutral-900 flex items-center justify-center border border-neutral-800 group ${
                    isVideoOrReel ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (isVideoOrReel) setMediaViewMode('player');
                  }}
                >
                  <img
                    src={slides[currentSlideIndex]}
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-full max-h-80 object-contain bg-black transition-transform duration-300 group-hover:scale-[1.01]"
                  />

                  {/* Play Overlay for Reels & Videos */}
                  {isVideoOrReel && (
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 flex flex-col items-center justify-center transition-all">
                      <div className="w-14 h-14 rounded-full bg-white text-black shadow-2xl flex items-center justify-center group-hover:scale-110 active:scale-95 transition-all">
                        <Play className="w-6 h-6 fill-black ml-0.5 text-black" />
                      </div>
                      <div className="mt-2.5 px-3 py-1 rounded-full bg-black/80 text-[11px] font-medium text-white border border-neutral-700 backdrop-blur-sm shadow-md flex items-center gap-1.5">
                        <Play className="w-2.5 h-2.5 fill-current text-white" />
                        <span>Click to Play Reel</span>
                      </div>
                    </div>
                  )}

                  {/* Multi-page Navigation Arrows */}
                  {slides.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-neutral-700 transition-colors z-10"
                        title="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-neutral-700 transition-colors z-10"
                        title="Next Slide"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Slide indicator badge */}
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/80 text-[11px] font-mono text-neutral-200 border border-neutral-700 backdrop-blur-sm z-10">
                        {currentSlideIndex + 1} / {slides.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip for Carousel Slides */}
                {slides.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {slides.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`relative w-12 h-12 rounded-md overflow-hidden border flex-shrink-0 transition-all ${
                          currentSlideIndex === idx
                            ? 'border-white ring-1 ring-white'
                            : 'border-neutral-800 opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-mono px-1 text-white">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* AI Summary Box */}
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
                AI Summary
              </span>
              <button
                type="button"
                onClick={handleDeepAnalyze}
                disabled={analyzingSummary}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800"
                title="Deep Gemini 3.6 Flash analysis for this post"
              >
                {analyzingSummary ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-3 h-3 text-white" />
                )}
                <span>{analyzingSummary ? 'Analyzing...' : 'Deep AI Summary'}</span>
              </button>
            </div>
            <p className="text-sm text-neutral-200 font-medium leading-relaxed">
              {summary || post.ai_summary || 'No summary available.'}
            </p>
          </div>

          {/* AI Code / CSS Generator Section (Only visible for posts containing code/web design) */}
          {isCodePost && (
            <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Code2 className="w-4 h-4 text-white" />
                <span>AI Code & CSS Generator (Vision AI)</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                Groq + Gemini AI
              </span>
            </div>

            {!codeResult ? (
              <div className="space-y-2.5">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Groq Vision AI will inspect the {slides.length > 1 ? `${slides.length} slides` : 'photo'} and caption to automatically reconstruct the exact working HTML & CSS code.
                </p>

                {codeError && (
                  <div className="p-2.5 rounded bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExtractCode}
                  disabled={extractingCode}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                >
                  {extractingCode ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning all slides & generating code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract & Generate HTML / CSS Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {codeResult.explanation && (
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {codeResult.explanation}
                  </p>
                )}

                {/* Tabs & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    {codeResult.css && (
                      <button
                        onClick={() => setActiveCodeTab('css')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          activeCodeTab === 'css' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        CSS
                      </button>
                    )}
                    {codeResult.html && (
                      <button
                        onClick={() => setActiveCodeTab('html')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          activeCodeTab === 'html' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        HTML
                      </button>
                    )}
                    {codeResult.javascript && (
                      <button
                        onClick={() => setActiveCodeTab('js')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          activeCodeTab === 'js' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        JS
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white border border-neutral-800 transition-colors flex items-center gap-1"
                      title="Copy active code"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span className="text-white">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-neutral-400" />
                          <span>Copy {activeCodeTab.toUpperCase()}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadFile}
                      className="px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white border border-neutral-800 transition-colors flex items-center gap-1"
                      title="Download file"
                    >
                      <Download className="w-3 h-3 text-neutral-400" />
                      <span>Download .{activeCodeTab}</span>
                    </button>
                  </div>
                </div>

                {/* Code Display Box */}
                <div className="relative rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden">
                  <pre className="p-3.5 text-xs text-neutral-200 font-mono overflow-x-auto max-h-64 leading-relaxed whitespace-pre">
                    <code>{getActiveCodeContent()}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Caption */}
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block mb-1.5">
              Original Caption
            </span>
            <div className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
              {post.caption || 'No caption available.'}
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block uppercase font-mono mb-0.5">Media</span>
              <span className="text-neutral-200 capitalize">{post.media_type}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block uppercase font-mono mb-0.5">Saved Date</span>
              <span className="text-neutral-200">{formattedDate}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 col-span-2 sm:col-span-1">
              <span className="text-neutral-500 text-[10px] block uppercase font-mono mb-0.5">Vector</span>
              <span className="text-neutral-200 font-mono">768-D Index</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to remove this post?')) {
                    onDelete(post.id || post.instagram_post_id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                title="Remove this post"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-500 hover:text-white" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition-colors"
          >
            <span>View on Instagram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
