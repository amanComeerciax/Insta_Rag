import fs from 'fs';
import path from 'path';
import { SavedPost } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'saved_posts.json');
const LOGS_FILE = path.join(DATA_DIR, 'sync_logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getLocalPosts(userId?: string | null): SavedPost[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(POSTS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(POSTS_FILE, 'utf-8');
    const posts: SavedPost[] = JSON.parse(content) || [];
    if (userId) {
      return posts.filter((p) => (p.user_id || 'direct_cookie_user') === userId);
    }
    return posts;
  } catch (err) {
    console.warn('[LocalStorage] Could not read local posts:', err);
    return [];
  }
}

export function saveLocalPosts(newPosts: SavedPost[], targetUserId?: string | null): { added: number; skipped: number } {
  try {
    ensureDataDir();
    const existing = getLocalPosts(); // retrieve all to avoid corrupting other users
    const existingMap = new Map<string, SavedPost>();

    for (const post of existing) {
      const uId = post.user_id || 'direct_cookie_user';
      existingMap.set(`${uId}:${post.instagram_post_id}`, post);
    }

    let added = 0;
    let skipped = 0;

    for (const post of newPosts) {
      const uId = post.user_id || targetUserId || 'direct_cookie_user';
      const postToSave: SavedPost = {
        ...post,
        user_id: uId,
      };
      const key = `${uId}:${post.instagram_post_id}`;

      if (!existingMap.has(key)) {
        existingMap.set(key, postToSave);
        added++;
      } else {
        // Update existing item
        existingMap.set(key, {
          ...existingMap.get(key)!,
          ...postToSave,
        });
        skipped++;
      }
    }

    const allPosts = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
    );

    fs.writeFileSync(POSTS_FILE, JSON.stringify(allPosts, null, 2), 'utf-8');

    // Update sync log
    saveLocalSyncLog({
      id: `sync_${Date.now()}`,
      user_id: targetUserId || 'direct_cookie_user',
      source: 'extension',
      posts_added: added,
      posts_skipped: skipped,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    return { added, skipped };
  } catch (err) {
    console.error('[LocalStorage] Error saving posts:', err);
    return { added: 0, skipped: 0 };
  }
}

export function getLocalSyncLog(userId?: string | null): any {
  try {
    ensureDataDir();
    if (!fs.existsSync(LOGS_FILE)) return null;
    const content = fs.readFileSync(LOGS_FILE, 'utf-8');
    const logs: any[] = JSON.parse(content) || [];
    if (userId) {
      const userLogs = logs.filter((l) => (l.user_id || 'direct_cookie_user') === userId);
      return userLogs[userLogs.length - 1] || null;
    }
    return logs[logs.length - 1] || null;
  } catch {
    return null;
  }
}

function saveLocalSyncLog(log: any) {
  try {
    ensureDataDir();
    let logs: any[] = [];
    if (fs.existsSync(LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
      } catch { }
    }
    logs.push(log);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch { }
}

export function updateLocalPost(postId: string, updates: Partial<SavedPost>): boolean {
  try {
    ensureDataDir();
    const existing = getLocalPosts();
    let updated = false;
    const modified = existing.map((p) => {
      if (p.id === postId || p.instagram_post_id === postId) {
        updated = true;
        return { ...p, ...updates };
      }
      return p;
    });

    if (updated) {
      fs.writeFileSync(POSTS_FILE, JSON.stringify(modified, null, 2), 'utf-8');
    }
    return updated;
  } catch (err) {
    console.error('[LocalStorage] Error updating post:', err);
    return false;
  }
}

export function deleteLocalPost(postId: string, userId?: string | null): boolean {
  try {
    const existing = getLocalPosts();
    const filtered = existing.filter((p) => {
      const matchId = p.id === postId || p.instagram_post_id === postId;
      if (!matchId) return true;
      if (userId) {
        return (p.user_id || 'direct_cookie_user') !== userId;
      }
      return false;
    });
    fs.writeFileSync(POSTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function clearAllLocalPosts(userId?: string | null): boolean {
  try {
    ensureDataDir();
    if (!userId) {
      fs.writeFileSync(POSTS_FILE, JSON.stringify([], null, 2), 'utf-8');
      fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return true;
    }
    const existing = getLocalPosts();
    const remaining = existing.filter((p) => (p.user_id || 'direct_cookie_user') !== userId);
    fs.writeFileSync(POSTS_FILE, JSON.stringify(remaining, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Strict in-memory semantic vector and keyword search
 */
export function searchLocalPosts(
  queryEmbedding: number[],
  queryText: string,
  categoryFilter?: string | null,
  userId?: string | null
): SavedPost[] {
  let posts = getLocalPosts();
  if (userId) {
    posts = posts.filter((p) => p.user_id === userId);
  }
  if (posts.length === 0) return [];

  const lowerQuery = queryText.toLowerCase().trim();
  const queryTokens = lowerQuery.split(/\s+/).filter((t) => t.length > 1);

  // Score posts by vector cosine similarity + keyword boost
  const scored = posts
    .filter((post) => !categoryFilter || post.category === categoryFilter)
    .map((post) => {
      let similarity = 0;
      let hasDirectKeywordMatch = false;

      // 1. Cosine similarity if embeddings exist
      if (post.embedding && Array.isArray(post.embedding) && queryEmbedding.length === post.embedding.length) {
        similarity = cosineSimilarity(queryEmbedding, post.embedding);
      }

      // 2. Keyword check across caption, summary, and category
      const postText = `${post.caption || ''} ${post.ai_summary || ''} ${post.category || ''}`.toLowerCase();

      if (lowerQuery && postText.includes(lowerQuery)) {
        hasDirectKeywordMatch = true;
        similarity = Math.max(similarity, 0.85);
      } else if (queryTokens.length > 0) {
        const matchesCount = queryTokens.filter((token) => postText.includes(token)).length;
        if (matchesCount > 0) {
          hasDirectKeywordMatch = true;
          similarity = Math.max(similarity, 0.70 + (matchesCount / queryTokens.length) * 0.20);
        }
      }

      return {
        ...post,
        similarity,
        hasDirectKeywordMatch,
      };
    });

  // Strict filtering:
  // If user searched for a specific query (e.g. "font"), only return posts that:
  // - Either have a direct keyword match (hasDirectKeywordMatch = true)
  // - OR have high semantic similarity (>= 0.60)
  return scored
    .filter((p) => {
      if (!lowerQuery) return true;
      if (p.hasDirectKeywordMatch) return true;
      return p.similarity >= 0.60;
    })
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
