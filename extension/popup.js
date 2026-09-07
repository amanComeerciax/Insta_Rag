document.addEventListener('DOMContentLoaded', async () => {
  const autoSyncBtn = document.getElementById('autoSyncBtn');
  const postLimitSelect = document.getElementById('postLimit');
  const apiUrlInput = document.getElementById('apiUrl');
  const secretKeyInput = document.getElementById('secretKey');
  const resultsDiv = document.getElementById('results');
  const badge = document.getElementById('badge');

  autoSyncBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim();
    const secretKey = secretKeyInput.value.trim();
    const limitChoice = postLimitSelect.value;
    const targetLimit = limitChoice === 'visible' ? 12 : parseInt(limitChoice, 10);
    const shouldScroll = limitChoice !== 'visible';

    autoSyncBtn.disabled = true;
    autoSyncBtn.textContent = shouldScroll ? 'Auto-Scrolling Instagram...' : 'Scraping Posts...';
    badge.textContent = 'Active';
    badge.style.color = '#a3a3a3';
    resultsDiv.style.display = 'block';
    resultsDiv.style.color = '#a3a3a3';
    resultsDiv.innerHTML = shouldScroll
      ? `Auto-scrolling page to collect ~${targetLimit} posts. Please wait...`
      : 'Collecting visible posts...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active browser tab found.');

      if (!tab.url || !tab.url.includes('instagram.com')) {
        throw new Error('Please open instagram.com/.../saved/ in this tab first.');
      }

      // Run auto-scroll & scrape in active Instagram tab
      const [{ result: scrapedPosts }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: autoScrollAndScrapeInstagram,
        args: [targetLimit, shouldScroll],
      });

      if (!scrapedPosts || scrapedPosts.length === 0) {
        throw new Error('No saved posts detected on this page. Make sure you are on the Saved tab.');
      }

      autoSyncBtn.textContent = `Pushing ${scrapedPosts.length} posts to SaveSort AI...`;
      resultsDiv.innerHTML = `Collected <strong>${scrapedPosts.length}</strong> posts! Uploading to SaveSort AI...`;

      // Send to SaveSort AI API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-key': secretKey,
        },
        body: JSON.stringify({ posts: scrapedPosts }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server rejected extension payload.');
      }

      const count = data.postsAdded ?? scrapedPosts.length;
      resultsDiv.style.color = '#ffffff';
      resultsDiv.innerHTML = `<strong>Done!</strong> Added ${count} posts to your library. Go to Dashboard to search them!`;
      badge.textContent = 'Completed';
      badge.style.color = '#ffffff';
    } catch (err) {
      resultsDiv.style.color = '#f87171';
      resultsDiv.innerHTML = `<strong>Notice:</strong> ${err.message}`;
      badge.textContent = 'Failed';
      badge.style.color = '#f87171';
    } finally {
      autoSyncBtn.disabled = false;
      autoSyncBtn.textContent = '⚡ Auto-Scroll & Sync Posts';
    }
  });
});

// Function injected into Instagram page to auto-scroll and collect posts
async function autoScrollAndScrapeInstagram(targetCount = 60, shouldScroll = true) {
  const posts = [];
  const seenUrls = new Set();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function harvestCurrentVisible() {
    const anchors = document.querySelectorAll(
      'a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], a[href*="/tv/"]'
    );

    anchors.forEach((a) => {
      let href = a.href.split('?')[0];
      if (!href.endsWith('/')) href += '/';

      if (
        (href.includes('/p/') || href.includes('/reel/') || href.includes('/reels/') || href.includes('/tv/')) &&
        !seenUrls.has(href)
      ) {
        seenUrls.add(href);

        const img = a.querySelector('img') || a.parentElement?.querySelector('img');
        const caption = img ? (img.alt || '') : '';
        const thumbnailUrl = img ? (img.src || img.getAttribute('src')) : null;
        const isReel = href.includes('/reel/') || href.includes('/reels/');
        const isVideo = href.includes('/tv/');

        posts.push({
          post_url: href,
          caption: caption,
          thumbnail_url: thumbnailUrl,
          media_type: isReel ? 'reel' : isVideo ? 'video' : 'photo',
          saved_at: new Date().toISOString(),
        });
      }
    });
  }

  // First pass
  harvestCurrentVisible();

  if (!shouldScroll || seenUrls.size >= targetCount) {
    return posts;
  }

  // Smooth Auto-scroll loop
  let lastHeight = document.body.scrollHeight;
  let stagnantAttempts = 0;
  const maxLoops = 25;

  for (let i = 0; i < maxLoops; i++) {
    if (seenUrls.size >= targetCount) break;

    // Scroll down to trigger Instagram's infinite load
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1300);

    harvestCurrentVisible();

    // If no new height, scroll slightly up and down to trigger intersection observer
    if (document.body.scrollHeight === lastHeight) {
      stagnantAttempts++;
      window.scrollBy(0, -300);
      await sleep(400);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1400);
      harvestCurrentVisible();

      if (stagnantAttempts >= 3) {
        // End of saved list reached
        break;
      }
    } else {
      stagnantAttempts = 0;
      lastHeight = document.body.scrollHeight;
    }
  }

  // Scroll back to top smoothly when finished
  window.scrollTo({ top: 0, behavior: 'smooth' });

  return posts;
}
