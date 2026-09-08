'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Play,
  X,
  Square,
  Download,
  FileText,
  Printer,
  Palette,
  Code2,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import PostDetailModal from '@/components/PostDetailModal';
import { SavedPost, RAGCitation } from '@/types';
import { useUser } from '@clerk/nextjs';
import {
  extractColorPalette,
  generateTailwindConfig,
  generateCssVariables,
  generateFigmaTokens,
  downloadFile,
  formatConversationAsMarkdown,
  formatSingleMessageAsMarkdown,
  triggerPrint,
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
function GeminiStar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
        fill="url(#gemini-sparkle-gradient)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.4" stopColor="#9B72CB" />
          <stop offset="0.75" stopColor="#D96570" />
          <stop offset="1" stopColor="#FBBC05" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const STARTER_PROMPTS = [
  {
    icon: '✍️',
    title: 'Fonts & Color Palettes',
    tag: 'Typography',
    prompt: 'What font pairings and color palettes did I bookmark for web design?',
  },
  {
    icon: '💻',
    title: 'CSS & Code Snippets',
    tag: 'Development',
    prompt: 'Show CSS and HTML code for my bookmarked UI transitions or cards',
  },
  {
    icon: '📱',
    title: 'Mobile UI & Navigation',
    tag: 'App Design',
    prompt: 'What navigation bar designs and UI ideas did I bookmark?',
  },
  {
    icon: '🍕',
    title: 'EATLY & Brand Breakdown',
    tag: 'Case Study',
    prompt: 'Break down the EATLY food delivery homepage design and key stats',
  },
];

const QUICK_PILLS = [
  { label: '🎨 Fonts & Colors', prompt: 'What font pairings and color palettes did I bookmark for web design?' },
  { label: '💻 Show Design Code', prompt: 'Show CSS and HTML code for my bookmarked UI transitions or cards' },
  { label: '🍕 EATLY Breakdown', prompt: 'Break down the EATLY food delivery homepage design and key stats' },
  { label: '🎬 Summarize Reels', prompt: 'Summarize the key design takeaways from my saved reels and videos' },
];

export default function AskAssistantPage() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [allPosts, setAllPosts] = useState<SavedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedPaletteState, setCopiedPaletteState] = useState<Record<string, 'tailwind' | 'figma' | 'css' | null>>({});
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [downloadedSingleId, setDownloadedSingleId] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedFromUrl = useRef(false);
  const isHydratedRef = useRef(false);
  const activeKeyRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // User-isolated storage key
  const storageKey = user?.id ? `instasaved_rag_chat_${user.id}` : 'instasaved_rag_chat_guest';

  // 1. HYDRATE CHAT: Safely load chat history when Clerk is ready or storageKey changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return;

    try {
      if (activeKeyRef.current === storageKey && isHydratedRef.current) return;
      activeKeyRef.current = storageKey;

      let saved = localStorage.getItem(storageKey);
      // Fallback: check guest chat if user chat is empty on first login
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
      console.warn('Could not load chat history:', e);
    } finally {
      isHydratedRef.current = true;
    }
  }, [storageKey, isLoaded, user?.id]);

  // 2. PERSIST CHAT: Only save AFTER hydration is complete, when messages exist, and not currently streaming
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydratedRef.current) return;
    if (messages.length === 0 || isStreaming) return;

    try {
      const cleanToSave = messages.map(({ isStreaming: _, ...rest }) => rest);
      localStorage.setItem(storageKey, JSON.stringify(cleanToSave));
      // Keep guest backup in sync
      if (user?.id) {
        localStorage.setItem('instasaved_rag_chat_guest', JSON.stringify(cleanToSave));
      }
    } catch (e) {
      console.warn('Could not persist chat history:', e);
    }
  }, [messages, storageKey, user?.id, isStreaming]);

  // Cleanup streaming timer on unmount
  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
      }
    };
  }, []);

  // Load all posts for source modal previews
  useEffect(() => {
    fetch('/api/posts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.posts)) {
          setAllPosts(data.posts);
        }
      })
      .catch((err) => console.warn('Failed to load posts for modal preview:', err));
  }, []);

  // Auto-scroll on new messages or during progressive streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle URL query parameter `?q=...`
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !initializedFromUrl.current) {
      initializedFromUrl.current = true;
      handleSendMessage(q);
    }
  }, [searchParams]);

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || input).trim();
    if (!text || loading || isStreaming) return;

    // Clear any previous streaming timer if still running
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
      // Build conversation history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Extract active post IDs discussed in recent assistant messages
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

      // Progressive tokenization: match words, newlines, and whitespace
      const tokens = fullAnswer.match(/(\r\n|\r|\n|\s+|\S+)/g) || [fullAnswer];

      // Add assistant message with initial empty content and isStreaming = true
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

      // Stream tokens word-by-word with natural generative rhythm
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

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbacks((prev) => ({
      ...prev,
      [id]: prev[id] === type ? (undefined as any) : type,
    }));
  };

  const handleOpenSourcePost = (citation: RAGCitation) => {
    // Look up full post in local list
    const found = allPosts.find(
      (p) => p.id === citation.id || p.instagram_post_id === citation.instagram_post_id
    );

    if (found) {
      setSelectedPost(found);
    } else {
      // Synthesize fallback post
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

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportFullMarkdown = () => {
    if (messages.length === 0) return;
    const md = formatConversationAsMarkdown(messages);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(`SaveSort-AI-Chat-${dateStr}.md`, md, 'text/markdown;charset=utf-8');
  };

  const handleDownloadSingleAnswer = (message: ChatMessage) => {
    const msgIndex = messages.findIndex((m) => m.id === message.id);
    const prevMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
    const query = prevMsg?.role === 'user' ? prevMsg.content : 'SaveSort AI Query';

    const md = formatSingleMessageAsMarkdown(query, message.content, message.sources);
    const filename = `SaveSort-Answer-${Date.now()}.md`;
    downloadFile(filename, md, 'text/markdown;charset=utf-8');
    setDownloadedSingleId(message.id);
    setTimeout(() => setDownloadedSingleId(null), 2000);
  };

  const handleCopyTokens = async (messageId: string, format: 'tailwind' | 'figma' | 'css', content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPaletteState((prev) => ({ ...prev, [messageId]: format }));
      setTimeout(() => {
        setCopiedPaletteState((prev) => ({ ...prev, [messageId]: null }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy design tokens:', err);
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Top Google AI Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl bg-[#1a1b1e] border border-white/10 flex items-center justify-center shadow-lg">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-sm -z-10" />
            <GeminiStar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Google AI Mode
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/30 text-blue-300 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Gemini 2.5 RAG
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Grounded multimodal search across all your saved Instagram slides, reels, fonts & code
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
            <span>Dashboard</span>
          </Link>

          {allPosts.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-neutral-400 bg-neutral-900/80 border border-neutral-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {allPosts.length} posts indexed
            </span>
          )}

          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              {/* 1-Click Conversation Export Menu */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-colors shadow-sm"
                  title="Export conversation"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export</span>
                  <ChevronDown className={`w-3 h-3 text-neutral-500 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#1a1b1e]/95 border border-white/15 shadow-2xl p-1.5 z-50 animate-fade-in backdrop-blur-xl">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportFullMarkdown();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium">Export Markdown (.md)</div>
                        <div className="text-[10px] text-neutral-400">Download formatted chat</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        triggerPrint();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <Printer className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium">Export as PDF</div>
                        <div className="text-[10px] text-neutral-400">Save via print dialog</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors shadow-sm"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 py-6 space-y-6 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty / Google AI Welcome State */
          <div className="max-w-2xl mx-auto text-center py-10 space-y-8 animate-fade-in">
            {/* Center Glowing Gemini Star */}
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-full blur-2xl -z-10" />
              <div className="w-20 h-20 rounded-3xl bg-[#18191b] border border-white/10 flex items-center justify-center shadow-2xl">
                <GeminiStar className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                What do you want to explore?
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
                Ask in English or Hinglish. Google AI synthesizes exact details from your bookmarked posts, reading visual OCR text, design fonts, and code.
              </p>
            </div>

            {/* Google AI Starter Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              {STARTER_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="group relative p-4 rounded-2xl border border-neutral-800/90 bg-[#161719]/90 hover:bg-[#1f2024] hover:border-neutral-700 transition-all flex flex-col justify-between text-left shadow-md hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between w-full mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        {item.tag}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-blue-400 transition-colors group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* User Avatar */}
                {message.role === 'user' && (
                  <div className="order-2 w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center shrink-0 mt-1 overflow-hidden shadow-sm">
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-neutral-300" />
                    )}
                  </div>
                )}

                {/* Message Container */}
                {message.role === 'user' ? (
                  /* User Bubble */
                  <div className="order-1 max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-sm px-5 py-3.5 bg-[#282a2d] text-white border border-neutral-700/60 shadow-md">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  /* Assistant: Full Google AI Overview Card */
                  <div className="w-full max-w-[98%] sm:max-w-[95%] rounded-2xl border border-white/10 bg-[#161719] shadow-2xl overflow-hidden print-message-card">
                    {/* Top Multi-Stop Google AI Hairline */}
                    <div className="h-[2.5px] w-full bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570]" />

                    {/* AI Overview Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-[#1a1b1e]/90 border-b border-neutral-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-inner">
                          <GeminiStar className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-blue-400 via-indigo-300 to-rose-300 bg-clip-text text-transparent">
                            AI Overview
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                            Grounded
                          </span>
                          {message.isStreaming && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 animate-pulse">
                              Generating...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Actions (Copy, Export & Feedback) */}
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <button
                          onClick={() => handleCopyAnswer(message.id, message.content)}
                          disabled={message.isStreaming}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-40 transition-colors"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadSingleAnswer(message)}
                          disabled={message.isStreaming}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-40 transition-colors"
                          title="Download answer as Markdown (.md)"
                        >
                          {downloadedSingleId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'up')}
                          disabled={message.isStreaming}
                          className={`p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition-colors ${
                            feedbacks[message.id] === 'up'
                              ? 'text-blue-400 bg-blue-500/10'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'down')}
                          disabled={message.isStreaming}
                          className={`p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition-colors ${
                            feedbacks[message.id] === 'down'
                              ? 'text-rose-400 bg-rose-500/10'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                          title="Bad response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* AI Overview Body */}
                    <div className="p-5 sm:p-6 space-y-4 text-neutral-200">
                      {/* Markdown Generative Answer with typing cursor */}
                      <div className="relative">
                        <MarkdownRenderer content={message.content} />
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse rounded-[1px] align-middle shadow-sm shadow-blue-400/50" />
                        )}
                      </div>

                      {/* Color Palette & 1-Click Design Tokens (if colors detected) */}
                      {!message.isStreaming && (() => {
                        const colors = extractColorPalette(message.content);
                        if (colors.length === 0) return null;

                        return (
                          <div className="pt-3.5 mt-3.5 border-t border-neutral-800/80 bg-neutral-900/40 rounded-xl p-3.5 border border-white/5 space-y-2.5 animate-fade-in">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-400">
                                  <Palette className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-neutral-200">
                                  Detected Color Palette ({colors.length})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => handleCopyTokens(message.id, 'tailwind', generateTailwindConfig(colors))}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1e2025] hover:bg-[#282a30] text-neutral-300 hover:text-white border border-white/10 hover:border-blue-500/40 transition-all shadow-sm"
                                  title="Copy as Tailwind CSS theme.extend.colors config"
                                >
                                  {copiedPaletteState[message.id] === 'tailwind' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Code2 className="w-3 h-3 text-cyan-400" />
                                  )}
                                  <span>Tailwind</span>
                                </button>
                                <button
                                  onClick={() => handleCopyTokens(message.id, 'figma', generateFigmaTokens(colors))}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1e2025] hover:bg-[#282a30] text-neutral-300 hover:text-white border border-white/10 hover:border-purple-500/40 transition-all shadow-sm"
                                  title="Copy as Figma Token Studio JSON"
                                >
                                  {copiedPaletteState[message.id] === 'figma' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                  )}
                                  <span>Figma Tokens</span>
                                </button>
                                <button
                                  onClick={() => handleCopyTokens(message.id, 'css', generateCssVariables(colors))}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1e2025] hover:bg-[#282a30] text-neutral-300 hover:text-white border border-white/10 hover:border-amber-500/40 transition-all shadow-sm"
                                  title="Copy CSS Variables (:root)"
                                >
                                  {copiedPaletteState[message.id] === 'css' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <FileText className="w-3 h-3 text-yellow-400" />
                                  )}
                                  <span>CSS Vars</span>
                                </button>
                              </div>
                            </div>

                            {/* Visual Swatch Chips with Click to Copy single HEX */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {colors.map((hex, cIdx) => (
                                <button
                                  key={cIdx}
                                  onClick={() => handleCopyHex(hex)}
                                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 hover:border-white/25 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                                  title={`Click to copy ${hex}`}
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <span className="font-mono text-[11px] text-neutral-300 group-hover:text-white">
                                    {hex}
                                  </span>
                                  {copiedHex === hex && (
                                    <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Grounded Sources (Shown ONLY AFTER text finishes streaming) */}
                      {!message.isStreaming && message.sources && message.sources.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-neutral-800/80 animate-fade-in">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                              <span className="text-xs font-semibold text-neutral-300 tracking-wide">
                                Grounded Sources ({message.sources.length} {message.sources.length === 1 ? 'bookmark' : 'bookmarks'})
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-500">
                              Click to view slides or play video
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {message.sources.map((source, sIdx) => (
                              <div
                                key={sIdx}
                                onClick={() => handleOpenSourcePost(source)}
                                className="group relative rounded-xl border border-neutral-800/90 bg-[#141517] hover:bg-[#1e1f23] hover:border-neutral-700 transition-all cursor-pointer overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-0.5"
                              >
                                {/* Media Thumbnail */}
                                <div className="w-full aspect-[16/9] bg-neutral-950 relative overflow-hidden">
                                  {source.thumbnail_url ? (
                                    <img
                                      src={source.thumbnail_url}
                                      alt="Post preview"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      crossOrigin="anonymous"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-950">
                                      <ImageIcon className="w-6 h-6" />
                                    </div>
                                  )}

                                  {/* Badges */}
                                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                                    <span className="text-[10px] font-semibold text-white uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/10 shadow">
                                      {source.category || 'Post'}
                                    </span>
                                    {typeof source.similarity === 'number' && (
                                      <span className="text-[10px] font-mono font-bold text-emerald-300 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-emerald-500/30 shadow">
                                        {Math.round(source.similarity * 100)}% match
                                      </span>
                                    )}
                                  </div>

                                  {/* Center Play Icon Overlay for Videos/Reels */}
                                  {Boolean(source.video_url) && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 group-hover:bg-black/40 transition-colors">
                                      <div className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Source Card Content */}
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                  <p className="text-xs text-neutral-300 font-medium line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                                    {source.ai_summary || source.caption || 'Saved Instagram bookmark'}
                                  </p>
                                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2.5 pt-2 border-t border-neutral-800/60">
                                    <span className="font-medium text-neutral-400 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                      <span>Open in Viewer</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Smart Follow-Up Suggestions ("Suggested Next Questions") */}
                      {!message.isStreaming && message.suggestions && message.suggestions.length > 0 && (
                        <div className="pt-3.5 mt-3.5 border-t border-neutral-800/80 animate-fade-in">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 mb-2.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            <span className="tracking-wide">Suggested Next Questions</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleSendMessage(suggestion)}
                                disabled={loading || isStreaming}
                                className="group text-left px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-[#1a1b1e] hover:bg-[#23252a] border border-white/10 hover:border-blue-500/40 hover:shadow-sm hover:shadow-blue-500/10 transition-all flex items-center gap-2 disabled:opacity-40"
                              >
                                <span>{suggestion}</span>
                                <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Overview Footer Bar */}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-[#141517] border-t border-neutral-800/70 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <GeminiStar className="w-3.5 h-3.5" />
                        <span>
                          {message.isStreaming
                            ? 'Google AI is synthesizing answer...'
                            : `Grounded with Google Gemini • ${message.modelUsed || 'gemini-flash'}`}
                        </span>
                      </div>
                      <span className="hidden sm:inline">Responses synthesized from personal library</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Google AI "Thinking" State with Rainbow Shimmer Bar */}
            {loading && (
              <div className="w-full max-w-[98%] sm:max-w-[95%] rounded-2xl border border-white/10 bg-[#161719] shadow-2xl overflow-hidden animate-fade-in">
                {/* Rainbow Shimmer Bar across top */}
                <div className="h-1 w-full gemini-loading-bar" />
                <div className="p-5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                    <GeminiStar className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 via-purple-300 to-rose-300 bg-clip-text text-transparent">
                        Google AI Mode Thinking
                      </span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Searching saved knowledge base & synthesizing multimodal answer...
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Google Gemini Pill Input Bar */}
      <div className="pt-3 sticky bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent pb-2">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none">
          {QUICK_PILLS.map((chip, cIdx) => (
            <button
              key={cIdx}
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={loading || isStreaming}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white bg-[#1a1b1e] hover:bg-[#25272c] border border-white/10 hover:border-white/20 disabled:opacity-40 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Floating Input Pill Container */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center rounded-3xl bg-[#1e1f23]/95 border border-white/15 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 backdrop-blur-xl shadow-2xl transition-all p-1.5"
        >
          {/* Left Sparkle Icon */}
          <div className="pl-3 pr-2 flex items-center justify-center text-neutral-400">
            <GeminiStar className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? "Generating answer..." : "Ask Google AI about your saved posts, fonts, reels, or code..."}
            disabled={loading}
            className="flex-1 bg-transparent py-2.5 pr-2 text-sm text-white placeholder-neutral-500 focus:outline-none"
          />

          {/* Clear button if text */}
          {input.trim().length > 0 && !loading && !isStreaming && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Circular Google AI Send / Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopStreaming}
              className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-all flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 shrink-0 border border-neutral-700"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-current text-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white disabled:opacity-30 transition-all flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 shrink-0"
              title="Send to Google AI"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>
          )}
        </form>

        <p className="text-[11px] text-center text-neutral-500 mt-2">
          Google AI Mode uses multimodal Gemini RAG to retrieve and synthesize directly from your saved bookmarks.
        </p>
      </div>

      {/* Post Detail Modal for Source Citations */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
