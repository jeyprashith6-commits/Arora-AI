import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  Code2,
  Copy,
  Download,
  Eraser,
  FlaskConical,
  Highlighter,
  Maximize2,
  MessageSquarePlus,
  PenTool,
  RotateCcw,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getSubjectBoardTitle } from '../engines/classroomSyncEngine';
import { triggerHaptic } from '../engines/hapticsEngine';
import type {
  BoardSemanticTone,
  BoardSurfaceTheme,
  DigitalBoardBlock,
  SubjectId,
} from '../types/arora';
import { GeneratedDiagramCard } from './GeneratedDiagramCard';
import { ScientificDiagram } from './ScientificDiagram';

interface DigitalTeachingBoardProps {
  subjectId: SubjectId;
  subjectName: string;
  chapterTitle: string;
  currentTopic: string;
  boardTheme: BoardSurfaceTheme;
  onChangeBoardTheme: (theme: BoardSurfaceTheme) => void;
  zoomPercent: number;
  onChangeZoom: (nextZoom: number) => void;
  blocks: DigitalBoardBlock[];
  activeBlockId: string | null;
  isSpeakingSync: boolean;
  animationComplexity: 'minimal' | 'balanced' | 'full';
  onHighlightBlock: (blockId: string) => void;
  onEraseBlock: (blockId: string) => void;
  onClearBoard: () => void;
  onAskAboutBlock: (block: DigitalBoardBlock) => void;
  onRequestDiagramOnBoard: (topicPrompt: string) => void;
  isGeneratingDiagram?: boolean;
  onExportNotes: () => void;
}

function getToneLabel(kind: DigitalBoardBlock['kind'], tone: BoardSemanticTone): string {
  if (tone === 'correction') return 'Correction & Rewrite';
  switch (kind) {
    case 'formula':
      return 'Key Formula';
    case 'derivation_step':
      return 'Derivation Step';
    case 'numerical_step':
      return 'Step-by-Step Solution';
    case 'definition':
      return 'Key Definition';
    case 'equation':
      return 'Chemical Equation';
    case 'diagram':
      return 'Scientific Diagram';
    case 'code':
      return 'Code & Algorithm';
    case 'grammar':
      return 'Grammar & Annotation';
    case 'question':
      return 'Teacher Question';
    case 'highlight':
      return 'Important Takeaway';
    default:
      return tone === 'example' ? 'Worked Example' : 'Board Note';
  }
}

function highlightInlineTerms(text: string, terms?: string[], isBlackboard = true): React.ReactNode {
  if (!terms || terms.length === 0) return text;
  const cleanTerms = terms.map((t) => t.trim()).filter((t) => t.length >= 2);
  if (cleanTerms.length === 0) return text;

  const escaped = cleanTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const matched = cleanTerms.some((t) => t.toLowerCase() === part.toLowerCase());
    if (!matched) return <React.Fragment key={idx}>{part}</React.Fragment>;
    return (
      <mark
        key={idx}
        className={`px-1 rounded font-semibold ${
          isBlackboard
            ? 'bg-amber-400/25 text-amber-200 border-b border-amber-300/60'
            : 'bg-amber-200/80 text-slate-950 border-b border-amber-500'
        }`}
      >
        {part}
      </mark>
    );
  });
}

