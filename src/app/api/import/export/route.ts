import { NextRequest, NextResponse } from 'next/server';
import { parseInstagramExportZip } from '@/lib/zipParser';
import { processAndSavePosts } from '@/lib/processPosts';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // Allow 60s processing for large exports

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please select an Instagram export .zip file.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a .zip archive exported from Instagram.' },
        { status: 400 }
      );
    }

    // Determine user identity
    let userId = 'demo-user-default';
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    } catch {
      // Continue with demo user if session not active
    }

    // Convert file to ArrayBuffer and parse ZIP contents
    const arrayBuffer = await file.arrayBuffer();
    const parsedPosts = await parseInstagramExportZip(arrayBuffer);

    if (parsedPosts.length === 0) {
      return NextResponse.json(
        { error: 'No saved posts could be found in the provided ZIP file.' },
        { status: 422 }
      );
    }

    // Process posts in batches with Gemini AI & pgvector
    const result = await processAndSavePosts(userId, parsedPosts, 'manual_export', {
      batchSize: 5,
      throttleMs: 350,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.total} posts! (${result.added} new saved posts added, ${result.skipped} duplicates skipped).`,
      postsAdded: result.added,
      postsSkipped: result.skipped,
      totalFound: result.total,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('[API /api/import/export] Ingestion error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to process Instagram export archive. Please make sure the ZIP contains valid JSON export files.' 
      },
      { status: 500 }
    );
  }
}
