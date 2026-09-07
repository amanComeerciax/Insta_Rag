'use client';

import React, { useState } from 'react';
import { SavedPost } from '@/types';
import { ExternalLink, Film, Image as ImageIcon, Layers, Play, Calendar, Trash2 } from 'lucide-react';

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
    : 'Recent';

  const renderMediaBadge = () => {
    switch (post.media_type) {
      case 'reel':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 text-[10px] font-medium text-neutral-300 border border-neutral-700">
            <Play className="w-2.5 h-2.5 fill-current" /> Reel
          </span>
        );
      case 'video':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 text-[10px] font-medium text-neutral-300 border border-neutral-700">
            <Film className="w-2.5 h-2.5" /> Video
          </span>
        );
      case 'carousel':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 text-[10px] font-medium text-neutral-300 border border-neutral-700">
            <Layers className="w-2.5 h-2.5" />
            {post.carousel_media_urls && post.carousel_media_urls.length > 1
              ? `${post.carousel_media_urls.length} Slides`
              : 'Carousel'}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 text-[10px] font-medium text-neutral-300 border border-neutral-700">
            <ImageIcon className="w-2.5 h-2.5" /> Photo
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(post)}
      className="bg-neutral-950 border border-neutral-800 hover:border-neutral-600 rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-all relative"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[4/3] w-full bg-neutral-900 overflow-hidden">
        {post.thumbnail_url && !imgError ? (
          <img
            src={post.thumbnail_url}
            alt={post.ai_summary || post.caption || 'Post thumbnail'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-neutral-900 text-center">
            <BookmarkIcon className="w-6 h-6 text-neutral-600 mb-2" />
            <span className="text-xs font-mono text-neutral-500">
              #{post.instagram_post_id}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded bg-black/80 text-[11px] font-medium text-neutral-200 border border-neutral-700 backdrop-blur-sm">
            {post.category}
          </span>
          <div className="flex items-center gap-1.5">
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

        {/* Similarity Score */}
        {typeof post.similarity === 'number' && (
          <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-neutral-300 border border-neutral-700">
            {Math.round(post.similarity * 100)}% match
          </div>
        )}
      </div>

      {/* Content body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* AI Summary */}
          <div className="flex items-start gap-1.5 mb-1.5">
            <h3 className="text-xs sm:text-sm font-semibold text-neutral-100 line-clamp-2 leading-snug group-hover:text-white transition-colors">
              {post.ai_summary || post.caption || 'Saved post'}
            </h3>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {post.caption}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Calendar className="w-3 h-3 text-neutral-500" />
            <span>{formattedDate}</span>
          </div>

          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors text-[11px]"
          >
            <span>Instagram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}
