'use client';

import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Split content by code blocks ```lang ... ```
  const parts: React.ReactNode[] = [];
  const lines = content.split('\n');

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
 * Text Block Renderer (headings, bold, lists, tables, quotes)
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
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
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

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-semibold text-white mt-3 mb-1 tracking-tight">
          {formatInline(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-white mt-4 mb-2 tracking-tight border-b border-neutral-800/80 pb-1">
          {formatInline(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-extrabold text-white mt-5 mb-2 tracking-tight">
          {formatInline(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
    } else if (trimmed.startsWith('---')) {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-neutral-800" />);
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-neutral-600 pl-3 my-2 text-neutral-300 italic text-xs bg-neutral-900/40 py-1 rounded-r"
        >
          {formatInline(trimmed.replace(/^>\s+/, ''))}
        </blockquote>
      );
    } else if (trimmed.match(/^[-*•]\s+/)) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 pl-1 my-0.5">
          <span className="text-neutral-500 mt-1 select-none">•</span>
          <span className="flex-1">{formatInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
        </div>
      );
    } else if (trimmed.match(/^\d+\.\s+/)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
      elements.push(
        <div key={`nli-${i}`} className="flex items-start gap-2 pl-1 my-0.5">
          <span className="text-neutral-400 font-mono text-xs select-none">{match?.[1]}.</span>
          <span className="flex-1">{formatInline(match?.[2] || '')}</span>
        </div>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="my-1">
          {formatInline(trimmed)}
        </p>
      );
    }
  }

  if (tableLines.length > 0) {
    flushTable(`table-end`);
  }

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Formats inline bold, inline code, and links
 */
function formatInline(text: string): React.ReactNode {
  // Regex to split inline code `...`, bold **...**, and markdown links [text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded bg-neutral-900 text-neutral-200 border border-neutral-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
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
 * Minimalist Markdown Table
 */
function RenderTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  const rows = lines
    .filter((l) => !l.includes('---'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim())
    );

  if (rows.length === 0) return null;
  const [header, ...bodyRows] = rows;

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-neutral-900/90 border-b border-neutral-800 text-white font-medium">
          <tr>
            {header.map((col, idx) => (
              <th key={idx} className="px-3 py-2 border-r border-neutral-800 last:border-r-0">
                {formatInline(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 bg-neutral-950/60">
          {bodyRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-neutral-900/50 transition-colors">
              {row.map((cell, colIdx) => (
                <td
                  key={colIdx}
                  className="px-3 py-2 border-r border-neutral-800 last:border-r-0 text-neutral-300"
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
