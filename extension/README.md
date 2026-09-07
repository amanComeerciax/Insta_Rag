# SaveSort AI — Companion Chrome Extension

This Chrome Extension lets you scrape and ingest your saved Instagram posts directly while browsing Instagram on desktop.

## How to Install in Chrome / Brave / Edge

1. Open your Chromium browser (Google Chrome, Brave, Arc, Edge).
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle located at the top-right corner).
4. Click **"Load unpacked"**.
5. Select the `extension/` folder inside this repository.
6. The SaveSort AI extension icon will appear in your browser toolbar!

## How to Use

1. Ensure the SaveSort AI web application is running (e.g. `npm run dev` at `http://localhost:3000`).
2. Open Instagram in your browser and go to your saved posts:
   `https://www.instagram.com/<your_username>/saved/`
3. Scroll down slightly to ensure post thumbnails are loaded on the page.
4. Click the SaveSort AI extension icon in your browser toolbar.
5. Confirm the App Endpoint (`http://localhost:3000/api/import/extension`) and secret key match your `.env.local`.
6. Click **"⚡ Sync Instagram Saved Posts"**.
7. The extension collects the posts and streams them to SaveSort AI for Gemini categorization and vector embedding!
