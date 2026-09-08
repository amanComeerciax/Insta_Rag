'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  RefreshCw, 
  Grid3X3, 
  List,
  Layers, 
  Film, 
  Image as ImageIcon,
  Play, 
  Bookmark,
  BookmarkX, 
  Sparkles, 
  ArrowRight, 
  Key, 
  Trash2,
  Home,
  MessageSquare,
  Tag,
  Folder,
  Sun,
  MoreHorizontal,
  ExternalLink,
  Menu,
  X,
  UploadCloud,
  Copy,
  Check
} from 'lucide-react';
import PostCard from '@/components/PostCard';
import PostDetailModal from '@/components/PostDetailModal';
import StatsOverview from '@/components/StatsOverview';
import CookieSyncModal from '@/components/CookieSyncModal';
import { SavedPost, MediaType, SyncLog } from '@/types';
import { useUser, UserButton } from '@clerk/nextjs';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'relevance'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword' | 'all'>('all');
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [cookieModalOpen, setCookieModalOpen] = useState<boolean>(false);
  const [kebabOpen, setKebabOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const kebabRef = useRef<HTMLDivElement>(null);

  const igSessionKey = user?.id ? `instasaved_ig_session_${user.id}` : 'instasaved_ig_session_guest';
  const [syncingLive, setSyncingLive] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState<boolean>(false);
  const [copiedUserId, setCopiedUserId] = useState<boolean>(false);

  // 1-Click Load Sample Demo Posts
  const handleLoadSamplePosts = async () => {
    setSeedingDemo(true);
    setSyncToast('Seeding 27 sample posts into MongoDB Atlas...');
    try {
      const res = await fetch('/api/mock', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncToast(`Loaded ${data.count || 27} demo posts into your library!`);
        await fetchPosts();
      } else {
        setSyncToast(data.error || 'Failed to load sample posts.');
      }
    } catch {
      setSyncToast('Network error while loading demo posts.');
    } finally {
      setSeedingDemo(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Close kebab menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setKebabOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real posts from API
  const fetchPosts = useCallback(async (cat: string = selectedCategory, media: string = mediaTypeFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat !== 'All') params.set('category', cat);
      if (media !== 'all') params.set('media_type', media);

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();

      if (data) {
        setPosts(data.posts || []);
        setCategories(data.categoryCounts || {});
        setLastSync(data.lastSync || null);
        setSearchMode('all');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, mediaTypeFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Smart Refresh: Live syncs new posts from Instagram if session is saved, then refreshes posts list
  const handleSmartRefresh = async () => {
    let savedSession = '';
    try {
      if (typeof window !== 'undefined') {
        savedSession = localStorage.getItem(igSessionKey) || '';
      }
    } catch {}

    if (savedSession) {
      setSyncingLive(true);
      setSyncToast('Checking Instagram for newly saved posts...');
      try {
        const syncRes = await fetch('/api/import/cookie-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: savedSession.trim(),
            maxPosts: 25,
          }),
        });
        const syncData = await syncRes.json();
        if (syncRes.ok) {
          setSyncToast(
            `Sync complete! Added ${syncData.newCount || 0} new, updated ${syncData.updatedCount || 0}.`
          );
        } else {
          setSyncToast(syncData.error || 'Sync failed. Check session.');
        }
      } catch {
        setSyncToast('Failed to connect to Instagram.');
      } finally {
        setSyncingLive(false);
        fetchPosts();
        setTimeout(() => setSyncToast(null), 4000);
      }
    } else {
      setCookieModalOpen(true);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchPosts(selectedCategory, mediaTypeFilter);
      return;
    }

    setLoading(true);
    const startTime = performance.now();
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data && Array.isArray(data.posts)) {
        setPosts(data.posts);
        setSearchMode(data.mode || 'all');
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
      setExecutionTime(Math.round(performance.now() - startTime));
    }
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    fetchPosts(cat, mediaTypeFilter);
    setMobileSidebarOpen(false);
  };

  const handleDeletePost = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId && p.instagram_post_id !== deletedId));
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL saved posts from your database? This cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/posts', { method: 'DELETE' });
      if (res.ok) {
        setPosts([]);
        setCategories({});
      }
    } catch (e) {
      console.error('Failed to clear posts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAiBot = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-ai-bot'));
    }
  };

  // Sort posts
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'relevance' && typeof a.similarity === 'number' && typeof b.similarity === 'number') {
      return b.similarity - a.similarity;
    }
    if (sortBy === 'oldest') {
      return new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime();
    }
    return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
  });

  // Categories to show in sidebar
  const defaultCategoryList = [
    { name: 'Design & Typography', count: categories['Design & Typography'] || 0 },
    { name: 'Recipes & Cooking', count: categories['Recipes & Cooking'] || 0 },
    { name: 'Coding & Tech', count: categories['Coding & Tech'] || 0 },
    { name: 'General', count: categories['General'] || 0 },
  ];

  const activeCategoryEntries = Object.keys(categories).length > 0
    ? Object.entries(categories).map(([name, count]) => ({ name, count }))
    : defaultCategoryList;

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (Matching reference image) */}
      {/* ========================================================================= */}
      <aside className="w-64 xl:w-72 bg-[#0a0b0e] border-r border-neutral-800/80 p-5 flex flex-col justify-between shrink-0 hidden lg:flex min-h-screen sticky top-0">
        <div className="space-y-6">
          {/* Logo Header */}
          <Link href="/" className="flex items-center gap-2.5 group pt-1">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold shadow-md">
              <Bookmark className="w-4 h-4 fill-black text-black" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              Insta<span className="text-neutral-400 font-normal">_Rag</span>
            </span>
          </Link>

          {/* Primary Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#181a20] border border-white/10 shadow-sm transition-colors"
            >
              <Bookmark className="w-4 h-4 fill-white" />
              <span>Saved Posts</span>
            </Link>

            <Link
              href="/ask"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-neutral-400" />
              <span>Ask AI</span>
            </Link>

            <Link
              href="/chat"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-neutral-400" />
              <span>Direct Messages</span>
            </Link>
          </nav>

          {/* Categories Section */}
          <div className="pt-4 border-t border-neutral-800/60">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-3 pb-2.5">
              Categories
            </div>

            <div className="space-y-1">
              {/* All Posts Item */}
              <button
                onClick={() => handleCategorySelect('All')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === 'All'
                    ? 'bg-neutral-800/90 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-3.5 h-3.5 text-neutral-400" />
                  <span>All Posts</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  {posts.length}
                </span>
              </button>

              {/* Dynamic Category Items */}
              {activeCategoryEntries.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    selectedCategory === cat.name
                      ? 'bg-neutral-800/90 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 ml-2">
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Floating Card: Ask AI Bot */}
        <div className="pt-4">
          <div
            onClick={handleOpenAiBot}
            className="group relative p-3.5 rounded-2xl bg-gradient-to-br from-[#1c152c] via-[#141520] to-[#0f1017] border border-purple-500/25 hover:border-purple-500/50 transition-all cursor-pointer shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white shadow shrink-0">
                  <Sparkles className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    Ask AI Bot
                  </h4>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    Search your bookmarks with natural language.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar with Segmented Pills */}
        <header className="sticky top-0 z-40 h-16 border-b border-neutral-800/80 bg-[#07080a]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          {/* Left: Mobile Menu Toggle & Brand on small screens */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-white">Insta_Rag</span>
          </div>

          {/* Center: Segmented Navigation Pills */}
          <div className="hidden sm:flex items-center mx-auto bg-neutral-900/90 border border-neutral-800/90 rounded-full p-1 shadow-inner">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#1a1c24] text-white border border-white/10 shadow-sm transition-all"
            >
              <Bookmark className="w-3 h-3 fill-current" />
              <span>Saved Posts</span>
            </Link>

            <Link
              href="/ask"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-neutral-400" />
              <span>Ask AI</span>
            </Link>

            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <MessageSquare className="w-3 h-3 text-neutral-400" />
              <span>Direct Messages</span>
            </Link>
          </div>

          {/* Right: Theme Toggle + Dashboard link + Clerk Avatar */}
          <div className="flex items-center gap-3">
            <button
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
              title="Toggle theme"
            >
              <Sun className="w-4 h-4" />
            </button>

            <Link
              href="/dashboard"
              className="hidden md:inline-block text-xs font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>

            <div className="relative">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-7 h-7 rounded-lg border border-neutral-700 shadow-sm',
                  },
                }}
              />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Header Row: Title & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Saved Posts
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Your saved Instagram bookmarks, organized for inspiration.
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSmartRefresh}
                disabled={loading || syncingLive}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-white hover:bg-neutral-200 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || syncingLive ? 'animate-spin' : ''}`} />
                <span>Sync with Instagram</span>
              </button>

              {/* Kebab More Menu */}
              <div className="relative" ref={kebabRef}>
                <button
                  onClick={() => setKebabOpen(!kebabOpen)}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {kebabOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#141518] border border-neutral-800 shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-fade-in">
                    <button
                      onClick={() => {
                        setKebabOpen(false);
                        handleLoadSamplePosts();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Load 27 Demo Posts</span>
                    </button>
                    <button
                      onClick={() => {
                        setKebabOpen(false);
                        setCookieModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <Key className="w-3.5 h-3.5 text-blue-400" />
                      <span>Direct Cookie Sync</span>
                    </button>
                    {posts.length > 0 && (
                      <button
                        onClick={() => {
                          setKebabOpen(false);
                          handleClearAll();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All Posts</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4 Colored Stat Metric Cards */}
          <StatsOverview
            totalPosts={posts.length}
            categoryCount={Object.keys(categories).length || 4}
            lastSync={lastSync}
          />

          {/* Ask My Saved Posts Copilot Banner Card */}
          <div className="rounded-2xl border border-neutral-800/90 bg-[#101114] p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow shrink-0">
                <Sparkles className="w-5 h-5 fill-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Ask My Saved Posts Copilot
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700/60 rounded-full">
                    Multimodal RAG
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Generate answers, code extraction, and font recommendations from your saved bookmarks.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const q = (new FormData(form).get('q') as string || '').trim();
                  if (q) {
                    router.push(`/ask?q=${encodeURIComponent(q)}`);
                  } else {
                    router.push('/ask');
                  }
                }}
                className="flex items-center gap-2 w-full lg:w-auto"
              >
                <input
                  type="text"
                  name="q"
                  placeholder="e.g. 'What font pairings did I bookmark for web?'"
                  className="bg-[#18191d] border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 w-full sm:w-80"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-white hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow shrink-0 active:scale-95"
                >
                  <span>Ask Copilot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Search & Filter Controls: Row 1 Search, View Toggles & Sort */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Full Width Search Bar */}
              <div className="relative flex-1 flex items-center rounded-xl bg-[#101115] border border-neutral-800/80 px-3.5 py-2.5 focus-within:border-neutral-600 transition-colors shadow-sm">
                <Search className="w-4 h-4 text-neutral-500 mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search saved posts... (e.g. 'website design', 'font pairings', 'recipe')"
                  className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="text-neutral-500 hover:text-neutral-300 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Toggle & Sort Controls */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <div className="flex items-center gap-1 bg-[#101115] border border-neutral-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-neutral-500 hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white/15 text-white' : 'text-neutral-500 hover:text-white'
                    }`}
                    title="List view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#101115] border border-neutral-800/80 px-3 py-1.5 rounded-xl text-xs text-neutral-400 shadow-sm">
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-[#141518] text-white">Newest</option>
                    <option value="oldest" className="bg-[#141518] text-white">Oldest</option>
                    <option value="relevance" className="bg-[#141518] text-white">Relevance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Controls: Row 2 Media Type Pills & Category Chips */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              {/* Media Type Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'photo', label: 'Photos', icon: ImageIcon },
                  { id: 'reel', label: 'Reels', icon: Play },
                  { id: 'carousel', label: 'Carousels', icon: Layers },
                  { id: 'video', label: 'Videos', icon: Film },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = mediaTypeFilter === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setMediaTypeFilter(type.id as any);
                        fetchPosts(selectedCategory, type.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                        isSelected
                          ? 'bg-white text-black shadow'
                          : 'bg-[#101115] text-neutral-400 hover:text-white border border-neutral-800/80'
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Categories Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs text-neutral-500 font-medium shrink-0 mr-1">
                  Categories:
                </span>
                {['Design & Typography', 'Recipes & Cooking', 'Coding & Tech', 'General'].map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(isSelected ? 'All' : cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                        isSelected
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-[#101115] text-neutral-400 hover:text-white border border-neutral-800/80'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. 4-COLUMN POSTS GRID */}
          {/* ========================================================================= */}
          {loading && posts.length === 0 ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-[#101114] rounded-2xl overflow-hidden animate-pulse border border-neutral-800/80"
                >
                  <div className="aspect-[16/10] bg-neutral-900" />
                  <div className="p-3.5 space-y-2.5">
                    <div className="h-3.5 bg-neutral-800 rounded w-3/4" />
                    <div className="h-2.5 bg-neutral-900 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPosts.length > 0 ? (
            /* Real Posts Grid matching screenshot 4-column layout */
            <div className={`grid gap-4 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {sortedPosts.map((post) => (
                <PostCard
                  key={post.id || post.instagram_post_id}
                  post={post}
                  onSelect={(p) => setSelectedPost(p)}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#101114] rounded-2xl p-8 sm:p-12 text-center border border-neutral-800/80 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mx-auto shadow-inner">
                <BookmarkX className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white">No Saved Posts Found</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {searchQuery
                    ? `No posts matched "${searchQuery}".`
                    : 'Your collection is currently empty. Populate it instantly with 27 curated demo posts, upload your Instagram export ZIP, or sync using the companion Chrome extension.'}
                </p>
              </div>

              {/* Action Buttons Grid */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 max-w-xl mx-auto">
                <button
                  onClick={handleLoadSamplePosts}
                  disabled={seedingDemo || loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-white hover:bg-neutral-200 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${seedingDemo ? 'animate-spin' : 'fill-black'}`} />
                  <span>{seedingDemo ? 'Loading Posts...' : '⚡ Load 27 Demo Posts'}</span>
                </button>

                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Upload Instagram ZIP</span>
                </Link>

                <button
                  onClick={() => setCookieModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>Direct Cookie Sync</span>
                </button>
              </div>

              {/* User ID helper for extension sync */}
              {user?.id && (
                <div className="pt-2 text-[11px] text-neutral-500 flex items-center justify-center gap-2">
                  <span>Your User ID:</span>
                  <code className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[10px]">
                    {user.id}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      setCopiedUserId(true);
                      setSyncToast('User ID copied to clipboard!');
                      setTimeout(() => {
                        setCopiedUserId(false);
                        setSyncToast(null);
                      }, 2500);
                    }}
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-white underline text-[10px]"
                  >
                    {copiedUserId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUserId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dashboard Matching Footer */}
          <footer className="pt-8 pb-4 mt-8 border-t border-neutral-800/60 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white text-black flex items-center justify-center font-bold">
                <Bookmark className="w-3 h-3 text-black fill-black" />
              </div>
              <span className="font-semibold text-neutral-300">Insta_Rag</span>
              <span className="text-neutral-600">•</span>
              <span>Personal AI Knowledge Base</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Gemini 2.5 RAG
              </span>
              <span>•</span>
              <span>pgvector</span>
              <span>•</span>
              <span>© {new Date().getFullYear()} Insta_Rag</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Slide-out Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#0a0b0e] p-5 flex flex-col justify-between h-full z-10 border-r border-neutral-800">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold">
                    <Bookmark className="w-3.5 h-3.5 fill-black" />
                  </div>
                  <span className="font-bold text-sm text-white">Insta_Rag</span>
                </Link>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181a20] text-white"
                >
                  <Bookmark className="w-4 h-4 fill-white" />
                  <span>Saved Posts</span>
                </Link>
                <Link
                  href="/ask"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-neutral-400"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ask AI</span>
                </Link>
                <Link
                  href="/chat"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-neutral-400"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Direct Messages</span>
                </Link>
              </nav>

              <div className="pt-2 border-t border-neutral-800">
                <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Categories
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleCategorySelect('All')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300"
                  >
                    <span>All Posts</span>
                    <span className="font-mono text-neutral-500">{posts.length}</span>
                  </button>
                  {activeCategoryEntries.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => handleCategorySelect(cat.name)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300"
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="font-mono text-neutral-500">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                setMobileSidebarOpen(false);
                handleOpenAiBot();
              }}
              className="p-3 rounded-xl bg-gradient-to-br from-[#1c152c] to-[#101118] border border-purple-500/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Ask AI Bot</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </div>
      )}

      {/* Post Modal Preview */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={handleDeletePost}
        />
      )}

      {/* Direct Cookie Sync Modal */}
      <CookieSyncModal
        isOpen={cookieModalOpen}
        onClose={() => setCookieModalOpen(false)}
        onSuccess={() => fetchPosts()}
      />

      {/* Live sync toast notification */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          {syncingLive ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-medium">{syncToast}</span>
        </div>
      )}
    </div>
  );
}
