'use client';

import React from 'react';
import { Tag, Folder, Filter } from 'lucide-react';

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

  return (
    <div className="w-full">
      {/* Mobile Horizontal Bar */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
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
      <div className="hidden lg:block bg-neutral-950 rounded-xl p-4 border border-neutral-850 border-neutral-800/80 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
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
