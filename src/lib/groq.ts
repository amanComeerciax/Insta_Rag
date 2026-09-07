import { AICategorizationResult } from '@/types';

function getGroqApiKey(): string {
  return process.env.GROQ_API_KEY || '';
}

export function isGroqConfigured(): boolean {
  const key = getGroqApiKey();
  return Boolean(key && key.startsWith('gsk_'));
}

/**
 * Fast chat completion via Groq API
 */
export async function groqChatCompletion(
  messages: any[],
  options: {
    model?: string;
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
  } = {}
) {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY not configured.');

  const model = options.model || 'openai/gpt-oss-120b';

  const body: any = {
    model,
    messages,
    temperature: options.temperature ?? 0.2,
  };

  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  if (options.maxTokens) {
    body.max_completion_tokens = options.maxTokens;
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Deep Post Analysis using Groq (Primary)
 */
export async function analyzePostWithGroq(
  caption: string,
  postUrl?: string
): Promise<AICategorizationResult> {
  const prompt = `You are an elite AI assistant organizing a user's Instagram saved posts.
Analyze the following Instagram post and return a JSON object with:
- "summary": A concise, useful 1-sentence summary of what this post is about (maximum 20 words).
- "category": Choose the single most fitting category from: [Design & Typography, Coding & Tech, Recipes & Cooking, Fitness & Health, Business & Marketing, Travel & Architecture, Fashion & Style, Productivity & Books, General].
- "tags": An array of 3-5 relevant lowercase search keywords/tags.

Post details:
URL: ${postUrl || ''}
Caption: "${caption || 'No caption available'}"

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "category": "...",
  "tags": ["tag1", "tag2"]
}`;

  const content = await groqChatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'openai/gpt-oss-120b', jsonMode: true, temperature: 0.2 }
  );

  const parsed = JSON.parse(content);
  return {
    summary: parsed.summary || 'Instagram saved post bookmark.',
    category: parsed.category || 'General',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

/**
 * Vision Code & CSS extraction using Groq Qwen Vision (Primary)
 */
export async function extractCodeWithGroq(
  caption: string,
  imageUrls: string[],
  postUrl?: string
) {
  const contentItems: any[] = [];

  // Add instruction prompt
  contentItems.push({
    type: 'text',
    text: `You are an elite frontend engineer and code extraction specialist.
Analyze this Instagram post. Inspect the attached images thoroughly:
1. If there is code visible in the image (or in the caption), extract it accurately, fix any typos or truncation, and provide the complete, functional code.
2. If there is a UI design, animation, component, or layout shown in the image, write the exact production-ready HTML and modern CSS to recreate it faithfully.
3. If this post is not primarily about code, generate a modern, beautiful web component representing the theme/idea described in the post.

Caption: "${caption || 'No caption available'}"
Post URL: ${postUrl || ''}

Respond ONLY with valid JSON in this exact structure:
{
  "explanation": "Brief 1-2 sentence overview of the component/code and how to use it.",
  "html": "<!-- Clean HTML structure -->",
  "css": "/* Complete modern CSS including animations and layout */",
  "javascript": "// Any interactive JS code (or empty string if pure CSS)"
}`,
  });

  // Attach up to 3 image URLs for vision inspection
  for (const imgUrl of imageUrls.slice(0, 3)) {
    if (imgUrl && imgUrl.startsWith('http')) {
      contentItems.push({
        type: 'image_url',
        image_url: { url: imgUrl },
      });
    }
  }

  const content = await groqChatCompletion(
    [{ role: 'user', content: contentItems }],
    { model: 'qwen/qwen3.8-27b', jsonMode: true, temperature: 0.2 }
  );

  return JSON.parse(content);
}
