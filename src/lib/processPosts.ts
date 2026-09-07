import { ParsedInstagramPost, SavedPost } from '@/types';
import { analyzePostWithGemini, generateEmbedding, generateFallbackAnalysis, generateDeterministicMockVector, delay } from './gemini';
import { createAdminClient, isSupabaseConfigured } from './supabase/admin';
import { saveLocalPosts, getLocalPosts } from './localStorage';

export interface ProcessPostsResult {
  added: number;
  skipped: number;
  total: number;
  errors: string[];
}

export interface ProcessOptions {
  batchSize?: number;
  throttleMs?: number;
  fastImport?: boolean; // When true, imports instantly without blocking on sequential Gemini calls
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Shared ingestion engine used by Direct Sync, ZIP Export, and Extension
 */
export async function processAndSavePosts(
  userId: string,
  rawPosts: ParsedInstagramPost[],
  source: 'manual_export' | 'extension' | 'mock_demo',
  options: ProcessOptions = {}
): Promise<ProcessPostsResult> {
  const { batchSize = 5, throttleMs = 200, fastImport = true, onProgress } = options;
  const errors: string[] = [];

  if (!rawPosts || rawPosts.length === 0) {
    return { added: 0, skipped: 0, total: 0, errors: [] };
  }

  // 1. Identify existing post IDs to avoid duplicate processing
  const existingPostIds = new Set<string>();

  // Check local storage first
  const localItems = getLocalPosts(userId);
  for (const item of localItems) {
    existingPostIds.add(item.instagram_post_id);
  }

  // Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data: existing, error: fetchErr } = await supabase
        .from('saved_posts')
        .select('instagram_post_id')
        .eq('user_id', userId);

      if (!fetchErr && existing) {
        existing.forEach((row: any) => existingPostIds.add(row.instagram_post_id));
      }
    } catch (err: any) {
      console.warn('[ProcessPosts] Supabase lookup notice:', err?.message || err);
    }
  }

  // Filter genuinely new posts
  const newPosts = rawPosts.filter((p) => !existingPostIds.has(p.instagram_post_id));
  const skippedCount = rawPosts.length - newPosts.length;

  if (newPosts.length === 0) {
    return { added: 0, skipped: skippedCount, total: rawPosts.length, errors: [] };
  }

  // 2. Ultra-Fast Ingestion Mode: Instant Import without blocking network waits
  const enrichedPosts: SavedPost[] = [];

  if (fastImport) {
    for (const post of newPosts) {
      const fallback = generateFallbackAnalysis(post.caption);
      const mockVector = generateDeterministicMockVector(post.caption || 'instagram');

      enrichedPosts.push({
        id: `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        user_id: userId,
        instagram_post_id: post.instagram_post_id,
        post_url: post.post_url,
        caption: post.caption || '',
        media_type: post.media_type || 'photo',
        thumbnail_url: post.thumbnail_url || null,
        video_url: post.video_url || null,
        carousel_media_urls: post.carousel_media_urls || undefined,
        ai_summary: fallback.summary,
        category: fallback.category,
        embedding: mockVector,
        saved_at: post.saved_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as SavedPost);
    }
  } else {
    // Deep sequential processing mode
    for (let i = 0; i < newPosts.length; i += batchSize) {
      const batch = newPosts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (post) => {
          try {
            const aiResult = await analyzePostWithGemini(post.caption, post.post_url);
            const textToEmbed = `${aiResult.category}. ${aiResult.summary}. ${post.caption || ''}`.trim();
            const embedding = await generateEmbedding(textToEmbed);

            return {
              id: `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              user_id: userId,
              instagram_post_id: post.instagram_post_id,
              post_url: post.post_url,
              caption: post.caption || '',
              media_type: post.media_type || 'photo',
              thumbnail_url: post.thumbnail_url || null,
              video_url: post.video_url || null,
              carousel_media_urls: post.carousel_media_urls || undefined,
              ai_summary: aiResult.summary,
              category: aiResult.category,
              embedding: embedding,
              saved_at: post.saved_at || new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as SavedPost;
          } catch (itemErr: any) {
            errors.push(`Failed post ${post.instagram_post_id}: ${itemErr?.message || itemErr}`);
            return null;
          }
        })
      );

      const validBatchItems = batchResults.filter((p): p is NonNullable<typeof p> => p !== null);
      enrichedPosts.push(...validBatchItems);

      if (onProgress) {
        onProgress(Math.min(i + batch.length, newPosts.length), newPosts.length);
      }

      if (i + batchSize < newPosts.length && throttleMs > 0) {
        await delay(throttleMs);
      }
    }
  }

  // 3. Save to Local Storage (Always guarantees posts are saved immediately)
  const localResult = saveLocalPosts(enrichedPosts, userId);
  let addedCount = localResult.added;

  // 4. Also upsert into Supabase if configured
  if (isSupabaseConfigured() && enrichedPosts.length > 0) {
    try {
      const supabase = createAdminClient();
      const { error: insertError } = await supabase
        .from('saved_posts')
        .upsert(enrichedPosts, { onConflict: 'user_id,instagram_post_id' });

      if (insertError) {
        console.warn('[ProcessPosts] Supabase sync notice:', insertError.message);
      }
    } catch (dbErr: any) {
      console.warn('[ProcessPosts] Supabase connection notice:', dbErr?.message || dbErr);
    }
  }

  return {
    added: addedCount || enrichedPosts.length,
    skipped: skippedCount,
    total: rawPosts.length,
    errors,
  };
}
