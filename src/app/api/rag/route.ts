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
      relevantPosts = userPosts.slice(0, 5);
    } else {
      // Limit to top 5 most relevant
      relevantPosts = relevantPosts.slice(0, 5);
    }

    // 2. JIT MULTIMODAL VISION OCR: Extract text/fonts from image slides if not already indexed
    await Promise.all(
      relevantPosts.slice(0, 3).map(async (post) => {
        if (
          !post.ocr_text &&
          ((post.carousel_media_urls && post.carousel_media_urls.length > 0) || post.thumbnail_url)
        ) {
          try {
            console.log(`[RAG] JIT extracting visual OCR for post ${post.instagram_post_id}...`);
            await extractVisualKnowledgeFromPost(post);
          } catch (ocrErr) {
            console.warn(`[RAG] JIT OCR extraction failed for post ${post.instagram_post_id}:`, ocrErr);
          }
        }
      })
    );

    // 3. AUGMENTATION: Build structured context from retrieved posts
    const sources: RAGCitation[] = relevantPosts.map((post) => ({
      id: post.id,
      instagram_post_id: post.instagram_post_id,
      post_url: post.post_url,
      thumbnail_url: post.thumbnail_url,
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

    const systemPrompt = `You are "SaveSort Copilot", an elite multimodal AI knowledge assistant for the user's personal Instagram bookmarks and saved posts.
The user has indexed their bookmarks permanently into this system so they no longer need to depend on Instagram.

You have access to the following retrieved bookmarks from the user's saved library:

=== USER'S RETRIEVED SAVED POSTS ===
${contextSnippets || 'No relevant posts found in the library for this query.'}
=====================================

Guidelines for your response:
1. Answer directly, concisely, and helpfully using the information in the retrieved posts.
2. If the user asks in Hindi or Hinglish (e.g. "Maine fonts ke baare me kya save kiya tha?"), reply naturally in the same language or friendly Hinglish.
3. If the user asks for code, CSS, HTML, or animations, output the complete, clean, working code block with syntax highlighting (\`\`\`css, \`\`\`html, etc.).
4. If the user asks about typography or font pairings, list the exact font combinations, weights, and recommendations mentioned in the posts.
5. Reference which post provided the information (e.g., "[Source: Post #1]" or mention the creator/account).
6. If the user's query cannot be answered by any of their saved posts, politely let them know that you searched their saved posts and couldn't find a match, but offer a helpful general tip.
7. Format with clean markdown headers, bold text, bullet points, and code blocks for maximum readability.
8. You have direct access to multimodal visual OCR extracted from the images and carousel slides under "Visual OCR Text from Post Images". When the user asks about fonts, text, recipes, code, or details visible on the images, quote the exact font names, sizes, and content directly from that section. Never state that you cannot read images or that OCR is missing when visual OCR text is provided.`;

    // Format chat messages
    const chatMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Include recent conversational history (up to last 6 messages)
    for (const msg of history.slice(-6)) {
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

    // 4. GENERATION: Gemini 3.6 Flash (Primary with 1M token window) -> Groq (Fallback)
    const geminiKey = getGeminiApiKey();
    if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
      try {
        console.log('[RAG] Querying Gemini gemini-3.6-flash...');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.6-flash',
          systemInstruction: systemPrompt,
        });

        const formattedHistory = history.slice(-6).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(query);
        const answer = result.response.text();

        return NextResponse.json({
          answer,
          sources,
          provider: 'gemini',
          modelUsed: 'gemini-3.6-flash',
        });
      } catch (geminiErr: any) {
        console.warn('[RAG] Gemini error, falling back to Groq:', geminiErr?.message);
      }
    }

    // Fallback to Groq
    if (isGroqConfigured()) {
      try {
        console.log('[RAG] Fallback to Groq...');
        const answer = await groqChatCompletion(chatMessages, {
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          maxTokens: 1500,
        });

        if (answer) {
          return NextResponse.json({
            answer,
            sources,
            provider: 'groq',
            modelUsed: 'llama-3.3-70b-versatile',
          });
        }
      } catch (groqErr: any) {
        console.error('[RAG] Groq fallback error:', groqErr?.message);
      }
    }

    return NextResponse.json({
      error: 'No AI provider (Groq or Gemini) is available.',
    }, { status: 500 });

  } catch (error: any) {
    console.error('[API /api/rag] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error in RAG processing.' },
      { status: 500 }
    );
  }
}
