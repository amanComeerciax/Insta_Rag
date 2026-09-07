import { NextRequest, NextResponse } from 'next/server';
import { analyzePostWithGemini } from '@/lib/gemini';
import { isGroqConfigured, groqChatCompletion } from '@/lib/groq';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = (body.sessionId || '').trim();
    const threadId = body.threadId ? String(body.threadId).trim() : null;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required.' },
        { status: 400 }
      );
    }

    const cleanSessionId = sessionId.replace(/^sessionid=/i, '').replace(/;.*$/, '').trim();

    // Extract ds_user_id
    let dsUserId = '';
    const match = cleanSessionId.match(/^(\d+)%/);
    if (match && match[1]) {
      dsUserId = match[1];
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cookie': `sessionid=${cleanSessionId}; ${dsUserId ? `ds_user_id=${dsUserId};` : ''}`,
      'X-IG-App-ID': '936619743392459',
      'Accept': '*/*',
      'Referer': 'https://www.instagram.com/direct/inbox/',
      'Sec-Fetch-Site': 'same-origin',
    };

    // Mode 1: Fetch specific conversation messages
    if (threadId) {
      const url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/?limit=40`;
      const res = await fetch(url, { method: 'GET', headers, redirect: 'manual' });

      if (res.status === 301 || res.status === 302 || res.status === 401 || res.status === 403) {
        throw new Error('Invalid or expired sessionid cookie. Please check your session key.');
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch thread messages. HTTP Status ${res.status}`);
      }

      const data = await res.json();
      const thread = data.thread || {};
      const rawItems = thread.items || [];
      const users = thread.users || [];

      // User map for sender names
      const userMap = new Map<string, string>();
      users.forEach((u: any) => {
        userMap.set(String(u.pk || u.id), u.username || u.full_name || 'User');
      });

      const messages = rawItems.map((item: any) => {
        let text = item.text || '';
        if (item.item_type === 'media' && !text) text = '[Shared a Photo/Video]';
        if (item.item_type === 'reel_share' && !text) text = item.reel_share?.text || '[Shared a Reel]';
        if (item.item_type === 'link' && !text) text = item.link?.text || '[Shared a Link]';
        if (item.item_type === 'voice_media' && !text) text = '[Voice Note]';

        const senderId = String(item.user_id);
        const isMe = senderId === dsUserId;
        const senderName = isMe ? 'You' : userMap.get(senderId) || 'Them';

        return {
          id: item.item_id,
          senderId,
          senderName,
          isMe,
          text,
          timestamp: item.timestamp ? new Date(Math.floor(item.timestamp / 1000)).toISOString() : new Date().toISOString(),
          type: item.item_type || 'text',
        };
      }).reverse(); // chronological order

      // Generate AI Summary if messages exist
      let summary = '';
      const conversationText = messages
        .filter((m: any) => m.text && !m.text.startsWith('['))
        .slice(-25)
        .map((m: any) => `${m.senderName}: ${m.text}`)
        .join('\n');

      if (conversationText.length > 30) {
        try {
          if (isGroqConfigured()) {
            const groqRes = await groqChatCompletion(
              [
                {
                  role: 'user',
                  content: `Summarize this recent direct message conversation in 1 short, objective sentence:\n${conversationText}`,
                },
              ],
              { model: 'openai/gpt-oss-120b', maxTokens: 80 }
            );
            summary = groqRes.trim() || '';
          }
        } catch {
          summary = '';
        }

        if (!summary) {
          try {
            const aiRes = await analyzePostWithGemini(conversationText, 'instagram_direct_chat');
            summary = aiRes.summary;
          } catch {
            summary = 'Recent conversation active.';
          }
        }
      }

      return NextResponse.json({
        success: true,
        threadTitle: thread.thread_title || (users[0] ? users[0].username : 'Chat'),
        messages,
        summary,
      });
    }

    // Mode 2: Fetch Inbox Conversations List
    const inboxUrl = 'https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=25';
    const res = await fetch(inboxUrl, { method: 'GET', headers, redirect: 'manual' });

    if (res.status === 301 || res.status === 302 || res.status === 401 || res.status === 403) {
      throw new Error('Invalid or expired sessionid cookie. Please copy a fresh sessionid from Instagram.');
    }

    if (!res.ok) {
      throw new Error(`Instagram returned HTTP status ${res.status}`);
    }

    const data = await res.json();
    const threads = (data.inbox?.threads || []).map((t: any) => {
      const otherUsers = t.users || [];
      const title = t.thread_title || otherUsers.map((u: any) => u.username).join(', ') || 'Conversation';
      const avatar = otherUsers[0]?.profile_pic_url || null;
      const lastItem = t.last_permanent_item || (t.items && t.items[0]) || {};

      let lastMsg = lastItem.text || '';
      if (lastItem.item_type === 'reel_share') lastMsg = 'Shared a reel';
      if (lastItem.item_type === 'media') lastMsg = 'Shared media';

      return {
        threadId: t.thread_id,
        title,
        avatar,
        lastMessage: lastMsg || 'Active chat',
        lastActivityAt: t.last_activity_at
          ? new Date(Math.floor(t.last_activity_at / 1000)).toISOString()
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      threads,
    });
  } catch (err: any) {
    console.error('[API /api/chat] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch Instagram chats.' },
      { status: 500 }
    );
  }
}
