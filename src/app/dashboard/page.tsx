'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  RefreshCw, 
  Grid3X3, 
  Layers, 
  Film, 
  Image as ImageIcon,
  Play,
  BookmarkX,
  ArrowUpDown,
  Sparkles,
  ArrowRight,
  Key,
  Trash2
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import CategorySidebar from '@/components/CategorySidebar';
import PostCard from '@/components/PostCard';
import PostDetailModal from '@/components/PostDetailModal';
import StatsOverview from '@/components/StatsOverview';
import CookieSyncModal from '@/components/CookieSyncModal';
import { SavedPost, MediaType, SyncLog } from '@/types';
import { useUser } from '@clerk/nextjs';

export default function DashboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword' | 'all'>('all');
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [cookieModalOpen, setCookieModalOpen] = useState<boolean>(false);

  const { user } = useUser();
  const igSessionKey = user?.id ? `instasaved_ig_session_${user.id}` : 'instasaved_ig_session_guest';
  const [syncingLive, setSyncingLive] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

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
          const added = syncData.postsAdded || 0;
          if (added > 0) {
            setSyncToast(`Synced ${added} new post${added > 1 ? 's' : ''} from Instagram!`);
          } else {
            setSyncToast('All your saved posts are up to date!');
          }
        } else {
          setSyncToast(syncData.error || 'Sync failed. Please check your session cookie.');
        }
      } catch (err: any) {
        console.warn('Live Instagram refresh notice:', err);
      } finally {
        setSyncingLive(false);
        setTimeout(() => setSyncToast(null), 3500);
      }
    } else {
      setCookieModalOpen(true);
    }

    await fetchPosts(selectedCategory, mediaTypeFilter);
  };

  // Handle semantic search query
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchPosts(selectedCategory, mediaTypeFilter);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
        }),
      });

      const data = await res.json();
      if (data) {
        setPosts(data.posts || []);
        setSearchMode(data.mode || 'semantic');
        setExecutionTime(data.execution_time_ms);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      fetchPosts(cat, mediaTypeFilter);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id && p.instagram_post_id !== id));
      }
    } catch (err) {
      console.error('Delete post error:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to remove all saved posts? This will clear your dashboard.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/posts?all=true', { method: 'DELETE' });
      if (res.ok) {
        setPosts([]);
        setCategories({});
        setSelectedCategory('All');
      }
    } catch (err) {
      console.error('Clear all error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sorting logic (Prioritizes relevance when searching)
  const sortedPosts = [...posts].sort((a, b) => {
    if ((searchQuery.trim() || sortBy === 'relevance') && typeof a.similarity === 'number' && typeof b.similarity === 'number') {
      return b.similarity - a.similarity;
    }
    if (sortBy === 'oldest') {
      return new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime();
    }
    return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Saved Posts
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Search and organize your saved Instagram bookmarks
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {posts.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Clear all saved posts"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleSmartRefresh}
            disabled={loading || syncingLive}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors relative"
            title={syncingLive ? 'Syncing latest bookmarks from Instagram...' : 'Live Sync from Instagram'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || syncingLive ? 'animate-spin text-white' : ''}`} />
          </button>

          <button
            onClick={() => setCookieModalOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5"
            title="Direct sync using Instagram session ID"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Direct Cookie Sync</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview
        totalPosts={posts.length}
        categoryCount={Object.keys(categories).length}
        lastSync={lastSync}
      />

      {/* Multimodal RAG Copilot Banner */}
      <div className="rounded-xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900/60 to-neutral-950 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 text-black fill-black" />
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
              Generative answers, code extraction, and font recommendations from your permanently indexed bookmarks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              name="q"
              placeholder="e.g. 'Maine fonts ke baare me kya save kiya?'"
              className="bg-black/80 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow shrink-0"
            >
              <span>Ask Copilot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Semantic Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        isLoading={loading}
        searchMode={searchMode}
        executionTime={executionTime}
      />

      {/* Filter and sorting controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Media type tabs */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {[
            { id: 'all', label: 'All', icon: Grid3X3 },
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-neutral-600"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="relevance">Relevance</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Sidebar + Post Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Category Sidebar */}
        <div className="lg:col-span-3">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            totalPosts={posts.length}
          />
        </div>

        {/* Posts Area */}
        <div className="lg:col-span-9">
          {loading && posts.length === 0 ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-neutral-950 rounded-xl overflow-hidden animate-pulse border border-neutral-800"
                >
                  <div className="aspect-[4/3] bg-neutral-900" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-3.5 bg-neutral-800 rounded w-3/4" />
                    <div className="h-2.5 bg-neutral-900 rounded w-full" />
                    <div className="h-2.5 bg-neutral-900 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPosts.length > 0 ? (
            /* Real Posts Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
            <div className="bg-neutral-950 rounded-xl p-12 text-center border border-neutral-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mx-auto">
                <BookmarkX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">No Saved Posts</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? `No posts matched "${searchQuery}".`
                    : 'Your saved collection is empty. Click "Direct Cookie Sync" to sync your saved Instagram bookmarks.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setCookieModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Direct Cookie Sync</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Modal */}
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={handleDeletePost}
      />

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
