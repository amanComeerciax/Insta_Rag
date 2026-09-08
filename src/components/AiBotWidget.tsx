'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  RotateCcw, 
  ExternalLink, 
  Bookmark, 
  Image as ImageIcon, 
  ChevronRight, 
  Loader2, 
  ArrowRight, 
  Copy, 
  Check, 
  Play, 
  X, 
  Square,
  Maximize2,
  Minus,
  MessageSquare,
  Download,
  Palette,
  Code2,
  FileText
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import PostDetailModal from '@/components/PostDetailModal';
import { SavedPost, RAGCitation } from '@/types';
import { useUser } from '@clerk/nextjs';
import {
  extractColorPalette,
  generateTailwindConfig,
  generateFigmaTokens,
  generateCssVariables,
  downloadFile,
  formatConversationAsMarkdown,
} from '@/lib/exportUtils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGCitation[];
  suggestions?: string[];
  modelUsed?: string;
  provider?: string;
  isStreaming?: boolean;
}

/**
 * Iconic Google Gemini 4-point Sparkle SVG with multi-stop brand gradient
 */
function GeminiStar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
        fill="url(#widget-gemini-sparkle-gradient)"
      />
      <defs>
        <linearGradient id="widget-gemini-sparkle-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.4" stopColor="#9B72CB" />
          <stop offset="0.75" stopColor="#D96570" />
          <stop offset="1" stopColor="#FBBC05" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const BOT_QUICK_PILLS = [
  { label: '🎨 Fonts & Colors', prompt: 'What font pairings and color palettes did I bookmark for web design?' },
  { label: '💻 Show Design Code', prompt: 'Show CSS and HTML code for my bookmarked UI transitions or cards' },
  { label: '🍕 EATLY Breakdown', prompt: 'Break down the EATLY food delivery homepage design and key stats' },
  { label: '🎬 Summarize Reels', prompt: 'Summarize the key design takeaways from my saved reels and videos' },
];

