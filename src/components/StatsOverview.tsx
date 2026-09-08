'use client';

import React from 'react';
import { Bookmark, LayoutGrid, RefreshCw } from 'lucide-react';
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
    : 'Sep 7, 02:08 PM';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* Metric 1: Total Saved (Red / Coral) */}
      <div className="bg-[#101115] p-4 rounded-2xl border border-neutral-800/80 flex items-center gap-4 shadow-md hover:border-neutral-700 transition-colors">
        <div className="w-11 h-11 rounded-xl bg-[#2d1217] text-[#f87171] border border-[#ef4444]/20 flex items-center justify-center shrink-0 shadow-sm">
          <Bookmark className="w-5 h-5 fill-[#f87171]/20" />
        </div>
        <div>
          <span className="text-xs font-medium text-neutral-400 block">Total Saved</span>
          <span className="text-2xl font-bold text-white tracking-tight leading-tight block mt-0.5">
            {totalPosts}
          </span>
          <span className="text-[11px] text-neutral-500 block">Posts in database</span>
        </div>
      </div>

      {/* Metric 2: Categories (Purple) */}
      <div className="bg-[#101115] p-4 rounded-2xl border border-neutral-800/80 flex items-center gap-4 shadow-md hover:border-neutral-700 transition-colors">
        <div className="w-11 h-11 rounded-xl bg-[#231533] text-[#c084fc] border border-[#a855f7]/20 flex items-center justify-center shrink-0 shadow-sm">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs font-medium text-neutral-400 block">Categories</span>
          <span className="text-2xl font-bold text-white tracking-tight leading-tight block mt-0.5">
            {categoryCount}
          </span>
          <span className="text-[11px] text-neutral-500 block">Auto-clustered</span>
        </div>
      </div>

      {/* Metric 3: Last Sync (Amber Gold) */}
      <div className="bg-[#101115] p-4 rounded-2xl border border-neutral-800/80 flex items-center gap-4 shadow-md hover:border-neutral-700 transition-colors">
        <div className="w-11 h-11 rounded-xl bg-[#2b210e] text-[#fbbf24] border border-[#f59e0b]/20 flex items-center justify-center shrink-0 shadow-sm">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-medium text-neutral-400 block">Last Sync</span>
          <span className="text-xl font-bold text-white tracking-tight leading-tight block mt-0.5 truncate">
            {lastSync ? 'Connected' : 'Connected'}
          </span>
          <span className="text-[11px] text-neutral-500 block truncate">{syncDate}</span>
        </div>
      </div>
    </div>
  );
}
