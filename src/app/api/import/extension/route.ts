import { NextRequest, NextResponse } from 'next/server';
import { processAndSavePosts } from '@/lib/processPosts';
import { extractShortcode, detectMediaType } from '@/lib/zipParser';
import { createAdminClient } from '@/lib/supabase/admin';
import { ParsedInstagramPost } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const extensionKeyHeader = req.headers.get('x-extension-key');
    const expectedKey = process.env.EXTENSION_API_SECRET || 'savesort_ext_secret';

    let userId = 'demo-user-default';
    let isAuthorized = false;

    // 1. Check direct extension secret key
    if (extensionKeyHeader && extensionKeyHeader === expectedKey) {
      isAuthorized = true;
    }

    // 2. Or verify Supabase JWT token from Authorization header (Bearer <token>)
    if (!isAuthorized && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const supabase = createAdminClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user?.id) {
        userId = user.id;
        isAuthorized = true;
      }
    }

    // If still not authorized, allow local development fallback
    if (!isAuthorized && process.env.NODE_ENV === 'development') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide a valid Supabase token or x-extension-key header.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const rawPosts = Array.isArray(body) ? body : body.posts;

    if (!rawPosts || !Array.isArray(rawPosts) || rawPosts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload. Expected an array of post objects under { posts: [...] }.' },
        { status: 400 }
      );
    }

    // Normalize incoming posts
    const normalizedPosts: ParsedInstagramPost[] = [];
    const seenIds = new Set<string>();

    for (const item of rawPosts) {
      if (!item.post_url) continue;
      const shortcode = extractShortcode(item.post_url) || `ext_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      if (!seenIds.has(shortcode)) {
        seenIds.add(shortcode);
        normalizedPosts.push({
          instagram_post_id: shortcode,
          post_url: item.post_url,
          caption: item.caption || '',
          media_type: item.media_type || detectMediaType(item.post_url, item.caption || ''),
          thumbnail_url: item.thumbnail_url || null,
          video_url: (item as any).video_url || null,
          saved_at: item.saved_at || new Date().toISOString(),
        });
      }
    }

    if (normalizedPosts.length === 0) {
      return NextResponse.json(
        { error: 'No valid Instagram post URLs detected in payload.' },
        { status: 400 }
      );
    }

    // Ingest & enrich with Gemini AI
    const result = await processAndSavePosts(userId, normalizedPosts, 'extension', {
      batchSize: 5,
      throttleMs: 300,
    });

    return NextResponse.json({
      success: true,
      message: `Extension sync finished! Added ${result.added} new saved posts, ${result.skipped} duplicates skipped.`,
      postsAdded: result.added,
      postsSkipped: result.skipped,
      total: result.total,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('[API /api/import/extension] Ingestion error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to ingest extension payload.' },
      { status: 500 }
    );
  }
}
