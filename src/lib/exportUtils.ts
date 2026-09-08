import { RAGCitation } from '@/types';

export interface ExportSourceItem {
  caption?: string | null;
  ai_summary?: string | null;
  url?: string | null;
  post_url?: string | null;
  category?: string | null;
}

export interface ExportMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGCitation[] | ExportSourceItem[];
}

/**
 * Extracts unique hex color codes from text
 */
export function extractColorPalette(text: string): string[] {
  if (!text) return [];

  // Match 3 or 6 character hex codes (e.g. #3B82F6, #1A1A1A, #FFF)
  const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const matches = text.match(hexRegex);
  if (!matches) return [];

  const seen = new Set<string>();
  const palette: string[] = [];

  for (const raw of matches) {
    let hex = raw.toUpperCase();
    // Expand 3-digit hex to 6-digit (e.g. #ABC -> #AABBCC)
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }

    if (!seen.has(hex)) {
      seen.add(hex);
      palette.push(hex);
    }
  }

  return palette;
}

/**
 * Generates Tailwind CSS configuration code for colors
 */
export function generateTailwindConfig(colors: string[], paletteName: string = 'brand'): string {
  if (colors.length === 0) return '';

  const colorEntries = colors
    .map((hex, idx) => {
      const step = (idx + 1) * 100;
      return `        ${step}: '${hex}',`;
    })
    .join('\n');

  return `// Tailwind CSS theme.extend.colors snippet
module.exports = {
  theme: {
    extend: {
      colors: {
        ${paletteName}: {
${colorEntries}
        },
      },
    },
  },
};`;
}

/**
 * Generates CSS Variables (:root) design tokens
 */
export function generateCssVariables(colors: string[]): string {
  if (colors.length === 0) return '';

  const names = ['primary', 'secondary', 'accent', 'neutral', 'surface', 'highlight', 'muted'];
  const varEntries = colors
    .map((hex, idx) => {
      const name = names[idx] || `color-${idx + 1}`;
      return `  --color-${name}: ${hex};`;
    })
    .join('\n');

  return `/* Design Tokens - CSS Variables */
:root {
${varEntries}
}`;
}

/**
 * Generates Figma Design Tokens (Tokens Studio compatible JSON)
 */
export function generateFigmaTokens(colors: string[]): string {
  if (colors.length === 0) return '{}';

  const names = ['primary', 'secondary', 'accent', 'neutral', 'surface', 'highlight', 'muted'];
  const tokenObj: Record<string, { value: string; type: string; description?: string }> = {};

  colors.forEach((hex, idx) => {
    const key = names[idx] || `token-${idx + 1}`;
    tokenObj[key] = {
      value: hex,
      type: 'color',
      description: `Saved from design bookmark #${idx + 1}`,
    };
  });

  return JSON.stringify({ color: tokenObj }, null, 2);
}

/**
 * Triggers an instant client-side file download via Blob
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a full conversation into a clean Markdown document
 */
export function formatConversationAsMarkdown(
  messages: ExportMessage[],
  sessionTitle: string = 'SaveSort AI Conversation'
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let md = `# ${sessionTitle}\n\n`;
  md += `> **Generated on:** ${dateStr} by **SaveSort Google AI Mode**\n\n`;
  md += `---\n\n`;

  messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      md += `### 👤 Question ${Math.ceil((idx + 1) / 2)}\n\n`;
      md += `${msg.content.trim()}\n\n`;
    } else {
      md += `### ✨ Google AI Overview\n\n`;
      md += `${msg.content.trim()}\n\n`;

      if (msg.sources && msg.sources.length > 0) {
        md += `#### 📚 Grounded Sources:\n\n`;
        msg.sources.forEach((s: any, sIdx) => {
          const desc = s.ai_summary || s.caption || 'Saved Instagram bookmark';
          const postUrl = s.post_url || s.url;
          const link = postUrl ? `([View Post](${postUrl}))` : '';
          const cat = s.category ? `\`${s.category}\`` : '';
          md += `${sIdx + 1}. ${cat} ${desc} ${link}\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    }
  });

  return md;
}

/**
 * Formats a single Q&A pair into a Markdown snippet
 */
export function formatSingleMessageAsMarkdown(
  query: string,
  answer: string,
  sources?: RAGCitation[] | ExportSourceItem[]
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let md = `# SaveSort AI Answer\n\n`;
  md += `*Exported on ${dateStr}*\n\n`;
  if (query) {
    md += `### 👤 Question:\n${query.trim()}\n\n`;
  }
  md += `### ✨ Google AI Overview:\n${answer.trim()}\n\n`;

  if (sources && sources.length > 0) {
    md += `### 📚 Grounded Sources:\n\n`;
    sources.forEach((s: any, idx) => {
      const desc = s.ai_summary || s.caption || 'Saved bookmark';
      const postUrl = s.post_url || s.url;
      const link = postUrl ? ` - [Link](${postUrl})` : '';
      md += `${idx + 1}. ${desc}${link}\n`;
    });
    md += `\n`;
  }

  return md;
}

/**
 * Triggers native browser print dialog for PDF export
 */
export function triggerPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
