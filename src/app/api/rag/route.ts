import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateEmbedding } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getPostsCollection, isMongoConfigured } from '@/lib/mongodb';
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
    const activePostIds: string[] = Array.isArray(body.activePostIds) ? body.activePostIds : [];

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
    let userPosts: SavedPost[] = [];
    if (isMongoConfigured()) {
      try {
        const postsCol = await getPostsCollection();
        userPosts = (await postsCol.find({ user_id: targetUserId }).toArray()) as SavedPost[];
      } catch {}
    }
    if (userPosts.length === 0) {
      userPosts = getLocalPosts(targetUserId);
    }

    // Identify previously discussed active post(s) in ongoing chat
    const activePosts = activePostIds
      .map((id) => userPosts.find((p) => p.id === id || p.instagram_post_id === id))
      .filter((p): p is SavedPost => Boolean(p));

    // We now rely on LLM to determine if anchoring is needed
    let needsAnchoring = false;

    // 0. SMART QUERY REFORMULATION (Pre-processing)
    let effectiveQuery = query;
    let isGreeting = false;

    const historyText = history.slice(-4).map((h: any) => `${h.role}: ${h.parts?.[0]?.text || ''}`).join('\n');
    const activeContext = activePosts.length > 0 ? `Active Post Context: ${activePosts[0].caption?.slice(0, 100)}` : '';
    
    const reformulatePrompt = `You are a search query optimizer.
User's raw query: "${query}"
History:
${historyText}
${activeContext}

Task:
1. If the user is ONLY saying a conversational greeting or thanks (e.g., "hi", "hello", "thanks", "kaise ho"), output EXACTLY the word "GREETING".
2. If the user is explicitly asking a follow-up question about the Active Post Context or their previous conversation (e.g., "usme kaunse fonts the?", "which fonts in the post", "iska link do"), output the prefix "ANCHOR:" followed by 2-5 optimized keywords (e.g. "ANCHOR: typography fonts").
3. Otherwise (it's a new standalone search like "portfolio regarding post", "show me coffee websites"), output ONLY 3-7 highly optimized English search keywords without any prefix.`;

    try {
      let reformulated = '';
      if (isGroqConfigured()) {
        reformulated = await groqChatCompletion([{ role: 'user', content: reformulatePrompt }], {
          model: 'llama3-8b-8192',
          maxTokens: 30,
        });
      } else {
        const genAI = new GoogleGenerativeAI(getGeminiApiKey());
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(reformulatePrompt);
        reformulated = result.response.text();
      }

      const cleanReformulated = reformulated.trim().replace(/^["']|["']$/g, '');
      if (cleanReformulated.toUpperCase() === 'GREETING') {
        isGreeting = true;
      } else if (cleanReformulated.toUpperCase().startsWith('ANCHOR:')) {
        needsAnchoring = true;
        effectiveQuery = cleanReformulated.replace(/^ANCHOR:\s*/i, '');
      } else if (cleanReformulated.length > 2) {
        effectiveQuery = cleanReformulated;
      }
      console.log(`[RAG] Reformulated query: "${query}" -> "${effectiveQuery}" (Anchoring: ${needsAnchoring})`);
    } catch (err) {
      console.warn('[RAG] Reformulation failed, using raw query:', err);
      effectiveQuery = query;
    }

    // 1. RETRIEVAL: Generate query embedding and find relevant posts
    const queryEmbedding = await generateEmbedding(effectiveQuery);
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

    // If no Supabase posts, or just to combine with keyword boosting, search MongoDB/local storage
    const localMatches = searchLocalPosts(queryEmbedding, effectiveQuery, null, targetUserId, userPosts);
    
    // Merge and deduplicate by highest similarity
    const mergedMap = new Map<string, SavedPost>();
    for (const p of [...relevantPosts, ...localMatches]) {
      const id = p.instagram_post_id || p.id;
      const existing = mergedMap.get(id);
      if (!existing || (p.similarity || 0) > (existing.similarity || 0)) {
        mergedMap.set(id, p);
      }
    }
    relevantPosts = Array.from(mergedMap.values()).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    // Anchoring for Follow-up questions: Ensure the actively discussed post is prioritized
    if (needsAnchoring && activePosts.length > 0) {
      const activeId = activePosts[0].id || activePosts[0].instagram_post_id;
      relevantPosts = [
        activePosts[0],
        ...relevantPosts.filter((p) => p.id !== activeId && p.instagram_post_id !== activeId),
      ];
    }

    // Dynamic Relevance Filtering & Anti-Hallucination:
    let isIrrelevant = false;
    if (!isGreeting && relevantPosts.length > 0) {
      const topScore = relevantPosts[0].similarity || 0;
      if (topScore < 0.25) {
        // Strict threshold: If even the best match is poor, flag as irrelevant
        isIrrelevant = true;
      } else if (topScore >= 0.80) {
        relevantPosts = relevantPosts.filter((p, index) => {
          if (index === 0) return true;
          const score = p.similarity || 0;
          return score >= 0.78 && (topScore - score) <= 0.06;
        });
      }
      relevantPosts = relevantPosts.slice(0, 3);
    } else if (isGreeting) {
      relevantPosts = []; // Skip context for greetings
    } else {
      relevantPosts = userPosts.slice(0, 2);
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
          new Promise((_, reject) => setTimeout(() => reject(new Error('JIT OCR timeout')), 3000)),
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
1. KEEP IT SIMPLE & SHORT:
   - Do NOT write long essays, deep theoretical breakdowns, or walls of text.
   - The user wants a clean, simple, and direct answer that can be understood in 10 seconds.
2. FORMATTING:
   - Use clean bullet points or a small 1-table format.
   - Keep points short (1-2 lines per point).
   - Avoid redundant sub-headings, repeated introductions, or filler text.
   - Do NOT put simple font names or color names inside backtick code blocks unless it is actual programming code.
3. LANGUAGE (DEFAULT: ENGLISH):
   - By default, ALWAYS provide your response and follow-up suggestions in clear, concise, professional English.
   - ONLY if the user explicitly asks their question in Hindi or Hinglish, then match their language and reply in simple, natural Hinglish/Hindi.
   - If the user's prompt is in English, NEVER reply in Hindi or Hinglish.
4. EXACT CONTENT FROM POSTS & OCR:
   - If asked about fonts: List the font names and 1-line simple use-case.
   - If asked about reels/videos: Explain the main point in 2-3 simple bullet points.
   - If asked about code: Provide the clean code snippet with 1 sentence explaining where to paste it.
5. NO INLINE SOURCE CITATIONS & NO HASHTAGS (STRICT RULE):
   - NEVER write "[Source: Post #1]", "[Post #1]", "Source: Post...", or any source citation tags in your answer text.
   - The application automatically displays the relevant source card below your answer, so repeating source tags inside your answer text is strictly forbidden.
   - NEVER include social media hashtags (e.g. #webdesign, #food, #dailyui, #tags). Do not output '#' tags.
   - Keep your response pure, clean, and elegant.
6. ANTI-HALLUCINATION & MISSING CONTEXT:
   - If the user's query asks for something that is CLEARLY NOT in the provided context posts, DO NOT invent an answer. Polite state: "I couldn't find a saved post matching this exactly in your database."
   - ${isIrrelevant ? 'CRITICAL: The search system flagged that the retrieved posts are NOT highly relevant to the query. Politely inform the user that you cannot find exactly what they are looking for, but you can try to help with what you have.' : ''}
7. MULTIMODAL/VIDEO FALLBACK:
   - If the user asks for deep analysis of a Reel or Video, and the provided text context does not contain enough detail to fully describe the visuals, give a high-level summary and explicitly tell the user to watch the original reel via this format: "To see the exact details, please watch the original reel here: [URL]".
8. SUGGESTED NEXT QUESTIONS (SMART FOLLOW-UPS):
   - At the very end of your response, output exactly 3 short, clickable follow-up questions relevant to this answer.
   - Language of suggestions must match the response: English by default; Hinglish only if user asked in Hindi/Hinglish.
   - Format them strictly as:
[SUGGESTIONS]
Suggested question 1
Suggested question 2
Suggested question 3
[/SUGGESTIONS]

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

    // 4. GENERATION: Multi-tier Model Cascade (Groq OSS -> Gemini Flash)
    if (isGroqConfigured()) {
      const groqCandidateModels = ['llama-3.1-70b-versatile', 'llama3-8b-8192', 'mixtral-8x7b-32768'];

      for (const modelName of groqCandidateModels) {
        try {
          console.log(`[RAG] Querying Groq ${modelName}...`);
          const rawAnswer = await groqChatCompletion(chatMessages, {
            model: modelName,
            temperature: 0.3,
            maxTokens: 1000,
          });

          if (rawAnswer) {
            const finalSources = filterSourcesForAnswer(rawAnswer, sources);
            const { cleanText, suggestions } = extractSuggestions(rawAnswer, relevantPosts[0]?.category);
            const answer = cleanAnswerText(cleanText);
            return NextResponse.json({
              answer,
              sources: finalSources,
              suggestions,
              provider: 'groq',
              modelUsed: modelName,
            });
          }
        } catch (groqErr: any) {
          console.warn(`[RAG] Groq model ${modelName} error:`, groqErr?.message);
        }
      }
    }

    // Fallback to Gemini
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
          const rawAnswer = result.response.text();

          if (rawAnswer) {
            const finalSources = filterSourcesForAnswer(rawAnswer, sources);
            const { cleanText, suggestions } = extractSuggestions(rawAnswer, relevantPosts[0]?.category);
            const answer = cleanAnswerText(cleanText);
            return NextResponse.json({
              answer,
              sources: finalSources,
              suggestions,
              provider: 'gemini',
              modelUsed: modelName,
            });
          }
        } catch (geminiErr: any) {
          console.warn(`[RAG] Gemini model ${modelName} error (${geminiErr?.status || geminiErr?.message}), trying next...`);
        }
      }
    }

    return NextResponse.json({
      error: 'AI service is currently busy or undergoing maintenance. Please try again in a few moments.',
    }, { status: 500 });

  } catch (error: any) {
    console.error('[API /api/rag] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error in RAG processing.' },
      { status: 500 }
    );
  }
}

