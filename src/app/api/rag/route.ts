import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { searchLocalPosts, getLocalPosts } from '@/lib/localStorage';
import { isGroqConfigured, groqChatCompletion } from '@/lib/groq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assemblePostKnowledge } from '@/lib/knowledgeExtractor';
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
    let userId: string | null = null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {}

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
          relevantPosts = rpcData;
          if (userId) {
            relevantPosts = relevantPosts.filter((p) => p.user_id === userId);
          }
        }
      } catch (err) {
        console.warn('[RAG] Supabase search note:', err);
      }
    }

    // If no Supabase posts, search local storage with user isolation
    if (relevantPosts.length === 0) {
      // First try matching for user's specific userId
      relevantPosts = searchLocalPosts(queryEmbedding, query, null, userId);

      // If user is guest/cookie user and no direct matches with userId, search all local posts
      if (relevantPosts.length === 0) {
        relevantPosts = searchLocalPosts(queryEmbedding, query, null, null);
      }
    }

    // If query is broad (e.g. "what did I save", "tell me about my posts") and semantic similarity returned 0,
    // fallback to taking the most recent bookmarks as general context
    if (relevantPosts.length === 0) {
      const allPosts = getLocalPosts();
      relevantPosts = (userId ? allPosts.filter((p) => p.user_id === userId) : allPosts).slice(0, 5);
    } else {
      // Limit to top 5 most relevant
      relevantPosts = relevantPosts.slice(0, 5);
    }

    // 2. AUGMENTATION: Build structured context from retrieved posts
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
7. Format with clean markdown headers, bold text, bullet points, and code blocks for maximum readability.`;

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

    // 3. GENERATION: Groq (Primary) -> Gemini (Fallback)
    if (isGroqConfigured()) {
      try {
        console.log('[RAG] Querying Groq openai/gpt-oss-120b...');
        const answer = await groqChatCompletion(chatMessages, {
          model: 'openai/gpt-oss-120b',
          temperature: 0.3,
          maxTokens: 1500,
        });

        if (answer) {
          return NextResponse.json({
            answer,
            sources,
            provider: 'groq',
            modelUsed: 'openai/gpt-oss-120b',
          });
        }
      } catch (groqErr: any) {
        console.warn('[RAG] Groq error, falling back to Gemini:', groqErr?.message);
      }
    }

    // Fallback to Gemini
    const geminiKey = getGeminiApiKey();
    if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
      try {
        console.log('[RAG] Fallback to Gemini gemini-3.6-flash...');
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
        console.error('[RAG] Gemini fallback error:', geminiErr);
        return NextResponse.json({
          error: geminiErr?.message || 'Failed to generate answer from saved posts.',
        }, { status: 500 });
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
