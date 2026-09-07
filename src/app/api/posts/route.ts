import { NextRequest, NextResponse } from 'next/server';
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

    // 1. Check Supabase first if configured
    if (isSupabaseConfigured()) {
      try {
        let userId: string | null = null;
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) userId = user.id;
        } catch {}

        const adminSupabase = createAdminClient();
        let query = adminSupabase
          .from('saved_posts')
          .select('*')
          .order('saved_at', { ascending: false });

        if (userId) query = query.eq('user_id', userId);
        if (category && category !== 'All') query = query.eq('category', category);
        if (mediaType && mediaType !== 'all') query = query.eq('media_type', mediaType);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          posts = data;
        }

        const { data: logs } = await adminSupabase
          .from('sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (logs && logs[0]) lastSync = logs[0];
      } catch (err) {
        console.warn('[API /api/posts] Supabase query notice:', err);
      }
    }

    // 2. If no Supabase posts or not configured, load from local storage
    if (posts.length === 0) {
      let local = getLocalPosts();
      if (category && category !== 'All') {
        local = local.filter((p) => p.category === category);
      }
      if (mediaType && mediaType !== 'all') {
        local = local.filter((p) => p.media_type === mediaType);
      }
      posts = local;
      lastSync = lastSync || getLocalSyncLog();
    }

    // Calculate category counts from active posts
    const categoryCounts: Record<string, number> = {};
    const allStored = getLocalPosts();
    for (const post of allStored) {
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

    if (clearAll) {
      clearAllLocalPosts();
      if (isSupabaseConfigured()) {
        try {
          const adminSupabase = createAdminClient();
          await adminSupabase.from('saved_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch {}
      }
      return NextResponse.json({ success: true, message: 'All posts cleared successfully.' });
    }

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    deleteLocalPost(postId);

    if (isSupabaseConfigured()) {
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase.from('saved_posts').delete().eq('id', postId);
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 });
  }
}
