'use client';

import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Strip any inline source tags, post references, and hashtag clutter so user gets clean, readable text
  const cleanedContent = (content || '')
    .replace(/\[Source:\s*[^\]]+\]/gi, '')
    .replace(/\[Post\s*#?\d+\]/gi, '')
    .replace(/\(?Source:\s*Post\s*#?\d+\)?/gi, '')
    .replace(/(?:[-–—\s]+)?Post\s*#\d+/gi, '')
    .replace(/(^|\s)#(?!([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b)[a-zA-Z_][a-zA-Z0-9_-]*/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/^(?:Tags|Hashtags|Related tags):\s*$/gim, '');

  // Split content by code blocks ```lang ... ```
  const parts: React.ReactNode[] = [];
  const lines = cleanedContent.split('\n');

  let inCodeBlock = false;
  let codeLanguage = '';
  let codeBuffer: string[] = [];
  let textBuffer: string[] = [];

  const flushTextBuffer = (keyPrefix: string) => {
    if (textBuffer.length === 0) return;
    const textBlock = textBuffer.join('\n');
    parts.push(
      <RenderTextBlock key={`${keyPrefix}-${parts.length}`} text={textBlock} />
    );
    textBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Start code block
        flushTextBuffer('pre-code');
        inCodeBlock = true;
        codeLanguage = line.trim().replace(/^```/, '').trim() || 'code';
        codeBuffer = [];
      } else {
        // End code block
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n');
        parts.push(
          <CodeBlock
            key={`code-${parts.length}`}
            code={codeText}
            language={codeLanguage}
          />
        );
        codeBuffer = [];
        codeLanguage = '';
      }
    } else if (inCodeBlock) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  // Flush remaining buffers
  if (inCodeBlock && codeBuffer.length > 0) {
    parts.push(
      <CodeBlock
        key={`code-final-${parts.length}`}
        code={codeBuffer.join('\n')}
        language={codeLanguage}
      />
    );
  } else if (textBuffer.length > 0) {
    flushTextBuffer('final');
  }

  return <div className="space-y-3 text-sm leading-relaxed text-neutral-200">{parts}</div>;
}

/**
 * Interactive Code Block with Copy & Syntax Header
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-lg">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/90 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2 text-neutral-400 font-mono font-medium uppercase tracking-wider">
          <Code className="w-3.5 h-3.5 text-neutral-400" />
          <span>{language || 'CODE'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-neutral-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-neutral-100 selection:bg-neutral-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Text Block Renderer (all headings # to ######, bold, italic, middle dots, lists, tables, quotes)
 */
function RenderTextBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let tableLines: string[] = [];

  const flushTable = (key: string) => {
    if (tableLines.length === 0) return;
    elements.push(<RenderTable key={key} lines={[...tableLines]} />);
    tableLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table detection: starts and ends with '|' or contains multiple '|'
    if (trimmed.startsWith('|') && (trimmed.endsWith('|') || trimmed.split('|').length >= 3)) {
      tableLines.push(trimmed);
      continue;
    } else if (tableLines.length > 0) {
      flushTable(`table-${i}`);
    }

    if (!trimmed) {
      // Empty line spacing
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    // 1. Headings (from # to ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h2 key={`h1-${i}`} className="text-xl font-extrabold text-white mt-5 mb-2.5 tracking-tight border-b border-neutral-800 pb-2">
            {formatInline(headingText)}
          </h2>
        );
      } else if (level === 2) {
        elements.push(
          <h3 key={`h2-${i}`} className="text-lg font-bold text-white mt-4 mb-2 tracking-tight border-b border-neutral-800/80 pb-1.5">
            {formatInline(headingText)}
          </h3>
        );
      } else if (level === 3) {
        elements.push(
          <h4 key={`h3-${i}`} className="text-base font-semibold text-white mt-3.5 mb-1.5 tracking-tight">
            {formatInline(headingText)}
          </h4>
        );
      } else if (level === 4) {
        elements.push(
          <h5 key={`h4-${i}`} className="text-sm font-semibold text-white mt-3 mb-1 tracking-tight text-neutral-100">
            {formatInline(headingText)}
          </h5>
        );
      } else if (level === 5) {
        elements.push(
          <h6 key={`h5-${i}`} className="text-xs font-semibold text-neutral-300 mt-2.5 mb-1 uppercase tracking-wider">
            {formatInline(headingText)}
          </h6>
        );
      } else {
        elements.push(
          <h6 key={`h6-${i}`} className="text-xs font-medium text-neutral-400 mt-2 mb-1">
            {formatInline(headingText)}
          </h6>
        );
      }
      continue;
    }

    // 2. Horizontal Rule (--- or *** or ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${i}`} className="my-3.5 border-neutral-800/90" />);
      continue;
    }

    // 3. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-neutral-500 pl-3.5 py-1.5 my-2 text-neutral-300 italic text-xs bg-neutral-900/40 rounded-r-lg"
        >
          {formatInline(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      continue;
    }

    // 4. Bullet lists, middle dots (·), checkboxes, or numbered lists
    const listMatch = rawLine.match(/^(\s*)([-*+•·▪▫○]|\d+\.|\(\d+\)|\d+\))\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const marker = listMatch[2];
      const itemText = listMatch[3];
      const isNumbered = /^\d+\.|\(\d+\)|\d+\)/.test(marker);
      const indentClass = indent >= 4 ? 'pl-8' : indent >= 2 ? 'pl-4' : 'pl-1';

      elements.push(
        <div key={`li-${i}`} className={`flex items-start gap-2 my-1 ${indentClass}`}>
          {isNumbered ? (
            <span className="text-neutral-400 font-mono text-xs select-none min-w-[1.25rem]">
              {marker}
            </span>
          ) : (
            <span className="text-neutral-500 text-xs mt-0.5 select-none">•</span>
          )}
          <div className="flex-1 text-sm text-neutral-200 leading-relaxed">
            {formatInline(itemText)}
          </div>
        </div>
      );
      continue;
    }

    // 5. Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 leading-relaxed text-sm text-neutral-200">
        {formatInline(trimmed)}
      </p>
    );
  }

  if (tableLines.length > 0) {
    flushTable(`table-end`);
  }

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Formats inline elements:
 * - Code: `code`
 * - Bold + Italic: ***text***
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Strikethrough: ~~text~~
 * - Links: [title](url)
 * - Source citations: [Source: Post #4]
 * - Mentions: @username
 */
function formatInline(text: string): React.ReactNode {
  // Regex splits on: inline code, bold-italic, bold, italic, strikethrough, sources, links, mentions
  const INLINE_REGEX = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*|~~[^~]+~~|\[Source:\s*[^\]]+\]|\[Post\s*#[^\]]+\]|\[[^\]]+\]\([^)]+\)|@[a-zA-Z0-9_.-]+)/g;
  const parts = text.split(INLINE_REGEX);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code `...`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded bg-neutral-900 text-neutral-200 border border-neutral-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold + Italic ***...***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={index} className="font-semibold text-white">
          <em className="italic">{part.slice(3, -3)}</em>
        </strong>
      );
    }

    // Bold **...**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *...*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-neutral-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough ~~...~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through text-neutral-500">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Source Citation badges: [Source: Post #4] or [Post #1] (suppressed to keep text clean)
    if (part.startsWith('[Source:') || part.match(/^\[Post\s*#[^\]]+\]$/)) {
      return null;
    }

    // Mention @username
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-mono font-medium bg-neutral-900/90 text-neutral-300 border border-neutral-800"
        >
          {part}
        </span>
      );
    }

    // Markdown Link [title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline decoration-neutral-600 underline-offset-2 hover:decoration-white transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

/**
 * Minimalist, Responsive Markdown Table with full formatting & alignment
 */
function RenderTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  // Filter divider line and parse cells
  const filtered = lines.filter((l) => !l.match(/^\|?\s*[-:]+[-| :]*\|?$/));

  const rows = filtered.map((line) => {
    let clean = line.trim();
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map((c) => c.trim());
  });

  if (rows.length === 0) return null;
  const [header, ...bodyRows] = rows;

  return (
    <div className="my-3.5 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-neutral-900/90 border-b border-neutral-800 text-white font-semibold">
          <tr>
            {header.map((col, idx) => (
              <th
                key={idx}
                className="px-3.5 py-2.5 border-r border-neutral-800/80 last:border-r-0 tracking-wide text-neutral-200"
              >
                {formatInline(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/70 bg-neutral-950/60">
          {bodyRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-neutral-900/50 transition-colors odd:bg-neutral-950 even:bg-neutral-900/20"
            >
              {row.map((cell, colIdx) => (
                <td
                  key={colIdx}
                  className="px-3.5 py-2.5 border-r border-neutral-800/70 last:border-r-0 text-neutral-300 leading-normal"
                >
                  {formatInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
