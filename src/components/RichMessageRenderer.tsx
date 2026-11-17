import React, { useMemo } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Normalizes stray raw LaTeX/math markup into crisp, human-readable notation
 * while preserving fenced code blocks intact when explicit code is present.
 */
export function polishHumanChatText(raw: string): string {
  if (!raw) return '';
  const fenceRegex = /(```[\s\S]*?```)/g;
  const segments = raw.split(fenceRegex);

  return segments
    .map((part, idx) => {
      // Odd segments are fenced code blocks — leave them untouched
      if (idx % 2 === 1) return part;

      return part
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
        .replace(/\$([^$\n]{1,160})\$/g, '$1')
        .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1) / ($2)')
        .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
        .replace(/\\text\{([^{}]+)\}/g, '$1')
        .replace(/\\mathbf\{([^{}]+)\}/g, '$1')
        .replace(/\\mathrm\{([^{}]+)\}/g, '$1')
        .replace(/\\varepsilon_?0|\\epsilon_?0/g, 'ε₀')
        .replace(/\\times/g, '×')
        .replace(/\\cdot/g, '·')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\rightarrow|\\to/g, '→')
        .replace(/\\Rightarrow/g, '⇒')
        .replace(/\\approx/g, '≈')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\pi/g, 'π')
        .replace(/\\theta/g, 'θ')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\mu/g, 'μ')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\Omega/g, 'Ω')
        .replace(/\\omega/g, 'ω')
        .replace(/\\infty/g, '∞')
        .replace(/\\degree|\^\\circ/g, '°')
        .replace(/\^2\b/g, '²')
        .replace(/\^3\b/g, '³');
    })
    .join('');
}

function renderInlineSpans(line: string, keyPrefix: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;
  const out: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      out.push(line.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      out.push(
        <strong key={`${keyPrefix}-b-${partIdx}`} className="font-semibold text-slate-950 dark:text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      out.push(
        <span
          key={`${keyPrefix}-c-${partIdx}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-900/6 dark:bg-white/10 font-medium text-cyan-800 dark:text-cyan-200"
        >
          {token.slice(1, -1)}
        </span>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      out.push(
        <em key={`${keyPrefix}-i-${partIdx}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    partIdx += 1;
    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < line.length) {
    out.push(line.slice(lastIdx));
  }
  return out.length > 0 ? out : [line];
}

function renderMarkdownBlocks(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let blockIdx = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Markdown table block
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\|[\s:-]+\|/.test(lines[i + 1].trim())
    ) {
      const headerCells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        bodyRows.push(
          lines[i]
            .trim()
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim()),
        );
        i += 1;
      }
      nodes.push(
        <div
          key={`${keyPrefix}-tbl-${blockIdx++}`}
          className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/12 bg-white/40 dark:bg-white/[0.03]"
        >
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/12 bg-slate-100/60 dark:bg-white/[0.05]">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                    {renderInlineSpans(cell, `${keyPrefix}-th-${blockIdx}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b last:border-b-0 border-slate-200/50 dark:border-white/[0.07]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-200 align-top">
                      {renderInlineSpans(cell, `${keyPrefix}-td-${blockIdx}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const cls =
        level === 1
          ? 'text-base sm:text-lg font-semibold text-slate-950 dark:text-white pt-1'
          : level === 2
            ? 'text-sm sm:text-base font-semibold text-slate-900 dark:text-white pt-1'
            : 'text-xs sm:text-sm font-semibold text-cyan-700 dark:text-cyan-300 pt-0.5';
      nodes.push(
        <div key={`${keyPrefix}-h-${blockIdx++}`} className={cls}>
          {renderInlineSpans(headingText, `${keyPrefix}-hs-${blockIdx}`)}
        </div>,
      );
      i += 1;
      continue;
    }

    // Horizontal divider
    if (/^[-*_]{3,}$/.test(trimmed)) {
      nodes.push(
        <hr
          key={`${keyPrefix}-hr-${blockIdx++}`}
          className="border-slate-200/70 dark:border-white/10 my-1"
        />,
      );
      i += 1;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={`${keyPrefix}-q-${blockIdx++}`}
          className="pl-3.5 border-l-2 border-cyan-500/60 text-slate-700 dark:text-slate-200 italic space-y-1"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi}>{renderInlineSpans(ql, `${keyPrefix}-ql-${blockIdx}-${qi}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Bullet list (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ul key={`${keyPrefix}-ul-${blockIdx++}`} className="list-disc pl-5 space-y-1.5">
          {items.map((item, li) => (
            <li key={li}>{renderInlineSpans(item, `${keyPrefix}-li-${blockIdx}-${li}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list (1. 2. 3.)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ol key={`${keyPrefix}-ol-${blockIdx++}`} className="list-decimal pl-5 space-y-1.5">
          {items.map((item, li) => (
            <li key={li}>{renderInlineSpans(item, `${keyPrefix}-oli-${blockIdx}-${li}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Standard paragraph (collect consecutive normal lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+[.)]\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1].trim()))
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    const paragraph = paraLines.join(' ');
    nodes.push(
      <p key={`${keyPrefix}-p-${blockIdx++}`} className="leading-relaxed">
        {renderInlineSpans(paragraph, `${keyPrefix}-ps-${blockIdx}`)}
      </p>,
    );
  }

  return nodes;
}

export const RichMessageRenderer: React.FC<{
  content: string;
  copiedKey?: string | null;
  onCopy?: (text: string, key: string) => void;
  msgId: string;
}> = React.memo(({ content, copiedKey, onCopy, msgId }) => {
  const segments = useMemo(() => {
    const cleanText = polishHumanChatText(content);
    const parts: { kind: 'text' | 'code'; lang?: string; body: string }[] = [];
    const fenceRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = fenceRegex.exec(cleanText)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ kind: 'text', body: cleanText.slice(lastIdx, match.index) });
      }
      parts.push({
        kind: 'code',
        lang: match[1] || 'code',
        body: match[2].replace(/\n$/, ''),
      });
      lastIdx = fenceRegex.lastIndex;
    }
    if (lastIdx < cleanText.length) {
      parts.push({ kind: 'text', body: cleanText.slice(lastIdx) });
    }
    return parts.length > 0 ? parts : [{ kind: 'text' as const, body: cleanText }];
  }, [content]);

  return (
    <div className="space-y-2.5 break-words">
      {segments.map((seg, idx) =>
        seg.kind === 'code' ? (
          <div
            key={`${msgId}-code-${idx}`}
            className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/92 text-slate-100 shadow-sm"
          >
            <div className="px-3.5 py-1.5 bg-white/[0.06] border-b border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-mono uppercase tracking-wide">{seg.lang}</span>
              {onCopy && (
                <button
                  type="button"
                  onClick={() => onCopy(seg.body, `${msgId}-code-${idx}`)}
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  {copiedKey === `${msgId}-code-${idx}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy code
                    </>
                  )}
                </button>
              )}
            </div>
            <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{seg.body}</code>
            </pre>
          </div>
        ) : (
          <div key={`${msgId}-txt-${idx}`} className="space-y-2">
            {renderMarkdownBlocks(seg.body, `${msgId}-blk-${idx}`)}
          </div>
        ),
      )}
    </div>
  );
});
