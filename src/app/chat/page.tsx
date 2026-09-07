'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Key, 
  Send, 
  Loader2, 
  Sparkles, 
  User, 
  RefreshCw, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface Thread {
  threadId: string;
  title: string;
  avatar: string | null;
  lastMessage: string;
  lastActivityAt: string | null;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  isMe: boolean;
  text: string;
  timestamp: string;
  type: string;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState('');
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiSummary, setAiSummary] = useState('');

  // Fetch Inbox Threads
  const fetchInbox = async (customSession?: string) => {
    const key = (customSession || sessionId).trim();
    if (!key) {
      setErrorMsg('Please enter your Instagram sessionid cookie.');
      return;
    }

    setLoadingInbox(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: key }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch inbox.');
      }

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('instasaved_ig_session_id', key);
        }
      } catch {}

      setThreads(data.threads || []);
      if (data.threads && data.threads.length > 0 && !activeThread) {
        loadThread(data.threads[0], key);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load inbox.');
    } finally {
      setLoadingInbox(false);
    }
  };

  // Restore saved session ID on initial load
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('instasaved_ig_session_id');
        if (saved) {
          setSessionId(saved);
          fetchInbox(saved);
        }
      }
    } catch {}
  }, []);

  // Fetch specific thread messages
  const loadThread = async (thread: Thread, customSession?: string) => {
    const key = (customSession || sessionId).trim();
    setActiveThread(thread);
    setLoadingMessages(true);
    setAiSummary('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: key,
          threadId: thread.threadId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load messages.');
      }

      setMessages(data.messages || []);
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white" />
            Instagram Direct Messages
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Directly browse and summarize your Instagram chats using your session key
          </p>
        </div>

        {/* Session Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto max-w-md">
          <div className="relative flex-1">
            <Key className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Paste Instagram sessionid here..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
            />
          </div>
          <button
            onClick={() => fetchInbox()}
            disabled={loadingInbox}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            {loadingInbox ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Connect</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-start gap-2 text-xs text-neutral-300">
          <AlertCircle className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Main Messenger Layout */}
      {threads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-[620px] bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Left Panel: Conversation Threads */}
          <div className="md:col-span-5 lg:col-span-4 border-r border-neutral-800 flex flex-col h-full bg-neutral-950">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Conversations ({threads.length})</span>
              <button
                onClick={() => fetchInbox()}
                className="p-1 rounded hover:bg-neutral-900 hover:text-white transition-colors"
                title="Refresh Inbox"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInbox ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
              {threads.map((t) => {
                const isActive = activeThread?.threadId === t.threadId;
                return (
                  <div
                    key={t.threadId}
                    onClick={() => loadThread(t)}
                    className={`p-3 cursor-pointer transition-colors flex items-center gap-3 ${
                      isActive ? 'bg-neutral-900 border-l-2 border-white' : 'hover:bg-neutral-900/50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {t.avatar ? (
                        <img src={t.avatar} alt={t.title} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-white truncate">{t.title}</h4>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{t.lastMessage}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Messages & AI Summary */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-neutral-950">
            {activeThread ? (
              <>
                {/* Thread Top Bar */}
                <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
                      {activeThread.avatar ? (
                        <img src={activeThread.avatar} alt={activeThread.title} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white">{activeThread.title}</h3>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {activeThread.threadId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => loadThread(activeThread)}
                    disabled={loadingMessages}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>AI Recap</span>
                  </button>
                </div>

                {/* AI Summary Banner (if active) */}
                {aiSummary && (
                  <div className="p-3 bg-neutral-900/80 border-b border-neutral-800 flex items-start gap-2 text-xs text-neutral-300">
                    <Sparkles className="w-3.5 h-3.5 text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white block text-[11px]">Gemini AI Conversation Summary:</span>
                      <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">{aiSummary}</p>
                    </div>
                  </div>
                )}

                {/* Messages Bubbles */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-neutral-500 gap-2 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-neutral-500 mb-1 px-1">{m.senderName}</span>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            m.isMe
                              ? 'bg-white text-black font-medium rounded-br-none'
                              : 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-none'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                      No messages loaded in this chat.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                Select a conversation from the left to view messages.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Connect State */
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mx-auto">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Connect Instagram Chats</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Paste your Instagram <code className="text-white bg-neutral-900 px-1 py-0.5 rounded">sessionid</code> in the box above to load your active inbox and summarize conversations with AI.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
