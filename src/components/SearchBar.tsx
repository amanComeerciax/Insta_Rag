'use client';

import React, { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  searchMode?: 'semantic' | 'keyword' | 'all';
  executionTime?: number;
}

const SAMPLE_PROMPTS = [
  'recipes and cooking',
  'minimal typography and design',
  'coding and tutorials',
  'travel architecture',
  'workout routine',
];

export default function SearchBar({
  onSearch,
  isLoading = false,
  searchMode = 'semantic',
  executionTime,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleSelectSample = (sample: string) => {
    const clean = sample.replace(/^[^\w\s]+/g, '').trim();
    setQuery(clean);
    onSearch(clean);
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none flex items-center text-neutral-400">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
            ) : (
              <Search className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved posts semantically... (e.g. 'quick pasta recipe' or 'font pairings')"
            className="w-full pl-11 pr-24 py-3 bg-neutral-950 text-white placeholder-neutral-500 rounded-xl border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white transition-all outline-none text-sm"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-1"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Mode & Suggestion indicator */}
      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 px-1 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 text-[11px]">Mode:</span>
          {searchMode === 'semantic' ? (
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[11px]">
              Semantic Vector Search
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono text-[11px]">
              Keyword Match
            </span>
          )}
          {typeof executionTime === 'number' && (
            <span className="text-neutral-500 text-[11px]">({executionTime}ms)</span>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px]">
          <span className="text-neutral-500">Suggestions:</span>
          {SAMPLE_PROMPTS.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectSample(prompt)}
              className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
