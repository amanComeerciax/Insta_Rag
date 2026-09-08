import { SavedPost } from '@/types';
import { isGroqConfigured, groqChatCompletion } from './groq';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

/**
 * Assembles all known multimodal information about a post into a unified knowledge string for RAG
 */
export function assemblePostKnowledge(post: SavedPost): string {
  const parts: string[] = [];

  parts.push(`[Post ID: ${post.instagram_post_id}]`);
  parts.push(`Category: ${post.category || 'General'}`);
  parts.push(`Media Type: ${post.media_type}`);
  const slideCount = post.carousel_media_urls && post.carousel_media_urls.length > 0
    ? post.carousel_media_urls.length
    : (post.thumbnail_url ? 1 : 0);
  parts.push(`Total Slides / Images: ${slideCount} ${post.media_type === 'carousel' ? 'slides' : post.media_type === 'reel' ? 'reel video' : 'image'}`);
  parts.push(`Saved Date: ${post.saved_at || post.created_at}`);

  if (post.ai_summary) {
    parts.push(`AI Summary: ${post.ai_summary}`);
  }

  if (post.caption) {
    parts.push(`Caption:\n${post.caption.trim()}`);
  }

  if (post.ocr_text) {
    const cleanOcr = post.ocr_text.trim();
    parts.push(`Visual OCR Text from Post Images:\n${cleanOcr.length > 1200 ? cleanOcr.substring(0, 1200) + '... [truncated]' : cleanOcr}`);
  }

  // Only include extracted_knowledge if it is not a duplicate of ocr_text
  if (post.extracted_knowledge && post.extracted_knowledge.trim() !== post.ocr_text?.trim()) {
    const cleanExtracted = post.extracted_knowledge.trim();
    parts.push(`Extracted Knowledge:\n${cleanExtracted.length > 1000 ? cleanExtracted.substring(0, 1000) + '... [truncated]' : cleanExtracted}`);
  }

  if (post.audio_transcript) {
    parts.push(`Audio Transcript (Reel/Video Speech):\n${post.audio_transcript.trim()}`);
  }

  if (post.code_snippet) {
    if (post.code_snippet.html) {
      parts.push(`Extracted HTML:\n\`\`\`html\n${post.code_snippet.html}\n\`\`\``);
    }
    if (post.code_snippet.css) {
      parts.push(`Extracted CSS:\n\`\`\`css\n${post.code_snippet.css}\n\`\`\``);
    }
    if (post.code_snippet.js) {
      parts.push(`Extracted JavaScript:\n\`\`\`js\n${post.code_snippet.js}\n\`\`\``);
    }
  }

  return parts.join('\n\n');
}

/**
 * Multimodal Deep Visual & OCR Knowledge Extractor
 * Uses Gemini 3.6 Flash Vision to inspect post slides/thumbnails,
 * extracting all visible text, font names, typography, code, or quotes.
 */
export async function extractVisualKnowledgeFromPost(post: SavedPost): Promise<{
  ocr_text: string;
  extracted_knowledge: string;
  code_snippet?: { html?: string; css?: string; js?: string } | null;
}> {
  // If already extracted, return cached
  if (post.ocr_text && post.extracted_knowledge) {
    return {
      ocr_text: post.ocr_text,
      extracted_knowledge: post.extracted_knowledge,
      code_snippet: post.code_snippet,
    };
  }

  const imageUrls: string[] = [];
  if (Array.isArray(post.carousel_media_urls) && post.carousel_media_urls.length > 0) {
    imageUrls.push(...post.carousel_media_urls.slice(0, 8));
  } else if (post.thumbnail_url && post.thumbnail_url.startsWith('http')) {
    imageUrls.push(post.thumbnail_url);
  }

  if (imageUrls.length === 0) {
    return {
      ocr_text: '',
      extracted_knowledge: post.ai_summary || post.caption || '',
    };
  }

  const geminiKey = getGeminiApiKey();
  if (!geminiKey || geminiKey.includes('your_gemini_api_key')) {
    return {
      ocr_text: '',
      extracted_knowledge: post.ai_summary || post.caption || '',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    let model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const parts: any[] = [];
    parts.push({
      text: `You are an elite Multimodal OCR and Knowledge Extraction engine for personal saved Instagram bookmarks.
Extract ALL visible text, font names, recommendations, typography details, steps, code, and key takeaways from all the provided image slides of this Instagram post.
Be very thorough and list slide by slide everything visible on the images (especially font names, pairings, designer tips, code snippets, etc.).

Post Caption: ${post.caption || 'No caption'}
Post Category: ${post.category || 'General'}
Post URL: ${post.post_url}`,
    });

    // Fetch up to 5 images and convert to base64
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      try {
        const resp = await fetch(imageUrls[i], { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: buffer.toString('base64'),
            },
          });
        }
      } catch (fetchErr) {
        console.warn(`[KnowledgeExtractor] Could not fetch image slide ${i + 1}:`, fetchErr);
      }
    }

    if (parts.length <= 1) {
      return {
        ocr_text: '',
        extracted_knowledge: post.ai_summary || post.caption || '',
      };
    }

    // Generate with 8-second timeout
    let ocrText = '';
    try {
      const res = await Promise.race([
        model.generateContent(parts),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini OCR timeout')), 8000)),
      ]);
      ocrText = res.response.text();
    } catch (genErr: any) {
      console.warn('[KnowledgeExtractor] Primary vision model failed, trying fallback:', genErr?.message);
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });
        const res = await Promise.race([
          model.generateContent(parts),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini OCR fallback timeout')), 8000)),
        ]);
        ocrText = res.response.text();
      } catch (fallbackErr: any) {
        console.warn('[KnowledgeExtractor] Vision OCR fallback notice:', fallbackErr?.message);
        ocrText = post.ai_summary || post.caption || '';
      }
    }

    const result = {
      ocr_text: ocrText,
      extracted_knowledge: ocrText,
    };

    // Cache into the post in-memory
    post.ocr_text = ocrText;
    post.extracted_knowledge = ocrText;

    // Cache permanently to local storage
    try {
      const { updateLocalPost } = await import('./localStorage');
      updateLocalPost(post.id, {
        ocr_text: ocrText,
        extracted_knowledge: ocrText,
      });
    } catch (saveErr) {
      console.warn('[KnowledgeExtractor] Error caching OCR to storage:', saveErr);
    }

    return result;
  } catch (err: any) {
    console.error('[KnowledgeExtractor] Gemini Vision OCR failed:', err?.message || err);
    return {
      ocr_text: '',
      extracted_knowledge: post.ai_summary || post.caption || '',
    };
  }
}

export async function extractDeepKnowledge(post: SavedPost) {
  return extractVisualKnowledgeFromPost(post);
}
