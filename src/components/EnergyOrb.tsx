import React, { useEffect, useRef } from 'react';
import type { OrbState } from '../types/arora';

interface EnergyOrbProps {
  state: OrbState;
  complexity: 'minimal' | 'balanced' | 'full';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  compactCircleOnly?: boolean;
  paused?: boolean;
}

const STATE_META: Record<
  OrbState,
  { text: string; primary: string; secondary: string; ring: string }
> = {
  idle: {
    text: 'Ready',
    primary: 'rgba(6, 182, 212, 0.85)',
    secondary: 'rgba(139, 92, 246, 0.72)',
    ring: 'border-cyan-500/30',
  },
  listening: {
    text: 'Listening',
    primary: 'rgba(34, 211, 238, 0.95)',
    secondary: 'rgba(16, 185, 129, 0.85)',
    ring: 'border-cyan-400/60',
  },
  thinking: {
    text: 'Thinking',
    primary: 'rgba(139, 92, 246, 0.95)',
    secondary: 'rgba(56, 189, 248, 0.82)',
    ring: 'border-violet-400/60',
  },
  processing: {
    text: 'Processing',
    primary: 'rgba(56, 189, 248, 0.95)',
    secondary: 'rgba(168, 85, 247, 0.85)',
    ring: 'border-sky-400/60',
  },
  speaking: {
    text: 'Speaking',
    primary: 'rgba(6, 182, 212, 0.96)',
    secondary: 'rgba(124, 58, 237, 0.9)',
    ring: 'border-cyan-300/70',
  },
  generating: {
    text: 'Generating Answer',
    primary: 'rgba(34, 211, 238, 0.95)',
    secondary: 'rgba(192, 132, 252, 0.9)',
    ring: 'border-violet-300/65',
  },
  error: {
    text: 'Attention Required',
    primary: 'rgba(244, 63, 94, 0.9)',
    secondary: 'rgba(245, 158, 11, 0.8)',
    ring: 'border-rose-500/60',
  },
};

