import JSZip from 'jszip';
import { ParsedInstagramPost, MediaType } from '@/types';

/**
 * Corrects Instagram's infamous Latin-1 UTF-8 misencoding (mojibake)
 */
export function fixInstagramEncoding(str: string): string {
  if (!str) return '';
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return str;
  }
}

/**
 * Extracts the unique Instagram shortcode from a post URL
 * Supports /p/, /reel/, /tv/
 */
export function extractShortcode(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback: extract last alphanumeric slug
  const clean = url.replace(/\/$/, '');
  const parts = clean.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Determine media type from URL and caption keywords
 */
export function detectMediaType(url: string, caption: string = ''): MediaType {
  const lowerUrl = url.toLowerCase();
  const lowerCaption = caption.toLowerCase();

  if (lowerUrl.includes('/reel/') || lowerCaption.includes('#reel') || lowerCaption.includes('reels')) {
    return 'reel';
  }
  if (lowerUrl.includes('/tv/')) {
    return 'video';
  }
  if (lowerCaption.includes('swipe') || lowerCaption.includes('slides') || lowerCaption.includes('carousel')) {
    return 'carousel';
  }
  return 'photo';
}

/**
 * Defensively extracts saved posts from an Instagram data export ZIP file
 */
export async function parseInstagramExportZip(fileBuffer: ArrayBuffer): Promise<ParsedInstagramPost[]> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(fileBuffer);
  const parsedPosts: ParsedInstagramPost[] = [];
  const seenIds = new Set<string>();

  // Candidates for saved posts JSON files
  const jsonFiles: JSZip.JSZipObject[] = [];

  zipContent.forEach((relativePath, file) => {
    if (!file.dir && relativePath.toLowerCase().endsWith('.json')) {
      jsonFiles.push(file);
    }
  });

  if (jsonFiles.length === 0) {
    throw new Error('No JSON files found in the uploaded ZIP archive.');
  }

  // Sort candidate files to prioritize known paths
  jsonFiles.sort((a, b) => {
    const score = (path: string) => {
      const lower = path.toLowerCase();
      if (lower.includes('saved_posts.json')) return 100;
      if (lower.includes('saved_collections.json')) return 80;
      if (lower.includes('saved/')) return 60;
      if (lower.includes('saved')) return 40;
      return 10;
    };
    return score(b.name) - score(a.name);
  });

  for (const file of jsonFiles) {
    try {
      const text = await file.async('string');
      const data = JSON.parse(text);

      const extracted = extractPostsFromDataObject(data);
      for (const item of extracted) {
        if (item.instagram_post_id && !seenIds.has(item.instagram_post_id)) {
          seenIds.add(item.instagram_post_id);
          parsedPosts.push(item);
        }
      }

      // If we found posts in high-priority saved_posts.json, we can stop or keep scanning
      if (parsedPosts.length > 0 && file.name.toLowerCase().includes('saved_posts.json')) {
        break;
      }
    } catch (err) {
      // Continue searching other files if one fails to parse
      console.warn(`Failed to parse ${file.name} in ZIP:`, err);
    }
  }

  if (parsedPosts.length === 0) {
    throw new Error(
      'Could not find any Instagram saved posts in the uploaded ZIP. Please ensure you selected "Saved" data in JSON format when exporting.'
    );
  }

  return parsedPosts;
}

/**
 * Recursively walks arbitrary JSON structures to extract Instagram saved post objects
 */
export function extractPostsFromDataObject(data: any): ParsedInstagramPost[] {
  const results: ParsedInstagramPost[] = [];

  function walk(node: any, inheritedCaption: string = '') {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item, inheritedCaption);
      }
      return;
    }

    if (typeof node === 'object') {
      // 1. Standard format: { "title": "...", "string_list_data": [{ "href": "...", "timestamp": ... }] }
      if (Array.isArray(node.string_list_data)) {
        const caption = fixInstagramEncoding(node.title || inheritedCaption);
        for (const entry of node.string_list_data) {
          if (entry && typeof entry.href === 'string' && entry.href.includes('instagram.com')) {
            const shortcode = extractShortcode(entry.href);
            if (shortcode) {
              const savedAt = entry.timestamp 
                ? new Date(entry.timestamp * 1000).toISOString() 
                : new Date().toISOString();
              
              results.push({
                instagram_post_id: shortcode,
                post_url: entry.href,
                caption: caption,
                media_type: detectMediaType(entry.href, caption),
                saved_at: savedAt,
              });
            }
          }
        }
      }

      // 2. Direct href format: { "href": "https://www.instagram.com/p/...", "caption": "..." }
      if (typeof node.href === 'string' && node.href.includes('instagram.com')) {
        const shortcode = extractShortcode(node.href);
        if (shortcode) {
          const caption = fixInstagramEncoding(node.caption || node.title || inheritedCaption);
          const savedAt = node.timestamp 
            ? new Date(typeof node.timestamp === 'number' && node.timestamp < 2000000000 ? node.timestamp * 1000 : node.timestamp).toISOString()
            : new Date().toISOString();

          results.push({
            instagram_post_id: shortcode,
            post_url: node.href,
            caption: caption,
            media_type: detectMediaType(node.href, caption),
            saved_at: savedAt,
          });
        }
      }

      // 3. Nested items in saved_saved_media or media
      const nextCaption = node.title ? fixInstagramEncoding(node.title) : inheritedCaption;
      for (const key of Object.keys(node)) {
        if (['saved_saved_media', 'saved_collections', 'media', 'entries'].includes(key)) {
          walk(node[key], nextCaption);
        } else if (typeof node[key] === 'object') {
          walk(node[key], inheritedCaption);
        }
      }
    }
  }

  walk(data);
  return results;
}
