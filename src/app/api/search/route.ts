import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateEmbedding } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { searchLocalPosts, getLocalPosts } from '@/lib/localStorage';
import { SavedPost } from '@/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const categoryFilter = body.category && body.category !== 'All' ? body.category : null;

    // Determine current user via Clerk
    let userId: string | null = null;
    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) userId = clerkAuth.userId;
    } catch { }
    const targetUserId = userId || 'direct_cookie_user';

    // If query is empty, return latest posts for this user
    if (!query) {
      if (isSupabaseConfigured()) {
        try {
          const adminSupabase = createAdminClient();
          let dbQuery = adminSupabase
            .from('saved_posts')
            .select('*')
            .eq('user_id', targetUserId)
            .order('saved_at', { ascending: false })
            .limit(30);

          if (categoryFilter) dbQuery = dbQuery.eq('category', categoryFilter);
          const { data } = await dbQuery;
          if (data && data.length > 0) {
            return NextResponse.json({
              posts: data,
              total: data.length,
              mode: 'all',
              execution_time_ms: Date.now() - startTime,
            });
          }
        } catch { }
      }

      let local = getLocalPosts(targetUserId);
      if (categoryFilter) {
        local = local.filter((p) => p.category === categoryFilter);
      }
      return NextResponse.json({
        posts: local,
        total: local.length,
        mode: 'all',
        execution_time_ms: Date.now() - startTime,
      });
    }

    // Generate query embedding for semantic search
    const queryEmbedding = await generateEmbedding(query);

    // 1. Try Supabase pgvector if configured
    if (isSupabaseConfigured()) {
      try {
        const adminSupabase = createAdminClient();
        const { data: rpcData, error: rpcError } = await adminSupabase.rpc('match_saved_posts', {
          query_embedding: queryEmbedding,
          match_threshold: 0.25,
          match_count: 24,
          filter_category: categoryFilter,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          return NextResponse.json({
            posts: rpcData,
            total: rpcData.length,
            mode: 'semantic',
            execution_time_ms: Date.now() - startTime,
          });
        }
      } catch (embErr) {
        console.warn('[Search] Supabase vector search notice:', embErr);
      }
    }

    // 2. Perform Local Vector Similarity Search
    const localMatches = searchLocalPosts(queryEmbedding, query, categoryFilter);

    return NextResponse.json({
      posts: localMatches,
      total: localMatches.length,
      mode: 'semantic',
      execution_time_ms: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('[Search] Error processing search query:', err);
    return NextResponse.json(
      { error: 'Failed to complete search query.' },
      { status: 500 }
    );
  }
}
