import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SAMPLE_SAVED_POSTS } from '@/lib/mockData';
import { getPostsCollection, getSyncLogsCollection, isMongoConfigured } from '@/lib/mongodb';
import { saveLocalPosts } from '@/lib/localStorage';
import { SavedPost } from '@/types';

export async function POST(req: NextRequest) {
  try {
    let userId = 'direct_cookie_user';
    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) userId = clerkAuth.userId;
    } catch {}

    const enriched: SavedPost[] = SAMPLE_SAVED_POSTS.map((p, idx) => ({
      ...p,
      id: `sample_${Date.now()}_${idx}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    } as SavedPost));

    // Save to MongoDB Atlas
    if (isMongoConfigured()) {
      try {
        const postsCol = await getPostsCollection();
        const ops = enriched.map((post) => ({
          updateOne: {
            filter: { user_id: userId, instagram_post_id: post.instagram_post_id },
            update: { $set: post },
            upsert: true,
          },
        }));
        await postsCol.bulkWrite(ops);

        const logsCol = await getSyncLogsCollection();
        await logsCol.insertOne({
          id: `sync_${Date.now()}`,
          user_id: userId,
          source: 'mock_demo',
          posts_added: enriched.length,
          posts_skipped: 0,
          status: 'completed',
          created_at: new Date().toISOString(),
        });
      } catch (mongoErr: any) {
        console.error('[API /api/mock] MongoDB save error:', mongoErr);
      }
    }

    // Also save to local storage as backup
    saveLocalPosts(enriched, userId);

    return NextResponse.json({
      success: true,
      message: `Loaded ${enriched.length} sample posts successfully!`,
      count: enriched.length,
    });
  } catch (err: any) {
    console.error('[API /api/mock] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to seed sample posts' },
      { status: 500 }
    );
  }
}
