import { GoogleGenerativeAI } from '@google/generative-ai';
import { AICategorizationResult } from '@/types';

// Default categories to guide Gemini, while allowing dynamic discovery
export const STANDARD_CATEGORIES = [
  'Recipes & Cooking',
  'Design & Typography',
  'Coding & Tech',
  'Fitness & Health',
  'Travel & Architecture',
  'Business & Marketing',
  'Fashion & Style',
  'Productivity & Books',
  'Humor & Memes',
  'Art & Photography',
  'Finance & Investing',
  'General',
];

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

/**
 * Categorize a single post and produce a 1-sentence summary using Gemini 2.5 Flash
 */
export async function analyzePostWithGemini(caption: string, postUrl: string): Promise<AICategorizationResult> {
  const apiKey = getApiKey();

  // If no Gemini API key configured, use intelligent rule-based heuristic fallback
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    return generateFallbackAnalysis(caption);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = `You are an AI assistant organizing a user's Instagram saved posts.
Analyze the following Instagram post and return a JSON object with:
- "summary": A concise, useful 1-sentence summary of what this post is about (maximum 20 words).
- "category": Choose the single most fitting category from this list, or create a short 2-3 word category if none fits: [${STANDARD_CATEGORIES.join(', ')}].
- "tags": An array of 3-5 relevant lowercase search keywords/tags.

Post details:
URL: ${postUrl}
Caption: "${caption || 'No caption available'}"

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "...",
  "category": "...",
  "tags": ["tag1", "tag2"]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      summary: parsed.summary || 'Instagram saved post bookmark.',
      category: parsed.category || 'General',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (error: any) {
    console.warn(`[Gemini Flash] Error analyzing post (${postUrl}):`, error?.message || error);
    // Graceful fallback to maintain ingestion flow even if quota/network error occurs
    return generateFallbackAnalysis(caption);
  }
}

/**
 * Generate vector embedding for semantic search using text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.includes('your_gemini_api_key') || !text?.trim()) {
    return generateDeterministicMockVector(text || 'instagram');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    const result = await model.embedContent(text.slice(0, 2048));
    if (result.embedding?.values) {
      return result.embedding.values;
    }
    return generateDeterministicMockVector(text);
  } catch (error: any) {
    console.warn('[Gemini Embeddings] Error generating embedding:', error?.message || error);
    return generateDeterministicMockVector(text);
  }
}

/**
 * Delay helper for rate limiting free-tier requests
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Intelligent keyword/heuristic fallback when Gemini API key is absent or hits rate limit
 */
export function generateFallbackAnalysis(caption: string): AICategorizationResult {
  const text = (caption || '').toLowerCase();
  let category = 'General';
  let summary = caption 
    ? caption.slice(0, 90) + (caption.length > 90 ? '...' : '') 
    : 'Saved Instagram post.';

  if (text.match(/recipe|cook|bake|pasta|cake|food|ingredient|kitchen|dinner|breakfast/)) {
    category = 'Recipes & Cooking';
    summary = summary || 'Delicious recipe and culinary inspiration.';
  } else if (text.match(/font|typography|typeface|graphic|figma|branding|palette|logo|ui|ux/)) {
    category = 'Design & Typography';
    summary = summary || 'Visual design, font pairing, and creative ideas.';
  } else if (text.match(/code|software|developer|python|javascript|react|ai|tech|prompt|api/)) {
    category = 'Coding & Tech';
    summary = summary || 'Software engineering tutorial and tech insights.';
  } else if (text.match(/workout|gym|fitness|muscle|protein|exercise|cardio|running|stretch/)) {
    category = 'Fitness & Health';
    summary = summary || 'Fitness workout routine and physical training tips.';
  } else if (text.match(/travel|hotel|flight|japan|italy|beach|explore|passport|trip|vacation/)) {
    category = 'Travel & Architecture';
    summary = summary || 'Travel destination ideas and scenic architecture.';
  } else if (text.match(/business|marketing|startup|money|sales|growth|strategy|founder/)) {
    category = 'Business & Marketing';
    summary = summary || 'Actionable business strategy and marketing advice.';
  } else if (text.match(/outfit|style|fashion|clothing|wear|vintage|aesthetic|dior|zara/)) {
    category = 'Fashion & Style';
    summary = summary || 'Fashion aesthetics and outfit styling inspiration.';
  } else if (text.match(/book|habit|mindset|focus|productivity|routine|reading|notion/)) {
    category = 'Productivity & Books';
    summary = summary || 'Productivity hacks and personal growth recommendations.';
  } else if (text.match(/meme|funny|lol|humor|joke|laugh|relatable/)) {
    category = 'Humor & Memes';
    summary = summary || 'Humorous meme and lighthearted entertainment.';
  }

  return {
    summary,
    category,
    tags: [category.toLowerCase().split(' ')[0], 'saved', 'instagram'],
  };
}

/**
 * Deterministic pseudo-vector generator (768 dimensions) for test/demo environments
 */
export function generateDeterministicMockVector(text: string): number[] {
  const vector: number[] = new Array(768).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < 768; i++) {
    const val = Math.sin(hash + i * 0.31415) * Math.cos(i * 0.17);
    vector[i] = Math.round(val * 10000) / 10000;
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((v) => v / magnitude);
}
