'use client';

import React from 'react';
import { Tag, Folder, Filter, Sparkles, ChevronRight } from 'lucide-react';

interface CategorySidebarProps {
  categories: Record<string, number>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  totalPosts: number;
}

export default function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalPosts,
}: CategorySidebarProps) {
  const categoryEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  const handleOpenAiBot = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-ai-bot'));
    }
  };

  return (
    <div className="w-full">
      {/* Mobile Horizontal Bar */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={handleOpenAiBot}
          className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <Sparkles className="w-3 h-3 fill-current" />
          <span>Ask AI Bot</span>
        </button>
        <button
          onClick={() => onSelectCategory('All')}
          className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'All'
              ? 'bg-white text-black'
              : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          All ({totalPosts})
        </button>
        {categoryEntries.map(([category, count]) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              selectedCategory === category
                ? 'bg-white text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span>{category}</span>
            <span className="text-[10px] opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {/* Desktop Vertical Sidebar */}
      <div className="hidden lg:block bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 space-y-3">
        {/* Quick Ask AI Bot Side Action Card */}
        <button
          onClick={handleOpenAiBot}
          className="w-full group p-2.5 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-pink-950/20 hover:border-blue-500/60 hover:from-blue-950/60 hover:to-pink-950/40 transition-all text-left flex items-center justify-between shadow-sm hover:shadow-blue-500/10"
          title="Open AI Bot Assistant"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                  Ask AI Bot
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-neutral-400">Search bookmarks with AI</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </button>

        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <span>Categories</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">{categoryEntries.length}</span>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => onSelectCategory('All')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === 'All'
                ? 'bg-white text-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              <span>All Posts</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">
              {totalPosts}
            </span>
          </button>

          {categoryEntries.map(([category, count]) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{category}</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 flex-shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