export const EnergyOrb: React.FC<EnergyOrbProps> = React.memo(({
  state,
  complexity,
  size = 'md',
  label,
  compactCircleOnly = false,
  paused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meta = STATE_META[state];

  const pixelDim = size === 'sm' ? 88 : size === 'lg' ? 196 : 144;
  const waveBarCount = complexity === 'minimal' ? 7 : 13;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let lastDraw = 0;
    const isMinimal = complexity === 'minimal';
    const targetFps = isMinimal || prefersReducedMotion ? 14 : complexity === 'balanced' ? 30 : 48;
    const frameInterval = 1000 / targetFps;
    const particleCount = isMinimal ? 8 : complexity === 'balanced' ? 20 : 32;

    const particles = Array.from({ length: particleCount }, (_, i) => ({
      angle: (Math.PI * 2 * i) / particleCount,
      radiusOffset: 0.55 + ((i * 17) % 100) / 220,
      speed: (i % 2 === 0 ? 1 : -1) * (0.45 + (i % 7) * 0.14),
      size: 1.2 + (i % 3) * 0.6,
    }));

    const auraSecondaryStop = meta.secondary.replace(/0\.[0-9]+\)/, '0.22)');

    const drawFrame = (now: number) => {
      const dpr = isMinimal ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
      const targetSize = Math.round(pixelDim * dpr);
      if (canvas.width !== targetSize || canvas.height !== targetSize) {
        canvas.width = targetSize;
        canvas.height = targetSize;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, pixelDim, pixelDim);

      const cx = pixelDim / 2;
      const cy = pixelDim / 2;
      const t = prefersReducedMotion ? 0 : now * 0.001;
      const speedMult =
        state === 'thinking'
          ? 2.2
          : state === 'processing'
            ? 2.6
            : state === 'speaking' || state === 'listening'
              ? 1.8
              : state === 'generating'
                ? 2.0
                : state === 'error'
                  ? 0.7
                  : 0.9;

      const baseR = pixelDim * 0.27;
      const pulse =
        state === 'speaking'
          ? Math.sin(t * 9) * 4.5 + Math.cos(t * 14) * 2.5
          : state === 'listening'
            ? Math.sin(t * 5) * 3.5
            : state === 'thinking' || state === 'processing'
              ? Math.sin(t * 6) * 2.5
              : Math.sin(t * 2) * 1.4;

      const coreRadius = Math.max(10, baseR + pulse);

      // Outer luminous aura
      const aura = ctx.createRadialGradient(cx, cy, coreRadius * 0.2, cx, cy, pixelDim * 0.48);
      aura.addColorStop(0, meta.primary);
      aura.addColorStop(0.5, auraSecondaryStop);
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, pixelDim * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // Rotating orbital energy ellipses
      const ringCount = isMinimal ? 1 : 3;
      for (let r = 0; r < ringCount; r++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * speedMult * (r % 2 === 0 ? 0.6 : -0.45) + r * 1.05);
        ctx.strokeStyle = r === 0 ? meta.primary : meta.secondary;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = size === 'sm' ? 1.2 : 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, coreRadius * 1.38, coreRadius * (0.72 + r * 0.14), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Plasma core sphere
      const coreGrad = ctx.createRadialGradient(
        cx - coreRadius * 0.28,
        cy - coreRadius * 0.28,
        coreRadius * 0.12,
        cx,
        cy,
        coreRadius,
      );
      coreGrad.addColorStop(0, '#ECFEFF');
      coreGrad.addColorStop(0.35, meta.primary);
      coreGrad.addColorStop(0.85, meta.secondary);
      coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting energy particles (skipped in minimal + idle to save CPU)
      if (!prefersReducedMotion && (!isMinimal || state !== 'idle')) {
        ctx.fillStyle = state === 'error' ? '#FDA4AF' : '#A5F3FC';
        ctx.globalAlpha = 0.65;
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const a = p.angle + t * p.speed * speedMult;
          const dist = coreRadius * (1.1 + p.radiusOffset * 0.55);
          const px = cx + Math.cos(a) * dist;
          const py = cy + Math.sin(a * 1.15) * dist * 0.85;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    if (paused) {
      drawFrame(performance.now());
      return;
    }

    const loop = (now: number) => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(loop);
      if (now - lastDraw < frameInterval && lastDraw !== 0) return;
      lastDraw = now;
      drawFrame(now);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && rafId === 0) {
        lastDraw = 0;
        rafId = requestAnimationFrame(loop);
      } else if (document.visibilityState === 'hidden' && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, complexity, pixelDim, size, meta.primary, meta.secondary, paused]);

  const activeWave = state === 'listening' || state === 'speaking' || state === 'generating';

  return (
    <div className="flex flex-col items-center justify-center select-none" role="status" aria-live="polite">
      <div
        className={`relative flex items-center justify-center rounded-full border ${meta.ring} transition-colors duration-200`}
        style={{ width: pixelDim, height: pixelDim }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: pixelDim, height: pixelDim }}
          className="block rounded-full"
        />
      </div>

      {!compactCircleOnly && (
        <>
          {/* Dynamic Audio Waveform */}
          <div
            className="mt-3 flex items-center justify-center gap-1 h-5"
            aria-hidden="true"
          >
            {Array.from({ length: waveBarCount }).map((_, idx) => {
              const centerDist = Math.abs(idx - Math.floor(waveBarCount / 2));
              const baseH = activeWave ? Math.max(4, 18 - centerDist * 2.2) : 4;
              return (
                <span
                  key={idx}
                  className={`w-1 rounded-full transition-transform duration-150 ${
                    state === 'error'
                      ? 'bg-rose-400'
                      : state === 'thinking' || state === 'processing'
                        ? 'bg-violet-400'
                        : 'bg-cyan-400'
                  }`}
                  style={{
                    height: `${baseH}px`,
                    opacity: activeWave ? 0.92 : 0.35,
                    transform: activeWave
                      ? `scaleY(${0.65 + ((idx % 4) + 1) * 0.16})`
                      : 'scaleY(0.6)',
                  }}
                />
              );
            })}
          </div>

          <span className="mt-1.5 text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300">
            {label || meta.text}
          </span>
        </>
      )}
    </div>
  );
});