export default function AiBotWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [allPosts, setAllPosts] = useState<SavedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPaletteState, setCopiedPaletteState] = useState<Record<string, 'tailwind' | 'figma' | 'css' | null>>({});
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHydratedRef = useRef(false);
  const activeKeyRef = useRef<string>('');

  // Storage key for bot widget
  const storageKey = user?.id ? `instasaved_rag_chat_${user.id}` : 'instasaved_rag_chat_guest';

  // Listen for custom trigger event (e.g. from sidebar or dashboard button)
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('open-ai-bot', handleOpenEvent);
    return () => window.removeEventListener('open-ai-bot', handleOpenEvent);
  }, []);

  // Hydrate chat history
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return;
    try {
      if (activeKeyRef.current === storageKey && isHydratedRef.current) return;
      activeKeyRef.current = storageKey;

      let saved = localStorage.getItem(storageKey);
      if (!saved && user?.id) {
        saved = localStorage.getItem('instasaved_rag_chat_guest');
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load bot chat history:', e);
    } finally {
      isHydratedRef.current = true;
    }
  }, [storageKey, isLoaded, user?.id]);

  // Persist chat history
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydratedRef.current) return;
    if (messages.length === 0 || isStreaming) return;

    try {
      const cleanToSave = messages.map(({ isStreaming: _, ...rest }) => rest);
      localStorage.setItem(storageKey, JSON.stringify(cleanToSave));
      if (user?.id) {
        localStorage.setItem('instasaved_rag_chat_guest', JSON.stringify(cleanToSave));
      }
    } catch (e) {
      console.warn('Could not persist bot chat history:', e);
    }
  }, [messages, storageKey, user?.id, isStreaming]);

  // Load all posts for source modal
  useEffect(() => {
    fetch('/api/posts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.posts)) {
          setAllPosts(data.posts);
        }
      })
      .catch((err) => console.warn('Failed to load posts for preview:', err));
  }, []);

  // Cleanup streaming timer on unmount
  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll inside widget
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen, isMinimized]);

  // Do not show floating widget on the full dedicated /ask page
  if (pathname === '/ask') {
    return null;
  }

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || input).trim();
    if (!text || loading || isStreaming) return;

    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    setIsStreaming(false);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryToSend) setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const lastAssistantWithSources = [...messages].reverse().find(
        (m) => m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length > 0
      );
      const activePostIds = lastAssistantWithSources?.sources?.map((s) => s.id || s.instagram_post_id) || [];

      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history,
          activePostIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer.');
      }

      const fullAnswer = data.answer || 'I could not generate an answer for this query.';
      const assistantId = `assistant_${Date.now()}`;
      const tokens = fullAnswer.match(/(\r\n|\r|\n|\s+|\S+)/g) || [fullAnswer];

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        sources: data.sources || [],
        suggestions: data.suggestions || [],
        modelUsed: data.modelUsed,
        provider: data.provider,
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
      setIsStreaming(true);

      let currentIdx = 0;
      let accumulated = '';
      const stepSize = tokens.length > 500 ? 3 : 2;

      streamingTimerRef.current = setInterval(() => {
        if (currentIdx >= tokens.length) {
          if (streamingTimerRef.current) {
            clearInterval(streamingTimerRef.current);
            streamingTimerRef.current = null;
          }
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullAnswer, isStreaming: false } : m
            )
          );
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          return;
        }

        for (let i = 0; i < stepSize && currentIdx < tokens.length; i++) {
          accumulated += tokens[currentIdx];
          currentIdx++;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated, isStreaming: true } : m
          )
        );
      }, 20);

    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error:** ${err.message || 'Something went wrong while querying your bookmarks.'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const handleCopyAnswer = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const md = formatConversationAsMarkdown(messages, 'SaveSort AI Bot Conversation');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(`SaveSort-AI-Bot-${dateStr}.md`, md, 'text/markdown;charset=utf-8');
  };

  const handleCopyTokens = async (messageId: string, format: 'tailwind' | 'figma' | 'css', content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPaletteState((prev) => ({ ...prev, [messageId]: format }));
      setTimeout(() => {
        setCopiedPaletteState((prev) => ({ ...prev, [messageId]: null }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy tokens:', err);
    }
  };

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1800);
    } catch (err) {
      console.error('Failed to copy hex:', err);
    }
  };

  const handleOpenSourcePost = (citation: RAGCitation) => {
    const found = allPosts.find(
      (p) => p.id === citation.id || p.instagram_post_id === citation.instagram_post_id
    );

    if (found) {
      setSelectedPost(found);
    } else {
      setSelectedPost({
        id: citation.id,
        user_id: 'direct_cookie_user',
        instagram_post_id: citation.instagram_post_id,
        post_url: citation.post_url,
        caption: citation.caption,
        ai_summary: citation.ai_summary,
        category: citation.category,
        media_type: 'carousel',
        thumbnail_url: citation.thumbnail_url,
        video_url: citation.video_url,
        saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleClearChat = () => {
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    setIsStreaming(false);
    setMessages([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
        localStorage.removeItem('instasaved_rag_chat_guest');
      }
    } catch {}
  };

  return (
    <>
      {/* 1. Floating AI Bot Trigger Button (Pinned on the side / bottom-right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 group animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="relative flex items-center gap-2.5 p-[1.5px] rounded-full bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] shadow-2xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-300"
            title="Ask AI Bot about your saved bookmarks"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#141517] hover:bg-[#1a1b1e] rounded-full text-white transition-colors">
              <div className="relative flex items-center justify-center">
                <GeminiStar className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              </div>
              <span className="font-semibold text-xs tracking-wide bg-gradient-to-r from-blue-300 via-indigo-200 to-rose-300 bg-clip-text text-transparent">
                Ask AI Bot
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 2. Floating AI Bot Side Panel / Drawer */}
      {isOpen && (
        <div 
          className={`fixed bottom-5 right-5 z-50 flex flex-col rounded-3xl border border-white/15 bg-[#121316]/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isMinimized 
              ? 'w-80 h-16' 
              : 'w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)]'
          }`}
        >
          {/* Top Multi-Stop Google AI Hairline */}
          <div className="h-[2.5px] w-full bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570]" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#18191c]/95 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-inner">
                <GeminiStar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wide text-white">
                    SaveSort AI Bot
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    Grounded
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Multimodal RAG Assistant
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-neutral-400">
              {messages.length > 0 && !isMinimized && (
                <>
                  <button
                    onClick={handleExportMarkdown}
                    className="p-1 rounded-lg hover:bg-neutral-800 text-blue-400 hover:text-blue-300 transition-colors"
                    title="Export conversation as Markdown (.md)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="p-1 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors"
                    title="Clear conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => router.push('/ask')}
                className="p-1 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors"
                title={isMinimized ? "Restore" : "Minimize"}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* If Minimized, hide body */}
          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs leading-relaxed">
                {messages.length === 0 ? (
                  /* Welcome State inside Bot Widget */
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-900/90 border border-white/10 flex items-center justify-center mx-auto shadow-lg">
                      <GeminiStar className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">
                        Hi! I am your AI Bookmark Bot
                      </h3>
                      <p className="text-[11px] text-neutral-400 max-w-[260px] mx-auto">
                        Ask me about your saved posts, fonts, color palettes, reel videos, or code snippets.
                      </p>
                    </div>

                    {/* Quick suggestions */}
                    <div className="grid grid-cols-1 gap-2 pt-2 text-left max-w-xs mx-auto">
                      {BOT_QUICK_PILLS.map((pill, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(pill.prompt)}
                          className="p-2.5 rounded-xl border border-white/10 bg-[#161719] hover:bg-[#1e1f23] hover:border-white/20 transition-all text-left text-[11px] text-neutral-300 hover:text-white flex items-center justify-between"
                        >
                          <span>{pill.label}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Message list */
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2.5 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-[#282a2d] text-white border border-neutral-700/60 shadow-sm text-xs leading-relaxed">
                          {message.content}
                        </div>
                      ) : (
                        <div className="w-full rounded-2xl border border-white/10 bg-[#161719] shadow-lg overflow-hidden">
                          {/* Mini AI Overview Header */}
                          <div className="flex items-center justify-between px-3 py-2 bg-[#1a1b1e] border-b border-white/10 text-[10px]">
                            <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                              <GeminiStar className="w-3.5 h-3.5" />
                              <span>AI Overview</span>
                              {message.isStreaming && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 animate-pulse">
                                  Generating...
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleCopyAnswer(message.id, message.content)}
                              disabled={message.isStreaming}
                              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                              title="Copy answer"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Markdown Text with typing cursor */}
                          <div className="p-3.5 text-neutral-200">
                            <div className="relative">
                              <MarkdownRenderer content={message.content} />
                              {message.isStreaming && (
                                <span className="inline-block w-1.5 h-3.5 ml-1 bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse rounded-[1px] align-middle shadow-sm shadow-blue-400/50" />
                              )}
                            </div>

                            {/* Color Palette & 1-Click Design Tokens (if colors detected) */}
                            {!message.isStreaming && (() => {
                              const colors = extractColorPalette(message.content);
                              if (colors.length === 0) return null;

                              return (
                                <div className="pt-2.5 mt-2.5 border-t border-white/10 bg-neutral-900/50 rounded-xl p-2.5 space-y-2 animate-fade-in">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-300">
                                      <Palette className="w-3 h-3 text-pink-400" />
                                      <span>Colors ({colors.length})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleCopyTokens(message.id, 'tailwind', generateTailwindConfig(colors))}
                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e2025] hover:bg-[#282a30] text-neutral-300 hover:text-white border border-white/10 transition-all flex items-center gap-1"
                                        title="Copy Tailwind CSS config"
                                      >
                                        {copiedPaletteState[message.id] === 'tailwind' ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Code2 className="w-2.5 h-2.5 text-cyan-400" />
                                        )}
                                        <span>Tailwind</span>
                                      </button>
                                      <button
                                        onClick={() => handleCopyTokens(message.id, 'figma', generateFigmaTokens(colors))}
                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e2025] hover:bg-[#282a30] text-neutral-300 hover:text-white border border-white/10 transition-all flex items-center gap-1"
                                        title="Copy Figma Tokens JSON"
                                      >
                                        {copiedPaletteState[message.id] === 'figma' ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                        )}
                                        <span>Figma</span>
                                      </button>
                                      <button
                                        onClick={() => handleCopyTokens(message.id, 'css', generateCssVariables(colors))}
                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e2025] hover:bg-[#282a30] text-neutral-300 hover:text-white border border-white/10 transition-all flex items-center gap-1"
                                        title="Copy CSS variables"
                                      >
                                        {copiedPaletteState[message.id] === 'css' ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <FileText className="w-2.5 h-2.5 text-yellow-400" />
                                        )}
                                        <span>CSS</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Color Swatch Dots */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {colors.map((hex, cIdx) => (
                                      <button
                                        key={cIdx}
                                        onClick={() => handleCopyHex(hex)}
                                        className="group flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 border border-white/10 hover:border-white/20 transition-all text-[10px] font-mono text-neutral-300 hover:text-white"
                                        title={`Copy ${hex}`}
                                      >
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                                          style={{ backgroundColor: hex }}
                                        />
                                        <span>{hex}</span>
                                        {copiedHex === hex && (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Grounded Sources (Shown ONLY after streaming finishes) */}
                            {!message.isStreaming && message.sources && message.sources.length > 0 && (
                              <div className="pt-3 mt-3 border-t border-white/10 animate-fade-in space-y-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                  <span>Sources ({message.sources.length})</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {message.sources.slice(0, 2).map((source, sIdx) => (
                                    <div
                                      key={sIdx}
                                      onClick={() => handleOpenSourcePost(source)}
                                      className="group rounded-lg border border-white/10 bg-[#121315] hover:bg-[#1a1b1e] p-2 transition-all cursor-pointer overflow-hidden shadow-sm"
                                    >
                                      <div className="w-full aspect-[16/10] bg-neutral-950 rounded relative overflow-hidden mb-1.5">
                                        {source.thumbnail_url ? (
                                          <img
                                            src={source.thumbnail_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            crossOrigin="anonymous"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-900">
                                            <ImageIcon className="w-4 h-4" />
                                          </div>
                                        )}
                                        {source.video_url && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <Play className="w-3.5 h-3.5 text-white fill-current" />
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-neutral-300 font-medium line-clamp-1 leading-snug">
                                        {source.ai_summary || source.caption || 'Bookmark'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Smart Follow-Up Suggestions */}
                            {!message.isStreaming && message.suggestions && message.suggestions.length > 0 && (
                              <div className="pt-2.5 mt-2.5 border-t border-white/10 animate-fade-in space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                                  <Sparkles className="w-3 h-3 text-blue-400" />
                                  <span>Suggested Next Questions</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {message.suggestions.map((suggestion, sIdx) => (
                                    <button
                                      key={sIdx}
                                      onClick={() => handleSendMessage(suggestion)}
                                      disabled={loading || isStreaming}
                                      className="text-left px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-neutral-300 hover:text-white bg-[#141517] hover:bg-[#1f2126] border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between group disabled:opacity-40"
                                    >
                                      <span className="line-clamp-1">{suggestion}</span>
                                      <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Loading / Thinking State */}
                {loading && (
                  <div className="rounded-2xl border border-white/10 bg-[#161719] overflow-hidden animate-fade-in">
                    <div className="h-1 w-full gemini-loading-bar" />
                    <div className="p-3 flex items-center gap-2.5 text-[11px] text-neutral-300">
                      <GeminiStar className="w-4 h-4 animate-pulse" />
                      <span>Google AI is searching your bookmarks...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Area */}
              <div className="p-3 bg-[#16171a] border-t border-white/10">
                {/* Quick chip pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {BOT_QUICK_PILLS.map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(pill.prompt)}
                      disabled={loading || isStreaming}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#1e1f23] hover:bg-[#282a2f] border border-white/10 text-neutral-300 hover:text-white transition-all disabled:opacity-40"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center rounded-2xl bg-[#1e1f23] border border-white/15 focus-within:border-blue-500/50 p-1"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isStreaming ? "Generating answer..." : "Ask AI about saved bookmarks..."}
                    disabled={loading}
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
                  />

                  {/* Send / Stop button */}
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopStreaming}
                      className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-all shrink-0"
                      title="Stop generating"
                    >
                      <Square className="w-3 h-3 fill-current text-white" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white disabled:opacity-30 flex items-center justify-center transition-all shadow-md shrink-0"
                      title="Send"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-white ml-0.5" />
                      )}
                    </button>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Post Viewer Modal if source clicked inside Bot */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  );
}
