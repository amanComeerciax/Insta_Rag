import { NextRequest, NextResponse } from 'next/server';
import { SAMPLE_SAVED_POSTS } from '@/lib/mockData';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    let userId = 'demo-user-default';
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {
      // Demo fallback
    }

    const adminSupabase = createAdminClient();

    // Prepare sample posts with embeddings
    const enriched = await Promise.all(
      SAMPLE_SAVED_POSTS.map(async (p) => {
        const text = `${p.category}. ${p.ai_summary}. ${p.caption}`;
        const emb = await generateEmbedding(text);
        return {
          user_id: userId,
          instagram_post_id: p.instagram_post_id,
          post_url: p.post_url,
          caption: p.caption,
          media_type: p.media_type,
          thumbnail_url: p.thumbnail_url,
          ocr_text: p.ocr_text,
          ai_summary: p.ai_summary,
          category: p.category,
          embedding: emb,
          saved_at: p.saved_at,
        };
      })
    );

    const { data, error } = await adminSupabase
      .from('saved_posts')
      .upsert(enriched, { onConflict: 'user_id,instagram_post_id' })
      .select();

    if (error) {
      return NextResponse.json({
        success: false,
        message: `Database note: ${error.message}. Running in memory demo mode.`,
        posts: SAMPLE_SAVED_POSTS,
      });
    }

    // Log the sync
    await adminSupabase.from('sync_logs').insert({
      user_id: userId,
      source: 'mock_demo',
      posts_added: enriched.length,
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${enriched.length} sample Instagram posts!`,
      count: enriched.length,
      posts: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to seed sample posts' },
      { status: 500 }
    );
  }
}