export const DigitalTeachingBoard: React.FC<DigitalTeachingBoardProps> = React.memo(
  ({
    subjectId,
    subjectName,
    chapterTitle,
    currentTopic,
    boardTheme,
    onChangeBoardTheme,
    zoomPercent,
    onChangeZoom,
    blocks,
    activeBlockId,
    isSpeakingSync,
    animationComplexity,
    onHighlightBlock,
    onEraseBlock,
    onClearBoard,
    onAskAboutBlock,
    onRequestDiagramOnBoard,
    isGeneratingDiagram = false,
    onExportNotes,
  }) => {
    const scrollViewportRef = useRef<HTMLDivElement | null>(null);
    const activeElRef = useRef<HTMLDivElement | null>(null);
    const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
    const [customDiagramTopic, setCustomDiagramTopic] = useState('');
    const [showDiagramPromptBar, setShowDiagramPromptBar] = useState(false);

    const isBlackboard = boardTheme === 'blackboard';

    useEffect(() => {
      const target = activeElRef.current || scrollViewportRef.current?.lastElementChild;
      if (!target || !scrollViewportRef.current) return;
      if (typeof (target as HTMLElement).scrollIntoView === 'function') {
        (target as HTMLElement).scrollIntoView({
          behavior: animationComplexity === 'minimal' ? 'auto' : 'smooth',
          block: 'nearest',
        });
      }
    }, [blocks.length, activeBlockId, animationComplexity]);

    const handleCopyBlock = async (block: DigitalBoardBlock) => {
      try {
        await navigator.clipboard.writeText(
          [block.title, block.content, ...(block.lines || [])].filter(Boolean).join('\n'),
        );
        setCopiedBlockId(block.id);
        triggerHaptic('tap');
        window.setTimeout(() => setCopiedBlockId((cur) => (cur === block.id ? null : cur)), 1500);
      } catch {
        // Ignore clipboard denial
      }
    };

    const surfaceClasses = isBlackboard
      ? 'bg-[#091814] text-[#F1F5F9] border-[#1F3A32] shadow-[inset_0_0_48px_rgba(0,0,0,0.45),0_18px_42px_-16px_rgba(2,6,23,0.65)]'
      : 'bg-[#F8FAFC] text-slate-900 border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_34px_-16px_rgba(15,23,42,0.18)]';

    const getBlockFrameClasses = (block: DigitalBoardBlock, isActiveNow: boolean) => {
      const ring = isActiveNow
        ? isBlackboard
          ? 'ring-2 ring-cyan-400/75 shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)]'
          : 'ring-2 ring-sky-500/75 shadow-[0_6px_22px_-8px_rgba(2,132,199,0.32)]'
        : '';

      if (block.tone === 'correction' || block.isCorrected) {
        return `${ring} ${
          isBlackboard
            ? 'bg-rose-950/35 border-rose-400/40'
            : 'bg-rose-50/90 border-rose-300'
        }`;
      }
      if (block.tone === 'formula') {
        return `${ring} ${
          isBlackboard
            ? 'bg-cyan-950/35 border-cyan-400/35'
            : 'bg-sky-50/90 border-sky-300'
        }`;
      }
      if (block.tone === 'important' || block.isHighlighted) {
        return `${ring} ${
          isBlackboard
            ? 'bg-emerald-950/35 border-emerald-400/40'
            : 'bg-emerald-50/90 border-emerald-300'
        }`;
      }
      if (block.tone === 'example') {
        return `${ring} ${
          isBlackboard
            ? 'bg-amber-950/30 border-amber-400/35'
            : 'bg-amber-50/90 border-amber-300'
        }`;
      }
      if (block.tone === 'question') {
        return `${ring} ${
          isBlackboard
            ? 'bg-violet-950/35 border-violet-400/40'
            : 'bg-indigo-50/90 border-indigo-300'
        }`;
      }
      if (block.tone === 'code') {
        return `${ring} ${
          isBlackboard
            ? 'bg-slate-950/95 border-slate-700'
            : 'bg-slate-900 text-slate-100 border-slate-700'
        }`;
      }
      return `${ring} ${
        isBlackboard
          ? 'bg-white/[0.04] border-white/12'
          : 'bg-white border-slate-200'
      }`;
    };

    const getSemanticLabelClass = (block: DigitalBoardBlock) => {
      if (block.tone === 'correction' || block.isCorrected) {
        return isBlackboard ? 'text-rose-300' : 'text-rose-700';
      }
      if (block.tone === 'formula') {
        return isBlackboard ? 'text-cyan-300' : 'text-sky-700';
      }
      if (block.tone === 'important' || block.isHighlighted) {
        return isBlackboard ? 'text-emerald-300' : 'text-emerald-700';
      }
      if (block.tone === 'example') {
        return isBlackboard ? 'text-amber-300' : 'text-amber-700';
      }
      if (block.tone === 'question') {
        return isBlackboard ? 'text-violet-300' : 'text-indigo-700';
      }
      if (block.tone === 'code') {
        return 'text-emerald-300';
      }
      return isBlackboard ? 'text-slate-300' : 'text-slate-600';
    };

    return (
      <div className={`rounded-3xl border overflow-hidden transition-colors duration-200 ${surfaceClasses}`}>
        {/* Digital Board Top Frame & Subject Calibration Bar */}
        <div
          className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 ${
            isBlackboard
              ? 'bg-[#071310] border-[#1F3A32]'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className={isBlackboard ? 'text-cyan-300' : 'text-sky-700'}>
                {getSubjectBoardTitle(subjectId)}
              </span>
              {isSpeakingSync && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                    isBlackboard
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Synced Live Writing
                </span>
              )}
            </div>
            <h2
              className={`text-sm sm:text-base font-semibold truncate ${
                isBlackboard ? 'text-white' : 'text-slate-900'
              }`}
            >
              {subjectName} · {chapterTitle} — <span className={isBlackboard ? 'text-amber-200' : 'text-sky-700'}>{currentTopic}</span>
            </h2>
          </div>

          {/* Board Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className={`inline-flex items-center p-0.5 rounded-xl border ${
                isBlackboard
                  ? 'bg-black/35 border-white/15'
                  : 'bg-slate-100 border-slate-300'
              }`}
              role="group"
              aria-label="Board surface mode"
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onChangeBoardTheme('blackboard');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold min-h-[34px] transition-colors ${
                  isBlackboard
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blackboard
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onChangeBoardTheme('whiteboard');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold min-h-[34px] transition-colors ${
                  !isBlackboard
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Whiteboard
              </button>
            </div>

            <div
              className={`inline-flex items-center rounded-xl border ${
                isBlackboard ? 'border-white/15 bg-black/30' : 'border-slate-300 bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => onChangeZoom(Math.max(70, zoomPercent - 10))}
                aria-label="Zoom out board"
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:opacity-80"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono tabular-nums font-semibold">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={() => onChangeZoom(Math.min(160, zoomPercent + 10))}
                aria-label="Zoom in board"
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:opacity-80"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoomPercent !== 100 && (
                <button
                  type="button"
                  onClick={() => onChangeZoom(100)}
                  aria-label="Reset board zoom"
                  className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:opacity-80"
                  title="Reset zoom to 100%"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowDiagramPromptBar((v) => !v);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold min-h-[36px] border ${
                showDiagramPromptBar
                  ? 'bg-cyan-600 text-white border-cyan-400'
                  : isBlackboard
                    ? 'bg-white/8 hover:bg-white/14 border-white/15 text-cyan-200'
                    : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Draw Diagram
            </button>

            <button
              type="button"
              onClick={onExportNotes}
              disabled={blocks.length === 0}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold min-h-[36px] border disabled:opacity-45 ${
                isBlackboard
                  ? 'bg-white/8 hover:bg-white/14 border-white/15 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title="Download board notes as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              Save Notes
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onClearBoard();
              }}
              disabled={blocks.length === 0}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold min-h-[36px] border disabled:opacity-45 ${
                isBlackboard
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/35 text-rose-200'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700'
              }`}
              title="Erase the entire digital board"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Inline Draw-on-Board Diagram Request Strip */}
        {showDiagramPromptBar && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const topicToDraw = customDiagramTopic.trim() || currentTopic;
              setShowDiagramPromptBar(false);
              setCustomDiagramTopic('');
              onRequestDiagramOnBoard(topicToDraw);
            }}
            className={`px-4 py-2.5 border-b flex flex-wrap items-center gap-2 ${
              isBlackboard ? 'bg-[#0C211B] border-[#1F3A32]' : 'bg-sky-50/70 border-slate-200'
            }`}
          >
            <input
              type="text"
              value={customDiagramTopic}
              onChange={(e) => setCustomDiagramTopic(e.target.value)}
              placeholder={`Diagram to draw on board (default: ${currentTopic})...`}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                isBlackboard
                  ? 'bg-black/35 border-white/20 text-white placeholder:text-slate-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={isGeneratingDiagram}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold min-h-[36px] disabled:opacity-55"
            >
              {isGeneratingDiagram ? 'Drawing on Board...' : 'Render Diagram'}
            </button>
          </form>
        )}

        {/* Scrollable & Zoomable Teaching Board Canvas */}
        <div
          ref={scrollViewportRef}
          className="h-[460px] sm:h-[540px] lg:h-[590px] overflow-auto p-4 sm:p-6 space-y-4"
        >
          <div
            style={{
              fontSize: `${Math.round((zoomPercent / 100) * 100)}%`,
            }}
            className="space-y-4"
          >
            {blocks.length === 0 ? (
              <div
                className={`p-8 rounded-2xl border border-dashed text-center space-y-2 ${
                  isBlackboard ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'
                }`}
              >
                <BookOpenCheck className="w-8 h-8 mx-auto opacity-75" />
                <p className="text-sm font-semibold">Digital Teaching Board Cleared</p>
                <p className="text-xs opacity-80 max-w-md mx-auto">
                  Speak or type a command such as &ldquo;Solve step by step&rdquo;, &ldquo;Write that on the board&rdquo;, &ldquo;Give another example&rdquo;, or answer Arora&apos;s question to watch live synchronized board notes appear.
                </p>
              </div>
            ) : (
              blocks.map((block, idx) => {
                const isActiveNow = activeBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    ref={isActiveNow ? activeElRef : undefined}
                    className={`rounded-2xl border p-4 transition-all duration-200 ${getBlockFrameClasses(
                      block,
                      isActiveNow,
                    )}`}
                  >
                    {/* Block Category Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${getSemanticLabelClass(
                            block,
                          )}`}
                        >
                          {block.kind === 'code' ? (
                            <Code2 className="w-3.5 h-3.5" />
                          ) : block.kind === 'equation' ? (
                            <FlaskConical className="w-3.5 h-3.5" />
                          ) : block.tone === 'correction' ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <span className="font-mono text-[10px]">#{idx + 1}</span>
                          )}
                          {getToneLabel(block.kind, block.tone)}
                        </span>
                        {block.title && (
                          <h3
                            className={`text-sm font-semibold ${
                              block.tone === 'code'
                                ? 'text-white'
                                : isBlackboard
                                  ? 'text-white'
                                  : 'text-slate-900'
                            }`}
                          >
                            {block.title}
                          </h3>
                        )}
                      </div>

                      {/* Quick Block Tools */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onHighlightBlock(block.id)}
                          aria-label="Highlight block"
                          title="Highlight this board point"
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            block.isHighlighted
                              ? 'text-amber-400 bg-amber-500/15'
                              : isBlackboard || block.tone === 'code'
                                ? 'text-slate-400 hover:text-amber-300 hover:bg-white/10'
                                : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100'
                          }`}
                        >
                          <Highlighter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAskAboutBlock(block)}
                          aria-label="Ask doubt about this block"
                          title="Interrupt / ask a doubt about this step"
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            isBlackboard || block.tone === 'code'
                              ? 'text-slate-400 hover:text-cyan-300 hover:bg-white/10'
                              : 'text-slate-500 hover:text-sky-600 hover:bg-slate-100'
                          }`}
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyBlock(block)}
                          aria-label="Copy block text"
                          title="Copy to clipboard"
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            isBlackboard || block.tone === 'code'
                              ? 'text-slate-400 hover:text-white hover:bg-white/10'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {copiedBlockId === block.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEraseBlock(block.id)}
                          aria-label="Erase this block"
                          title="Erase from board"
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            isBlackboard || block.tone === 'code'
                              ? 'text-slate-400 hover:text-rose-300 hover:bg-white/10'
                              : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Correction Strike-Through Comparison */}
                    {block.replacesText && (
                      <div
                        className={`mb-2 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 line-through opacity-80 ${
                          isBlackboard
                            ? 'bg-rose-950/60 text-rose-200'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3 shrink-0 no-underline" />
                        <span>{block.replacesText}</span>
                      </div>
                    )}

                    {/* Chemistry Reaction Renderer */}
                    {block.equationParts ? (
                      <div
                        className={`p-3 rounded-xl font-mono text-sm flex flex-wrap items-center gap-2.5 ${
                          isBlackboard ? 'bg-black/30 text-cyan-100' : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span className="font-semibold">{block.equationParts.reactants}</span>
                        <span className="inline-flex flex-col items-center px-2 text-center">
                          {block.equationParts.conditions && (
                            <span className={`text-[10px] ${isBlackboard ? 'text-amber-300' : 'text-sky-700'}`}>
                              {block.equationParts.conditions}
                            </span>
                          )}
                          <span className="text-base leading-none">────────→</span>
                        </span>
                        <span className="font-semibold text-emerald-400 dark:text-emerald-300">
                          {block.equationParts.products}
                        </span>
                      </div>
                    ) : block.kind === 'code' ? (
                      /* Computer Science Code Editor Block */
                      <div className="rounded-xl overflow-hidden border border-slate-700 bg-[#040914] text-slate-100">
                        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-emerald-300">
                          <span>{(block.codeLanguage || 'python').toUpperCase()} · Board Code</span>
                        </div>
                        <pre className="p-3 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-sky-100">
                          <code>{block.content}</code>
                        </pre>
                      </div>
                    ) : (
                      /* Formula / Numerical / Explanation / Grammar Content */
                      <div
                        className={`leading-relaxed whitespace-pre-wrap ${
                          block.kind === 'formula'
                            ? `font-mono text-sm sm:text-base font-semibold px-3 py-2.5 rounded-xl ${
                                isBlackboard
                                  ? 'bg-black/35 text-cyan-200 border border-cyan-500/25'
                                  : 'bg-white text-sky-900 border border-sky-200'
                              }`
                            : block.kind === 'numerical_step' || block.kind === 'derivation_step'
                              ? 'font-mono text-xs sm:text-sm tabular-nums'
                              : 'text-sm'
                        }`}
                      >
                        {highlightInlineTerms(block.content, block.highlightTerms, isBlackboard)}
                      </div>
                    )}

                    {/* Optional Sub-Steps / Derivation Lines */}
                    {block.lines && block.lines.length > 0 && (
                      <ol
                        className={`mt-2.5 space-y-1.5 pl-4 text-xs sm:text-sm ${
                          block.kind === 'derivation_step' || block.kind === 'numerical_step'
                            ? 'list-decimal font-mono tabular-nums'
                            : 'list-disc'
                        }`}
                      >
                        {block.lines.map((line, lineIdx) => (
                          <li key={lineIdx} className="leading-relaxed">
                            {highlightInlineTerms(line, block.highlightTerms, isBlackboard)}
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Embedded Interactive Scientific Diagram OR Vector SVG Diagram */}
                    {block.diagramId && (
                      <div className="mt-3">
                        <ScientificDiagram diagramId={block.diagramId} caption={block.content} />
                      </div>
                    )}

                    {block.generatedDiagram && (
                      <div className="mt-3">
                        <GeneratedDiagramCard diagram={block.generatedDiagram} compact />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  },
);

DigitalTeachingBoard.displayName = 'DigitalTeachingBoard';
