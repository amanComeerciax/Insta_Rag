import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getLocalPosts, getLocalSyncLog, deleteLocalPost, clearAllLocalPosts } from '@/lib/localStorage';
import { SavedPost } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const mediaType = searchParams.get('media_type');

    let posts: SavedPost[] = [];
    let lastSync = null;

    // Determine current user via Clerk
    let userId: string | null = null;
    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) userId = clerkAuth.userId;
    } catch {}

    const targetUserId = userId || 'direct_cookie_user';

    // 1. Check Supabase first if configured
    if (isSupabaseConfigured()) {
      try {
        const adminSupabase = createAdminClient();
        let query = adminSupabase
          .from('saved_posts')
          .select('*')
          .order('saved_at', { ascending: false })
          .eq('user_id', targetUserId);

        if (category && category !== 'All') query = query.eq('category', category);
        if (mediaType && mediaType !== 'all') query = query.eq('media_type', mediaType);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          posts = data;
        }

        const { data: logs } = await adminSupabase
          .from('sync_logs')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (logs && logs[0]) lastSync = logs[0];
      } catch (err) {
        console.warn('[API /api/posts] Supabase query notice:', err);
      }
    }

    // 2. If no Supabase posts or not configured, load from local storage
    if (posts.length === 0) {
      let local = getLocalPosts(targetUserId);
      if (category && category !== 'All') {
        local = local.filter((p) => p.category === category);
      }
      if (mediaType && mediaType !== 'all') {
        local = local.filter((p) => p.media_type === mediaType);
      }
      posts = local;
      lastSync = lastSync || getLocalSyncLog(targetUserId);
    }

    // Calculate category counts from user's posts only
    const categoryCounts: Record<string, number> = {};
    const userStored = getLocalPosts(targetUserId);
    for (const post of userStored) {
      const cat = post.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    return NextResponse.json({
      posts,
      total: posts.length,
      categoryCounts,
      lastSync,
    });
  } catch (error: any) {
    console.error('[API /api/posts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved posts.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get('all') === 'true';
    const postId = searchParams.get('id');

    let userId: string | null = null;
    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) userId = clerkAuth.userId;
    } catch {}
    const targetUserId = userId || 'direct_cookie_user';

    if (clearAll) {
      clearAllLocalPosts(targetUserId);
      if (isSupabaseConfigured()) {
        try {
          const adminSupabase = createAdminClient();
          await adminSupabase.from('saved_posts').delete().eq('user_id', targetUserId);
        } catch {}
      }
      return NextResponse.json({ success: true, message: 'All posts cleared successfully.' });
    }

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    deleteLocalPost(postId, targetUserId);

    if (isSupabaseConfigured()) {
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase.from('saved_posts').delete().eq('id', postId).eq('user_id', targetUserId);
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 });
  }
}
