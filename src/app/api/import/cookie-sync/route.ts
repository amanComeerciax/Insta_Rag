import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processAndSavePosts } from '@/lib/processPosts';
import { ParsedInstagramPost, MediaType } from '@/types';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = (body.sessionId || '').trim();
    const maxPosts = Math.min(parseInt(body.maxPosts || '100', 10), 300);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required. Please copy your "sessionid" cookie from Instagram.' },
        { status: 400 }
      );
    }

    // Robustly parse session ID and extract ds_user_id & csrftoken if full cookie was pasted
    let cleanSessionId = '';
    let dsUserId = '';
    let csrfToken = 'dummya1b2c3d4e5f6g7h8i9j0k1l2m3n4';
    const trimmedInput = sessionId.trim();

    if (trimmedInput.includes(';') || trimmedInput.includes('sessionid=')) {
      const sessionMatch = trimmedInput.match(/(?:^|;\s*)sessionid=([^;]+)/i);
      if (sessionMatch) cleanSessionId = sessionMatch[1].trim();

      const dsMatch = trimmedInput.match(/(?:^|;\s*)ds_user_id=([^;]+)/i);
      if (dsMatch) dsUserId = dsMatch[1].trim();

      const csrfMatch = trimmedInput.match(/(?:^|;\s*)csrftoken=([^;]+)/i);
      if (csrfMatch) csrfToken = csrfMatch[1].trim();
    } else {
      cleanSessionId = trimmedInput.replace(/^sessionid=/i, '').trim();
    }

    // Remove any surrounding quotes
    cleanSessionId = cleanSessionId.replace(/^["']|["']$/g, '').trim();

    // Extract ds_user_id from sessionid if formatted as USERID%3A... or USERID:...
    if (!dsUserId) {
      const idMatch = cleanSessionId.match(/^(\d+)(?:%3[aA]|:)/);
      if (idMatch && idMatch[1]) {
        dsUserId = idMatch[1];
      }
    }

    // Determine user identity via client payload or Clerk
    let userId = body.userId || body.user_id || null;
    if (!userId) {
      try {
        const clerkAuth = auth();
        if (clerkAuth?.userId) userId = clerkAuth.userId;
      } catch {}
    }

    if (!userId || userId === 'direct_cookie_user') {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) userId = user.id;
      } catch {}
    }
    userId = userId || 'direct_cookie_user';

    const collectedPosts: ParsedInstagramPost[] = [];
    const seenIds = new Set<string>();
    let nextMaxId: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = Math.ceil(maxPosts / 20) + 2;

    const cookieHeader = [
      `sessionid=${cleanSessionId}`,
      dsUserId ? `ds_user_id=${dsUserId}` : '',
      `csrftoken=${csrfToken}`,
      'ig_did=DUMMY_IG_DID',
      'ig_nrcb=1',
    ].filter(Boolean).join('; ');

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cookie': cookieHeader,
      'X-IG-App-ID': '936619743392459', // Official Instagram Web App ID
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': csrfToken,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
    };

    while (hasMore && collectedPosts.length < maxPosts && pageCount < maxPages) {
      pageCount++;
      const url = new URL('https://www.instagram.com/api/v1/feed/saved/posts/');
      if (nextMaxId) {
        url.searchParams.set('max_id', nextMaxId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        redirect: 'manual',
      });

      if (response.status === 301 || response.status === 302 || response.status === 400 || response.status === 401 || response.status === 403) {
        const location = response.headers.get('location') || '';
        console.warn(`[CookieSync] Instagram responded with ${response.status}, location: ${location}`);
        throw new Error(
          'Instagram session expired or rejected. Please open instagram.com in Chrome, verify you are logged in, and re-copy the fresh "sessionid" cookie.'
        );
      }

      if (!response.ok) {
        throw new Error(`Instagram server responded with HTTP status ${response.status}.`);
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        break;
      }

      for (const item of items) {
        const media = item.media || item;
        const code = media.code || media.shortcode || media.id;
        if (!code || seenIds.has(code)) continue;

        seenIds.add(code);

        // Detect post media type
        let mediaType: MediaType = 'photo';
        if (media.media_type === 2) mediaType = 'reel';
        else if (media.media_type === 8) mediaType = 'carousel';
        else if (media.is_video) mediaType = 'video';

        // Extract caption
        const caption = media.caption?.text || '';

        // Extract best thumbnail image
        let thumbnailUrl = null;
        if (media.image_versions2?.candidates && media.image_versions2.candidates.length > 0) {
          thumbnailUrl = media.image_versions2.candidates[0].url;
        }

        // Extract all carousel slide URLs if available
        let carouselMediaUrls: string[] = [];
        if (Array.isArray(media.carousel_media) && media.carousel_media.length > 0) {
          carouselMediaUrls = media.carousel_media
            .map((slide: any) => slide.image_versions2?.candidates?.[0]?.url)
            .filter(Boolean);
        }

        // Extract direct video stream URL if video/reel
        let videoUrl: string | null = null;
        if (Array.isArray(media.video_versions) && media.video_versions.length > 0) {
          videoUrl = media.video_versions[0].url;
        } else if (Array.isArray(media.carousel_media)) {
          const videoSlide = media.carousel_media.find(
            (slide: any) => Array.isArray(slide.video_versions) && slide.video_versions.length > 0
          );
          if (videoSlide) {
            videoUrl = videoSlide.video_versions[0].url;
          }
        }

        const savedAt = media.taken_at
          ? new Date(media.taken_at * 1000).toISOString()
          : new Date().toISOString();

        collectedPosts.push({
          instagram_post_id: code,
          post_url: `https://www.instagram.com/p/${code}/`,
          caption,
          media_type: mediaType,
          thumbnail_url: thumbnailUrl,
          video_url: videoUrl,
          carousel_media_urls: carouselMediaUrls.length > 0 ? carouselMediaUrls : undefined,
          saved_at: savedAt,
        });

        if (collectedPosts.length >= maxPosts) break;
      }

      nextMaxId = data.next_max_id || null;
      hasMore = Boolean(data.more_available && nextMaxId);

      // Polite small delay between Instagram pagination calls
      if (hasMore && collectedPosts.length < maxPosts) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (collectedPosts.length === 0) {
      return NextResponse.json(
        { error: 'No saved posts found for this Instagram session.' },
        { status: 404 }
      );
    }

    // Process posts through AI enrichment & storage
    const result = await processAndSavePosts(userId, collectedPosts, 'extension', {
      batchSize: 8,
      throttleMs: 250,
    });

    return NextResponse.json({
      success: true,
      message: `Direct Instagram sync complete! Added ${result.added} posts.`,
      postsAdded: result.added,
      totalFetched: collectedPosts.length,
      errors: result.errors,
    });
  } catch (err: any) {
    console.error('[API /api/import/cookie-sync] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to sync with Instagram session ID.' },
      { status: 500 }
    );
  }
}
