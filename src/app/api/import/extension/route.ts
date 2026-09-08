import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processAndSavePosts } from '@/lib/processPosts';
import { extractShortcode, detectMediaType } from '@/lib/zipParser';
import { ParsedInstagramPost } from '@/types';

export const maxDuration = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-extension-key, x-user-id',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const extensionKeyHeader = req.headers.get('x-extension-key');
    const expectedKey = process.env.EXTENSION_API_SECRET || 'savesort_ext_secret';

    let isAuthorized = false;

    // Check direct extension secret key or allow during development
    if (
      (extensionKeyHeader && extensionKeyHeader === expectedKey) ||
      process.env.NODE_ENV === 'development' ||
      !process.env.EXTENSION_API_SECRET
    ) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid extension secret key.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();

    // Determine user identity
    const queryUserId = req.nextUrl?.searchParams?.get('userId');
    let userId = body.userId || body.user_id || queryUserId || req.headers.get('x-user-id') || null;
    if (!userId) {
      try {
        const clerkAuth = auth();
        if (clerkAuth?.userId) userId = clerkAuth.userId;
      } catch {}
    }
    userId = userId || 'direct_cookie_user';

    const rawPosts = Array.isArray(body) ? body : body.posts;

    if (!rawPosts || !Array.isArray(rawPosts) || rawPosts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload. Expected an array of post objects under { posts: [...] }.' },
        { status: 400, headers: corsHeaders }
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
        { status: 400, headers: corsHeaders }
      );
    }

    // Ingest & enrich with Gemini AI and save to MongoDB Atlas
    const result = await processAndSavePosts(userId, normalizedPosts, 'extension', {
      batchSize: 8,
      throttleMs: 200,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Extension sync finished! Added ${result.added} new saved posts, ${result.skipped} duplicates skipped.`,
        postsAdded: result.added,
        postsSkipped: result.skipped,
        total: result.total,
        errors: result.errors,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[API /api/import/extension] Ingestion error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to ingest extension payload.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
