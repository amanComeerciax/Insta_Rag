import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateEmbedding } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { searchLocalPosts, getLocalPosts } from '@/lib/localStorage';
import { isGroqConfigured, groqChatCompletion } from '@/lib/groq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assemblePostKnowledge, extractVisualKnowledgeFromPost } from '@/lib/knowledgeExtractor';
import { SavedPost, RAGCitation } from '@/types';

export const maxDuration = 60;

function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Determine current user for multi-user isolation
    let userId: string | null = body.userId || null;
    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) userId = clerkAuth.userId;
    } catch {}

    if (!userId) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) userId = user.id;
      } catch {}
    }

    const targetUserId = userId || 'direct_cookie_user';

    // 1. RETRIEVAL: Generate query embedding and find relevant posts
    const queryEmbedding = await generateEmbedding(query);
    let relevantPosts: SavedPost[] = [];

    // Check Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const adminSupabase = createAdminClient();
        const { data: rpcData, error: rpcError } = await adminSupabase.rpc('match_saved_posts', {
          query_embedding: queryEmbedding,
          match_threshold: 0.20,
          match_count: 5,
          filter_category: null,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          relevantPosts = rpcData.filter((p) => p.user_id === targetUserId);
        }
      } catch (err) {
        console.warn('[RAG] Supabase search note:', err);
      }
    }

    // If no Supabase posts, search local storage with strict user isolation
    if (relevantPosts.length === 0) {
      relevantPosts = searchLocalPosts(queryEmbedding, query, null, targetUserId);
    }

    // If query is broad and semantic similarity returned 0, take this user's recent bookmarks
    if (relevantPosts.length === 0) {
      const userPosts = getLocalPosts(targetUserId);
      relevantPosts = userPosts.slice(0, 4);
    } else {
      // Limit to top 4 most relevant
      relevantPosts = relevantPosts.slice(0, 4);
    }

    // 2. JIT MULTIMODAL VISION OCR: Extract text/fonts from image slides if not already indexed (max 1 post, 6s timeout)
    try {
      const targetPost = relevantPosts.find(
        (p) => !p.ocr_text && ((p.carousel_media_urls && p.carousel_media_urls.length > 0) || p.thumbnail_url)
      );
      if (targetPost) {
        console.log(`[RAG] JIT extracting visual OCR for post ${targetPost.instagram_post_id}...`);
        await Promise.race([
          extractVisualKnowledgeFromPost(targetPost),
          new Promise((_, reject) => setTimeout(() => reject(new Error('JIT OCR timeout')), 6000)),
        ]);
      }
    } catch (ocrErr: any) {
      console.warn('[RAG] JIT OCR notice:', ocrErr?.message);
    }

    // 3. AUGMENTATION: Build structured context from retrieved posts
    const sources: RAGCitation[] = relevantPosts.map((post) => ({
      id: post.id,
      instagram_post_id: post.instagram_post_id,
      post_url: post.post_url,
      thumbnail_url: post.thumbnail_url,
      video_url: post.video_url,
      caption: post.caption,
      ai_summary: post.ai_summary,
      category: post.category,
      similarity: post.similarity,
    }));

    const contextSnippets = relevantPosts.map((post, idx) => {
      return `### [Post #${idx + 1}] (Category: ${post.category || 'General'})\n` +
             `URL: ${post.post_url}\n` +
             assemblePostKnowledge(post);
    }).join('\n\n---\n\n');

    const systemPrompt = `You are "SaveSort Copilot", a friendly personal assistant for the user's saved Instagram bookmarks.

CRITICAL INSTRUCTIONS FOR YOUR ANSWERS:
1. KEEP IT SIMPLE & SHORT (बहुत लंबा टेक्स्ट नहीं चाहिए):
   - Do NOT write long essays, deep theoretical breakdowns, or walls of text.
   - The user wants a clean, simple, and direct answer that can be understood in 10 seconds.
2. FORMATTING:
   - Use clean bullet points or a small 1-table format.
   - Keep points short (1-2 lines per point).
   - Avoid redundant sub-headings, repeated introductions, or filler text.
3. LANGUAGE:
   - If the user asks in Hindi or Hinglish, reply in simple, natural Hinglish/Hindi so it's super easy to understand.
4. EXACT CONTENT FROM POSTS & OCR:
   - If asked about fonts: List the font names and 1-line simple use-case.
   - If asked about reels/videos: Explain the main point in 2-3 simple bullet points.
   - If asked about code: Provide the clean code snippet with 1 sentence explaining where to paste it.
5. SOURCE REFERENCE:
   - Mention simply: "[Source: Post #1]" at the relevant point.

=== USER'S RETRIEVED SAVED POSTS ===
${contextSnippets || 'No relevant posts found in the library for this query.'}
=====================================`;

    // Format chat messages
    const chatMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Include recent conversational history (up to last 4 messages to prevent token overflow)
    for (const msg of history.slice(-4)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        chatMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current question
    chatMessages.push({
      role: 'user',
      content: query,
    });

    // 4. GENERATION: Multi-tier Model Cascade (Gemini Flash -> Groq OSS)
    const geminiKey = getGeminiApiKey();
    if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
      const geminiCandidateModels = [
        'gemini-flash-latest',
        'gemini-3.7-flash',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite'
      ];
      const genAI = new GoogleGenerativeAI(geminiKey);

      for (const modelName of geminiCandidateModels) {
        try {
          console.log(`[RAG] Querying Gemini ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
          });

          const formattedHistory = history.slice(-4).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

          const chat = model.startChat({ history: formattedHistory });
          const result = await chat.sendMessage(query);
          const answer = result.response.text();

          if (answer) {
            return NextResponse.json({
              answer,
              sources,
              provider: 'gemini',
              modelUsed: modelName,
            });
          }
        } catch (geminiErr: any) {
          console.warn(`[RAG] Gemini model ${modelName} error (${geminiErr?.status || geminiErr?.message}), trying next...`);
        }
      }
    }

    // Fallback to Groq with supported models
    if (isGroqConfigured()) {
      const groqCandidateModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

      for (const modelName of groqCandidateModels) {
        try {
          console.log(`[RAG] Querying Groq ${modelName}...`);
          const answer = await groqChatCompletion(chatMessages, {
            model: modelName,
            temperature: 0.3,
            maxTokens: 1000,
          });

          if (answer) {
            return NextResponse.json({
              answer,
              sources,
              provider: 'groq',
              modelUsed: modelName,
            });
          }
        } catch (groqErr: any) {
          console.warn(`[RAG] Groq model ${modelName} error:`, groqErr?.message);
        }
      }
    }

    return NextResponse.json({
      error: 'AI service is busy or undergoing maintenance. Please try again in a few moments.',
    }, { status: 500 });

  } catch (error: any) {
    console.error('[API /api/rag] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error in RAG processing.' },
      { status: 500 }
    );
  }
}
