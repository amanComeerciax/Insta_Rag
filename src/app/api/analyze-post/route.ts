import { NextRequest, NextResponse } from 'next/server';
import { isGroqConfigured, analyzePostWithGroq } from '@/lib/groq';
import { analyzePostWithGemini, generateEmbedding } from '@/lib/gemini';
import { getLocalPosts, saveLocalPosts } from '@/lib/localStorage';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { SavedPost } from '@/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, caption, postUrl } = body;

    if (!postId && !caption) {
      return NextResponse.json({ error: 'Post details required' }, { status: 400 });
    }

    let aiResult: any = null;
    let providerUsed = 'groq';

    // 1. PRIMARY: Groq AI
    if (isGroqConfigured()) {
      try {
        aiResult = await analyzePostWithGroq(caption || '', postUrl || '');
      } catch (groqErr: any) {
        console.warn('[Analyze Post] Groq error, falling back to Gemini:', groqErr?.message);
      }
    }

    // 2. FALLBACK: Gemini AI
    if (!aiResult) {
      providerUsed = 'gemini';
      aiResult = await analyzePostWithGemini(caption || '', postUrl || '');
    }

    const textToEmbed = `${aiResult.category}. ${aiResult.summary}. ${caption || ''}`.trim();
    const embedding = await generateEmbedding(textToEmbed);

    // Update the post in local storage
    if (postId) {
      const posts = getLocalPosts();
      const target = posts.find((p) => p.id === postId || p.instagram_post_id === postId);

      if (target) {
        const updated: SavedPost = {
          ...target,
          ai_summary: aiResult.summary,
          category: aiResult.category,
          embedding,
        };
        saveLocalPosts([updated]);

        // Also update Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const supabase = createAdminClient();
            await supabase.from('saved_posts').upsert([updated]);
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      provider: providerUsed,
      ai_summary: aiResult.summary,
      category: aiResult.category,
      tags: aiResult.tags || [],
    });
  } catch (err: any) {
    console.error('[API /api/analyze-post] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to analyze post.' },
      { status: 500 }
    );
  }
}
