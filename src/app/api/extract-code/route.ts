import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isGroqConfigured, extractCodeWithGroq } from '@/lib/groq';

export const maxDuration = 60;

function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

const GEMINI_CANDIDATE_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caption, thumbnailUrl, postUrl, imageUrls } = body;

    const targetUrls: string[] = [];
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      targetUrls.push(...imageUrls.slice(0, 5));
    } else if (thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('http')) {
      targetUrls.push(thumbnailUrl);
    }

    // 1. PRIMARY PROVIDER: Groq Qwen Vision (Ultra-fast, generous free tier)
    if (isGroqConfigured()) {
      try {
        console.log('[Extract Code] Attempting primary provider: Groq Qwen Vision...');
        const groqResult = await extractCodeWithGroq(caption || '', targetUrls, postUrl);

        if (groqResult && (groqResult.html || groqResult.css)) {
          return NextResponse.json({
            success: true,
            provider: 'groq',
            explanation: groqResult.explanation || 'Extracted component code.',
            html: groqResult.html || '',
            css: groqResult.css || '',
            javascript: groqResult.javascript || '',
          });
        }
      } catch (groqErr: any) {
        console.warn('[Extract Code] Groq primary encountered error, falling back to Gemini:', groqErr?.message);
      }
    }

    // 2. FALLBACK PROVIDER: Google Gemini Vision
    const geminiKey = getGeminiApiKey();
    if (!geminiKey || geminiKey.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { error: 'AI API keys (Groq / Gemini) are not configured.' },
        { status: 400 }
      );
    }

    console.log('[Extract Code] Attempting fallback provider: Google Gemini Vision...');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const parts: any[] = [];

    // Fetch and encode images for Gemini
    for (const imgUrl of targetUrls) {
      try {
        const imageRes = await fetch(imgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });

        if (imageRes.ok) {
          const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await imageRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: contentType.split(';')[0],
            },
          });
        }
      } catch (imgErr) {
        console.warn('[Extract Code] Gemini image fetch note:', imgErr);
      }
    }

    const promptText = `You are an elite frontend engineer and code extraction specialist.
Analyze this Instagram post. Inspect the images thoroughly with Vision:
1. If there is code visible in the image (or in the caption), extract it accurately, fix any typos or truncation, and provide the complete, functional code.
2. If there is a UI design, animation (e.g. melting effect, 3D card, glowing button, typography pairing, navigation bar), write the exact production-ready HTML and modern CSS to recreate it faithfully.
3. If this post is not primarily about code, generate a modern, beautiful web component representing the theme/idea described in the post.

Caption: "${caption || 'No caption available'}"
Post URL: ${postUrl || ''}

Respond ONLY with valid JSON in this exact structure:
{
  "explanation": "Brief 1-2 sentence overview of the component/code and how to use it.",
  "html": "<!-- Clean HTML structure -->",
  "css": "/* Complete modern CSS including animations and layout */",
  "javascript": "// Any interactive JS code (or empty string if pure CSS)"
}`;

    parts.push(promptText);

    let lastError: any = null;

    for (const modelName of GEMINI_CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const result = await model.generateContent(parts);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        return NextResponse.json({
          success: true,
          provider: 'gemini',
          modelUsed: modelName,
          explanation: parsed.explanation || 'Extracted component code.',
          html: parsed.html || '',
          css: parsed.css || '',
          javascript: parsed.javascript || '',
        });
      } catch (geminiModelErr: any) {
        lastError = geminiModelErr;
        continue;
      }
    }

    const errMsg = lastError?.message || '';
    if (errMsg.includes('429') || errMsg.includes('quota')) {
      return NextResponse.json(
        {
          error:
            'Free Tier limit reached. Please wait 15-20 seconds and click again!',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: errMsg || 'Failed to extract code from post.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[API /api/extract-code] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to extract code from post.' },
      { status: 500 }
    );
  }
}
