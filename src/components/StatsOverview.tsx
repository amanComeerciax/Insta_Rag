'use client';

import React from 'react';
import { Bookmark, Sparkles, FolderTree, RefreshCw } from 'lucide-react';
import { SyncLog } from '@/types';

interface StatsOverviewProps {
  totalPosts: number;
  categoryCount: number;
  lastSync?: SyncLog | null;
}

export default function StatsOverview({
  totalPosts,
  categoryCount,
  lastSync,
}: StatsOverviewProps) {
  const syncDate = lastSync?.created_at
    ? new Date(lastSync.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No sync yet';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Metric 1: Total Posts */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Total Saved</span>
          <Bookmark className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="mt-2.5">
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {totalPosts}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-0.5">Posts in database</span>
        </div>
      </div>

      {/* Metric 2: Categories */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Categories</span>
          <FolderTree className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="mt-2.5">
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {categoryCount}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-0.5">Auto-clustered</span>
        </div>
      </div>

      {/* Metric 3: Vector Dimension */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Vectors</span>
          <Sparkles className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="mt-2.5">
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            768-D
          </span>
          <span className="text-[11px] text-neutral-500 block mt-0.5">pgvector embedding</span>
        </div>
      </div>

      {/* Metric 4: Sync Status */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Last Sync</span>
          <RefreshCw className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="mt-2.5">
          <span className="text-sm font-semibold text-neutral-200 block truncate">
            {lastSync ? 'Connected' : 'Inactive'}
          </span>
          <span className="text-[11px] text-neutral-500 block mt-0.5 truncate">{syncDate}</span>
        </div>
      </div>
    </div>
  );
}