/**
 * Filter sources to strictly the posts that were actually cited by the AI,
 * or the single most relevant post if one post has a commanding lead.
 */
function filterSourcesForAnswer(answer: string, allSources: RAGCitation[]): RAGCitation[] {
  if (!allSources || allSources.length <= 1) return allSources;

  // 1. Detect all explicit citations like [Source: Post #1], [Source: Post #2], Post #1, etc.
  const citedIndices = new Set<number>();
  const citationRegex = /\[Source:\s*Post\s*#?(\d+)\]/gi;
  let match;
  while ((match = citationRegex.exec(answer)) !== null) {
    const idx = parseInt(match[1], 10) - 1;
    if (idx >= 0 && idx < allSources.length) {
      citedIndices.add(idx);
    }
  }

  // Also check for explicit mentions like "Post #1" or "Post #2" in the answer
  if (citedIndices.size === 0) {
    const postMentionRegex = /\bPost\s*#?(\d+)\b/gi;
    while ((match = postMentionRegex.exec(answer)) !== null) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < allSources.length) {
        citedIndices.add(idx);
      }
    }
  }

  // If the AI explicitly referenced specific post(s), ONLY show those cited posts!
  if (citedIndices.size > 0) {
    return allSources.filter((_, idx) => citedIndices.has(idx));
  }

  // 2. If no explicit post index was cited, check if the top post has a high score and clear lead
  const topScore = allSources[0].similarity || 0;
  if (topScore >= 0.80) {
    const filtered = allSources.filter((s, idx) => {
      if (idx === 0) return true;
      return (s.similarity || 0) >= 0.78 && (topScore - (s.similarity || 0)) <= 0.05;
    });
    return filtered.length > 0 ? filtered : [allSources[0]];
  }

  // Fallback: Return at most top 2
  return allSources.slice(0, 2);
}

