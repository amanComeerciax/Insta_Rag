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
  parts.push(`Saved Date: ${post.saved_at || post.created_at}`);

  if (post.ai_summary) {
    parts.push(`AI Summary: ${post.ai_summary}`);
  }

  if (post.caption) {
    parts.push(`Caption:\n${post.caption.trim()}`);
  }

  if (post.ocr_text) {
    parts.push(`Visual OCR Text from Post Images:\n${post.ocr_text.trim()}`);
  }

  if (post.extracted_knowledge) {
    parts.push(`Extracted Deep Knowledge:\n${post.extracted_knowledge.trim()}`);
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
 * Multimodal Deep Knowledge Extractor
 * Uses Groq Vision (Primary) or Gemini Vision (Fallback) to inspect post slides/thumbnails
 * and extract actionable knowledge, fonts, code, or quotes.
 */
export async function extractDeepKnowledge(post: SavedPost): Promise<{
  extracted_knowledge: string;
  code_snippet?: { html?: string; css?: string; js?: string };
}> {
  const imageUrls: string[] = [];
  if (Array.isArray(post.carousel_media_urls) && post.carousel_media_urls.length > 0) {
    imageUrls.push(...post.carousel_media_urls.slice(0, 4));
  } else if (post.thumbnail_url && post.thumbnail_url.startsWith('http')) {
    imageUrls.push(post.thumbnail_url);
  }

  // 1. PRIMARY: Groq Qwen Vision or gpt-oss-120b
  if (isGroqConfigured()) {
    try {
      const contentItems: any[] = [];
      contentItems.push({
        type: 'text',
        text: `You are an elite knowledge extraction engine for personal bookmarks.
Analyze this Instagram post and extract ALL actionable knowledge so the user can search and use it permanently without needing Instagram.
Extract:
1. All key topics, facts, tips, steps, recipe ingredients, font names, or book recommendations.
2. If code, HTML, CSS, or UI animations are shown, extract or generate the complete working code.
3. Transcribe visible text on the image slides faithfully.

Caption: "${post.caption || 'No caption available'}"
Category: "${post.category || 'General'}"
URL: "${post.post_url}"

Respond ONLY with valid JSON in this exact structure:
{
  "extracted_knowledge": "Comprehensive, structured summary and key takeaways (bullet points, font pairings, tips, or steps).",
  "html": "<!-- Complete HTML if applicable or empty string -->",
  "css": "/* Complete CSS if applicable or empty string */",
  "js": "// JavaScript if applicable or empty string"
}`,
      });

      for (const imgUrl of imageUrls.slice(0, 3)) {
        if (imgUrl && imgUrl.startsWith('http')) {
          contentItems.push({
            type: 'image_url',
            image_url: { url: imgUrl },
          });
        }
      }

      const model = imageUrls.length > 0 ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b';
      const resultStr = await groqChatCompletion(
        [{ role: 'user', content: contentItems }],
        { model, jsonMode: true, temperature: 0.2 }
      );

      const parsed = JSON.parse(resultStr);
      const codeSnippet = (parsed.html || parsed.css || parsed.js) ? {
        html: parsed.html || '',
        css: parsed.css || '',
        js: parsed.js || '',
      } : undefined;

      return {
        extracted_knowledge: parsed.extracted_knowledge || post.ai_summary || post.caption || '',
        code_snippet: codeSnippet,
      };
    } catch (err) {
      console.warn('[KnowledgeExtractor] Groq failed, falling back to Gemini:', err);
    }
  }

  // 2. FALLBACK: Google Gemini Vision
  const geminiKey = getGeminiApiKey();
  if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });

      const prompt = `Analyze this Instagram post and extract ALL actionable knowledge for personal RAG search:
Caption: "${post.caption || 'No caption'}"
Category: "${post.category || 'General'}"

Return JSON:
{
  "extracted_knowledge": "Detailed key facts, font names, steps, or code tips.",
  "html": "",
  "css": "",
  "js": ""
}`;

      const res = await model.generateContent(prompt);
      const parsed = JSON.parse(res.response.text());
      return {
        extracted_knowledge: parsed.extracted_knowledge || post.ai_summary || post.caption || '',
        code_snippet: (parsed.html || parsed.css) ? { html: parsed.html, css: parsed.css, js: parsed.js } : undefined,
      };
    } catch (err) {
      console.warn('[KnowledgeExtractor] Gemini fallback error:', err);
    }
  }

  // Heuristic fallback
  return {
    extracted_knowledge: post.ai_summary || post.caption || 'Saved bookmark knowledge.',
  };
}
