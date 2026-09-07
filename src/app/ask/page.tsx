'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  RotateCcw, 
  ExternalLink, 
  Bookmark, 
  Layers, 
  Image as ImageIcon, 
  ChevronRight,
  Loader2,
  Code2,
  ArrowRight
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import PostDetailModal from '@/components/PostDetailModal';
import { SavedPost, RAGCitation } from '@/types';
import { useUser } from '@clerk/nextjs';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGCitation[];
  modelUsed?: string;
  provider?: string;
}

const STARTER_PROMPTS = [
  {
    icon: '✍️',
    title: 'Fonts & Typography',
    prompt: 'Maine fonts ke baare me kya save kiya tha?',
  },
  {
    icon: '💻',
    title: 'CSS & Animations',
    prompt: 'Give me the CSS and HTML for the card transition or navigation bar animation I saved',
  },
  {
    icon: '📱',
    title: 'Mobile Navigation',
    prompt: 'What navigation bar designs and UI ideas did I bookmark?',
  },
  {
    icon: '🚀',
    title: 'Business & Portals',
    prompt: 'Tell me about the Rangsetu B2B portal post I saved',
  },
];

export default function AskAssistantPage() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [allPosts, setAllPosts] = useState<SavedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedFromUrl = useRef(false);
  const hasLoadedFromStorage = useRef(false);

  // User-isolated storage key
  const storageKey = user?.id ? `instasaved_rag_chat_${user.id}` : 'instasaved_rag_chat_guest';

  // Load chat history from localStorage on initial render or user change
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.warn('Could not load chat history:', e);
    }
    hasLoadedFromStorage.current = true;
  }, [storageKey, isLoaded]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedFromStorage.current) return;
    try {
      if (messages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('Could not persist chat history:', e);
    }
  }, [messages, storageKey]);

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

  // Auto-scroll on new messages
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
    if (!text || loading) return;

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

      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer.');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'I could not generate an answer for this query.',
        sources: data.sources || [],
        modelUsed: data.modelUsed,
        provider: data.provider,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error:** ${err.message || 'Something went wrong while querying your bookmarks.'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
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
        saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
            <Sparkles className="w-5 h-5 text-black fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Ask My Saved Posts
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800 rounded-full">
                Multimodal RAG
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Conversational search across all your bookmarked text, images, and code
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 py-6 space-y-6 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="max-w-2xl mx-auto text-center py-10 space-y-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-white shadow-xl">
              <Bot className="w-8 h-8 text-neutral-300" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Your Permanent Second Brain
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
                Ask anything about the posts you have saved. Even if Instagram is closed or posts are archived, your knowledge base is permanently indexed.
              </p>
            </div>

            {/* Starter Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              {STARTER_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="group p-4 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900/90 hover:border-neutral-700 transition-all flex flex-col justify-between text-left"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-lg">{item.icon}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2">
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
                {/* Assistant Avatar */}
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-white flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-neutral-300" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 ${
                    message.role === 'user'
                      ? 'bg-neutral-900 text-white border border-neutral-800 rounded-tr-sm'
                      : 'bg-neutral-950 text-neutral-200 border border-neutral-800/90 rounded-tl-sm shadow-xl'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Markdown generative answer */}
                      <MarkdownRenderer content={message.content} />

                      {/* Source Citation Cards */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="pt-3 border-t border-neutral-800/80">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 mb-2.5">
                            <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Sources Used ({message.sources.length} saved posts)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {message.sources.map((source, sIdx) => (
                              <div
                                key={sIdx}
                                onClick={() => handleOpenSourcePost(source)}
                                className="group p-2.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700 transition-all cursor-pointer flex items-center gap-3"
                              >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-md bg-neutral-800 overflow-hidden shrink-0 relative border border-neutral-700/50">
                                  {source.thumbnail_url ? (
                                    <img
                                      src={source.thumbnail_url}
                                      alt="Post thumbnail"
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                      <ImageIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider px-1.5 py-0.2 rounded bg-neutral-800">
                                      {source.category || 'Bookmark'}
                                    </span>
                                    {typeof source.similarity === 'number' && (
                                      <span className="text-[10px] font-mono text-emerald-400">
                                        {Math.round(source.similarity * 100)}% match
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-300 line-clamp-1 mt-1 font-medium group-hover:text-white transition-colors">
                                    {source.ai_summary || source.caption || 'Saved post bookmark'}
                                  </p>
                                  <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-0.5">
                                    <span>Click to view slides & code</span>
                                    <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Engine Tag */}
                      {message.modelUsed && (
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                          <span>
                            Generated with {message.provider === 'groq' ? '⚡ Groq' : '✨ Gemini'} ({message.modelUsed})
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-neutral-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-neutral-300 animate-spin" />
                </div>
                <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl rounded-tl-sm p-4 text-neutral-400 text-xs flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Searching saved knowledge base & synthesizing answer...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="pt-4 border-t border-neutral-800/80 sticky bottom-0 bg-black/90 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your saved posts (e.g. 'Show font pairings', 'Give me CSS code')..."
            disabled={loading}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-colors shadow-lg"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 p-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition-all flex items-center justify-center shadow"
            title="Send Question"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-neutral-500 mt-2">
          SaveSort AI RAG retrieves answers permanently from your indexed Instagram bookmarks. Supports English & Hinglish.
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
