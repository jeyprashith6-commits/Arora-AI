import React, { useMemo, useState } from 'react';
import {
  Download,
  Image as ImageIcon,
  Maximize2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { sanitizeSvgMarkup } from '../engines/diagramUtils';
import { triggerHaptic } from '../engines/hapticsEngine';
import type { GeneratedDiagramSpec } from '../types/arora';

interface GeneratedDiagramCardProps {
  diagram: GeneratedDiagramSpec;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  compact?: boolean;
}

function makeDownloadFilename(title: string, ext: 'svg' | 'png'): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'arora-diagram';
  return `arora-${slug}.${ext}`;
}

export const GeneratedDiagramCard: React.FC<GeneratedDiagramCardProps> = ({
  diagram,
  onRegenerate,
  isRegenerating = false,
  compact = false,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [showLabelsPanel, setShowLabelsPanel] = useState(!compact);

  const safeSvg = useMemo(
    () => sanitizeSvgMarkup(diagram.svgMarkup),
    [diagram.svgMarkup],
  );

  const handleDownloadSvg = () => {
    if (!safeSvg) return;
    triggerHaptic('tap');
    const blob = new Blob([safeSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = makeDownloadFilename(diagram.title, 'svg');
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!safeSvg || exportingPng) return;
    triggerHaptic('tap');
    setExportingPng(true);
    try {
      const svgBlob = new Blob([safeSvg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not rasterize SVG'));
        img.src = svgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = makeDownloadFilename(diagram.title, 'png');
        link.click();
      }
      URL.revokeObjectURL(svgUrl);
    } catch {
      // Fallback cleanly to SVG export if canvas export is blocked
      handleDownloadSvg();
    } finally {
      setExportingPng(false);
    }
  };

  if (!safeSvg) {
    return (
      <div className="p-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
        <span>Diagram geometry could not be verified safely.</span>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold glass-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Redraw Diagram
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/92 text-slate-100 p-3.5 sm:p-4 space-y-3 shadow-[0_14px_34px_-16px_rgba(6,182,212,0.35)]">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-400">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                ARORA Precision Diagram
                {diagram.subjectHint ? ` · ${diagram.subjectHint}` : ''}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-white truncate">
              {diagram.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setIsZoomed(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-[11px] font-medium text-slate-200 glass-press"
              title="Inspect diagram full screen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Zoom
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-[11px] font-medium text-slate-200 glass-press"
              title="Download crisp SVG vector diagram"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              SVG
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadPng()}
              disabled={exportingPng}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-[11px] font-medium text-slate-200 glass-press disabled:opacity-50"
              title="Download 1600×960 high-res PNG image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              {exportingPng ? 'Saving...' : 'PNG'}
            </button>

            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-400/40 text-[11px] font-medium text-cyan-200 glass-press disabled:opacity-55"
                title="Redraw and refine this diagram"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Drawing...' : 'Redraw'}
              </button>
            )}
          </div>
        </div>

        {/* Crisp Vector SVG Viewport */}
        <div
          onClick={() => setIsZoomed(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsZoomed(true);
            }
          }}
          aria-label={`Zoom diagram: ${diagram.title}`}
          className="cursor-zoom-in rounded-xl overflow-hidden bg-[#0b1220] border border-white/10 [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[430px] [&>svg]:block"
          dangerouslySetInnerHTML={{ __html: safeSvg }}
        />

        {/* Caption */}
        {diagram.caption && (
          <p className="text-xs text-slate-300 leading-relaxed">{diagram.caption}</p>
        )}

        {/* Key Labels & Board Drawing Tips */}
        {(diagram.keyLabels.length > 0 || diagram.boardDrawingTips.length > 0) && (
          <div className="pt-1 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => setShowLabelsPanel((v) => !v)}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300"
            >
              {showLabelsPanel
                ? 'Hide Key Labels & Board Exam Drawing Tips'
                : `Show Key Labels (${diagram.keyLabels.length}) & Drawing Tips`}
            </button>

            {showLabelsPanel && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {diagram.keyLabels.length > 0 && (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5">
                    <div className="text-[11px] font-semibold text-sky-300">
                      Labelled Parts & Functions
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {diagram.keyLabels.map((item, idx) => (
                        <li key={`${item.label}-${idx}`} className="leading-snug">
                          <span className="font-semibold text-white">{item.label}:</span>{' '}
                          {item.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagram.boardDrawingTips.length > 0 && (
                  <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-400/25 p-3 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      CBSE Board Exam Drawing Tips
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {diagram.boardDrawingTips.map((tip, idx) => (
                        <li key={idx} className="leading-snug">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* High-Resolution Fullscreen Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/88 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Diagram inspection: ${diagram.title}`}
        >
          <div
            className="w-full max-w-5xl rounded-3xl border border-cyan-400/35 bg-[#0b1220] p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-cyan-400">
                  Full-Resolution Vector Inspection · {diagram.subjectHint || 'CBSE Study'}
                </div>
                <h3 className="text-lg font-semibold text-white">{diagram.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  SVG
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadPng()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => setIsZoomed(false)}
                  aria-label="Close diagram zoom"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden border border-white/10 [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
              dangerouslySetInnerHTML={{ __html: safeSvg }}
            />

            {diagram.caption && (
              <p className="text-xs sm:text-sm text-slate-300">{diagram.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