/**
 * Cleans inline citation tags ([Source: Post #1], [Post #1]), source labels,
 * and social hashtags so the response is clean, elegant, and uncluttered.
 */
function cleanAnswerText(text: string): string {
  if (!text) return '';

  return text
    // Remove bracketed source citations: [Source: Post #1], [Source: Post 1], [Source: ...], [Post #1]
    .replace(/\[Source:\s*[^\]]+\]/gi, '')
    .replace(/\[Post\s*#?\d+\]/gi, '')
    // Remove unbracketed source citations: (Source: Post #1), Source: Post #1
    .replace(/\(?Source:\s*Post\s*#?\d+\)?/gi, '')
    // Remove standalone Post #X references at the end of lines/sentences
    .replace(/(?:[-–—\s]+)?Post\s*#\d+/gi, '')
    // Remove social media hashtags (e.g. #webdesign, #uiux, #eatly, #food, etc.)
    // Matches # followed by word characters, ignoring 3/6-digit hex color codes like #D41B27
    .replace(/(^|\s)#(?!([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b)[a-zA-Z_][a-zA-Z0-9_-]*/g, '$1')
    // Clean up empty parentheses or brackets left behind like () or []
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    // Clean up whitespace before punctuation
    .replace(/[ \t]+([.,;:!])/g, '$1')
    // Remove dangling empty tag headers (e.g. "Tags:", "Hashtags:")
    .replace(/^(?:Tags|Hashtags|Related tags):\s*$/gim, '')
    // Remove double/trailing spaces on each line
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    // Collapse 3+ consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts suggested follow-up questions from AI response ([SUGGESTIONS]...[/SUGGESTIONS])
 * and provides contextual fallbacks if not present.
 */
function extractSuggestions(rawText: string, category?: string): { cleanText: string; suggestions: string[] } {
  let suggestions: string[] = [];
  let cleanText = rawText;

  // 1. Extract [SUGGESTIONS]...[/SUGGESTIONS] block
  const match = rawText.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/i);
  if (match) {
    const lines = match[1]
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => l.length > 0 && l.length < 100);

    if (lines.length > 0) {
      suggestions = lines.slice(0, 3);
    }
    // Strip the block completely from visible text
    cleanText = rawText.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/gi, '').trim();
  }

  // 2. Fallback smart contextual suggestions if AI didn't output [SUGGESTIONS]
  if (suggestions.length === 0) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('design') || cat.includes('typography') || cat.includes('coding') || cat.includes('tech')) {
      suggestions = [
        '💻 Generate CSS and HTML code for this design',
        '🎨 What other similar design posts did I bookmark?',
        '📱 How does the mobile version look?',
      ];
    } else if (cat.includes('recipe') || cat.includes('food') || cat.includes('cooking')) {
      suggestions = [
        '🍲 What are the key ingredients and steps?',
        '🥗 What other food bookmarks do I have saved?',
        '⏱️ How long does this dish take to prepare?',
      ];
    } else {
      suggestions = [
        '🔍 Tell me more details about this bookmark',
        '📌 What other related posts do I have saved?',
        '💡 What is the key takeaway in 2 sentences?',
      ];
    }
  }

  return { cleanText, suggestions };
}

