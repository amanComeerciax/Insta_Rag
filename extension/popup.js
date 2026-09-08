document.addEventListener('DOMContentLoaded', async () => {
  const autoSyncBtn = document.getElementById('autoSyncBtn');
  const postLimitSelect = document.getElementById('postLimit');
  const apiUrlInput = document.getElementById('apiUrl');
  const secretKeyInput = document.getElementById('secretKey');
  const userIdInput = document.getElementById('userIdInput');
  const resultsDiv = document.getElementById('results');
  const badge = document.getElementById('badge');
  const toggleAdvanced = document.getElementById('toggleAdvanced');
  const advancedSection = document.getElementById('advancedSection');
  const statusNotice = document.getElementById('statusNotice');

  // Load saved preferences
  try {
    chrome.storage?.local?.get(['apiUrl', 'userId', 'postLimit'], (res) => {
      if (res?.apiUrl) apiUrlInput.value = res.apiUrl;
      if (res?.userId) userIdInput.value = res.userId;
      if (res?.postLimit) postLimitSelect.value = res.postLimit;
    });
  } catch {}

  toggleAdvanced.addEventListener('click', () => {
    const isHidden = advancedSection.style.display === 'none' || !advancedSection.style.display;
    advancedSection.style.display = isHidden ? 'block' : 'none';
    toggleAdvanced.textContent = isHidden ? 'Hide Advanced' : '⚙️ Advanced Settings';
  });

  autoSyncBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim() || 'https://insta-rag-swart.vercel.app/api/import/extension';
    const secretKey = secretKeyInput.value.trim() || 'savesort_ext_secret';
    const userId = userIdInput.value.trim();
    const limitChoice = postLimitSelect.value;
    const targetLimit = limitChoice === 'visible' ? 12 : parseInt(limitChoice, 10);
    const shouldScroll = limitChoice !== 'visible';

    // Save preferences
    try {
      chrome.storage?.local?.set({ apiUrl, userId, postLimit: limitChoice });
    } catch {}

    autoSyncBtn.disabled = true;
    autoSyncBtn.textContent = 'Locating Instagram Tab...';
    badge.textContent = 'Connecting';
    badge.style.color = '#60a5fa';
    resultsDiv.style.display = 'block';
    resultsDiv.style.color = '#a3a3a3';
    resultsDiv.innerHTML = 'Connecting to Instagram...';

    try {
      // 1. Locate Instagram tab (either active tab or any open instagram.com tab)
      let targetTab = null;
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.url && activeTab.url.includes('instagram.com')) {
          targetTab = activeTab;
        }
      } catch {}

      if (!targetTab) {
        const igTabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' });
        if (igTabs && igTabs.length > 0) {
          targetTab = igTabs[0];
        }
      }

      if (!targetTab || !targetTab.id) {
        throw new Error(
          'Please open instagram.com in a browser tab and log in, then click Sync.'
        );
      }

      autoSyncBtn.textContent = 'Extracting Saved Bookmarks...';
      resultsDiv.innerHTML = `Extracting saved bookmarks from tab: <em>${targetTab.title || 'Instagram'}</em>...`;

      // 2. Execute fast scraper inside the tab
      const execResults = await chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: scrapeInstagramSavedPosts,
        args: [targetLimit, shouldScroll],
      });

      const scrapedPosts = execResults?.[0]?.result;

      if (!scrapedPosts || !Array.isArray(scrapedPosts) || scrapedPosts.length === 0) {
        throw new Error(
          'No saved posts found. Please navigate to instagram.com/your_username/saved/ and try again.'
        );
      }

      autoSyncBtn.textContent = `Pushing ${scrapedPosts.length} posts to Cloud...`;
      resultsDiv.innerHTML = `Extracted <strong>${scrapedPosts.length}</strong> posts! Uploading to MongoDB Atlas...`;
      badge.textContent = 'Uploading';
      badge.style.color = '#38bdf8';

      // 3. Send payload to SaveSort AI / Insta_Rag endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-key': secretKey,
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          posts: scrapedPosts,
          userId: userId || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Server returned ${response.status}: Failed to save posts.`);
      }

      const count = data.postsAdded ?? scrapedPosts.length;
      resultsDiv.style.color = '#4ade80';
      resultsDiv.innerHTML = `<strong>Done!</strong> Successfully synced ${count} posts into your library. Refresh your dashboard to explore them!`;
      badge.textContent = 'Completed';
      badge.style.color = '#4ade80';
    } catch (err) {
      console.error('[Popup Sync Error]', err);
      resultsDiv.style.color = '#f87171';
      resultsDiv.innerHTML = `<strong>Error:</strong> ${err.message || 'Unknown error occurred.'}`;
      badge.textContent = 'Failed';
      badge.style.color = '#f87171';
    } finally {
      autoSyncBtn.disabled = false;
      autoSyncBtn.textContent = '⚡ Sync Instagram Saved Posts';
    }
  });
});

// Function executed inside Instagram page context
async function scrapeInstagramSavedPosts(targetLimit = 30, shouldScroll = true) {
  const posts = [];
  const seenIds = new Set();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Method 1: Internal Saved Feed API fetch (instant ~300ms, gets high-res data)
  try {
    const apiRes = await fetch('/api/v1/feed/saved/posts/?include_feed_video=true', {
      headers: {
        'X-IG-App-ID': '936619743392459',
      },
      credentials: 'include',
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      const items = data.items || [];

      for (const item of items) {
        const media = item.media || item;
        const code = media.code || media.shortcode || media.id;
        if (!code || seenIds.has(code)) continue;
        seenIds.add(code);

        let mediaType = 'photo';
        if (media.media_type === 2) mediaType = 'reel';
        else if (media.media_type === 8) mediaType = 'carousel';
        else if (media.is_video) mediaType = 'video';

        let thumbnailUrl = null;
        if (media.image_versions2?.candidates?.length > 0) {
          thumbnailUrl = media.image_versions2.candidates[0].url;
        }

        let videoUrl = null;
        if (media.video_versions?.length > 0) {
          videoUrl = media.video_versions[0].url;
        }

        const caption = media.caption?.text || '';
        const savedAt = media.taken_at
          ? new Date(media.taken_at * 1000).toISOString()
          : new Date().toISOString();

        posts.push({
          post_url: `https://www.instagram.com/p/${code}/`,
          caption,
          thumbnail_url: thumbnailUrl,
          video_url: videoUrl,
          media_type: mediaType,
          saved_at: savedAt,
        });

        if (posts.length >= targetLimit) break;
      }

      if (posts.length > 0) {
        return posts;
      }
    }
  } catch (apiErr) {
    console.warn('[Scraper Notice] Internal API fetch skipped, using DOM harvest:', apiErr);
  }

  // Method 2: DOM Scrape (handles rendered DOM bookmarks)
  function harvestDOM() {
    const anchors = document.querySelectorAll(
      'a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], a[href*="/tv/"]'
    );

    anchors.forEach((a) => {
      let href = a.href.split('?')[0];
      if (!href.endsWith('/')) href += '/';

      if (!seenIds.has(href)) {
        seenIds.add(href);
        const img = a.querySelector('img') || a.parentElement?.querySelector('img');
        const caption = img ? (img.alt || '') : '';
        const thumbnailUrl = img ? (img.src || img.getAttribute('src')) : null;
        const isReel = href.includes('/reel/') || href.includes('/reels/');
        const isVideo = href.includes('/tv/');

        posts.push({
          post_url: href,
          caption,
          thumbnail_url: thumbnailUrl,
          media_type: isReel ? 'reel' : isVideo ? 'video' : 'photo',
          saved_at: new Date().toISOString(),
        });
      }
    });
  }

  harvestDOM();

  if (!shouldScroll || posts.length >= targetLimit) {
    return posts;
  }

  // Fast smooth scroll (3 steps of 500ms = 1.5 seconds max)
  for (let i = 0; i < 4; i++) {
    if (posts.length >= targetLimit) break;
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(500);
    harvestDOM();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  return posts;
}
