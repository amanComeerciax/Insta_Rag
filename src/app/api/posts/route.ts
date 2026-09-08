import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPostsCollection, getSyncLogsCollection, isMongoConfigured } from '@/lib/mongodb';
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
    let lastSync: any = null;

    // Determine current user via Clerk
    let userId: string | null = null;
    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) userId = clerkAuth.userId;
    } catch {}

    const targetUserId = userId || 'direct_cookie_user';

    // 1. Check MongoDB Atlas (Primary Cloud Database)
    if (isMongoConfigured()) {
      try {
        const postsCol = await getPostsCollection();
        const filter: any = { user_id: targetUserId };
        if (category && category !== 'All') filter.category = category;
        if (mediaType && mediaType !== 'all') filter.media_type = mediaType;

        const mongoPosts = await postsCol
          .find(filter)
          .sort({ saved_at: -1 })
          .toArray();

        if (mongoPosts && mongoPosts.length > 0) {
          posts = mongoPosts as SavedPost[];
        }

        const logsCol = await getSyncLogsCollection();
        const logs = await logsCol
          .find({ user_id: targetUserId })
          .sort({ created_at: -1 })
          .limit(1)
          .toArray();
        if (logs && logs[0]) lastSync = logs[0];
      } catch (mongoErr) {
        console.warn('[API /api/posts] MongoDB query notice:', mongoErr);
      }
    }

    // 2. Fallback to Supabase if configured and no posts from MongoDB
    if (posts.length === 0 && isSupabaseConfigured()) {
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

    // 3. Fallback to local storage (for local development)
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

    // Calculate category counts from user's posts
    const categoryCounts: Record<string, number> = {};
    if (isMongoConfigured()) {
      try {
        const postsCol = await getPostsCollection();
        const userAllPosts = await postsCol
          .find({ user_id: targetUserId }, { projection: { category: 1 } })
          .toArray();
        for (const post of userAllPosts) {
          const cat = post.category || 'General';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      } catch {}
    }

    if (Object.keys(categoryCounts).length === 0) {
      const countSource = posts.length > 0 ? posts : getLocalPosts(targetUserId);
      for (const post of countSource) {
        const cat = post.category || 'General';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
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
      if (isMongoConfigured()) {
        try {
          const postsCol = await getPostsCollection();
          await postsCol.deleteMany({ user_id: targetUserId });
        } catch {}
      }
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

    if (isMongoConfigured()) {
      try {
        const postsCol = await getPostsCollection();
        await postsCol.deleteOne({ 
          $or: [{ id: postId }, { instagram_post_id: postId }], 
          user_id: targetUserId 
        });
      } catch {}
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
