'use client';

import React, { useState } from 'react';
import { SavedPost } from '@/types';
import { ExternalLink, Film, Image as ImageIcon, Layers, Play, Instagram, Bookmark, Trash2 } from 'lucide-react';

interface PostCardProps {
  post: SavedPost;
  onSelect: (post: SavedPost) => void;
  onDelete?: (id: string) => void;
}

export default function PostCard({ post, onSelect, onDelete }: PostCardProps) {
  const [imgError, setImgError] = useState(false);

  const formattedDate = post.saved_at
    ? new Date(post.saved_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Sep 6, 2026';

  const renderMediaBadge = () => {
    switch (post.media_type) {
      case 'reel':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
            <Play className="w-2.5 h-2.5 fill-current" /> Reel
          </span>
        );
      case 'video':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
            <Film className="w-2.5 h-2.5" /> Video
          </span>
        );
      case 'carousel':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
            <Layers className="w-2.5 h-2.5" />
            {post.carousel_media_urls && post.carousel_media_urls.length > 1
              ? `${post.carousel_media_urls.length} Slides`
              : '2 Slides'}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
            <ImageIcon className="w-2.5 h-2.5" /> Photo
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(post)}
      className="bg-[#101114] border border-neutral-800/80 hover:border-neutral-700 rounded-2xl overflow-hidden flex flex-col group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 relative shadow-sm"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[16/10] w-full bg-neutral-900 overflow-hidden">
        {post.thumbnail_url && !imgError ? (
          <img
            src={post.thumbnail_url}
            alt={post.ai_summary || post.caption || 'Post thumbnail'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-neutral-950 text-center">
            <Bookmark className="w-6 h-6 text-neutral-600 mb-2" />
            <span className="text-xs font-mono text-neutral-500">
              #{post.instagram_post_id}
            </span>
          </div>
        )}

        {/* Center Play Icon Overlay for Videos/Reels */}
        {(post.media_type === 'reel' || post.media_type === 'video' || Boolean(post.video_url)) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10 shadow">
            {post.category || 'General'}
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {renderMediaBadge()}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(post.id || post.instagram_post_id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-neutral-400 hover:text-white border border-neutral-700 transition-opacity"
                title="Remove post"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Similarity Score if in semantic search */}
        {typeof post.similarity === 'number' && (
          <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
            {Math.round(post.similarity * 100)}% match
          </div>
        )}
      </div>

      {/* Content body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-neutral-100 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
            {post.ai_summary || post.caption || 'Saved Instagram bookmark'}
          </h3>
        </div>

        {/* Footer Row matching screenshot */}
        <div className="pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Instagram className="w-3.5 h-3.5 text-neutral-400" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(post);
              }}
              className="text-neutral-400 hover:text-white transition-colors"
              title="Bookmark saved"
            >
              <Bookmark className="w-3.5 h-3.5 fill-white text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
