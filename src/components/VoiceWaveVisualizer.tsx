import React, { useEffect, useRef, useState } from 'react';
import {
  computeNormalizedAudioEnergy,
  type AroraLiveAudioClient,
} from '../engines/liveAudioClient';
import { getTtsOutputAnalyser } from '../engines/voiceEngine';
import type { OrbState } from '../types/arora';
import { EnergyOrb } from './EnergyOrb';

export interface VoiceWaveVisualizerProps {
  /** Direct Web Audio AnalyserNode from the user's microphone stream */
  micAnalyser?: AnalyserNode | null;
  /** Direct Web Audio AnalyserNode from ARORA AI's audio output stream */
  aiAnalyser?: AnalyserNode | null;
  /** Optional Live Audio client ref fallback for dynamic analyser resolution */
  liveClientRef?: React.RefObject<AroraLiveAudioClient | null>;
  orbState?: OrbState;
  complexity?: 'minimal' | 'balanced' | 'full';
  liveMode?: boolean;
  isListening?: boolean;
  size?: number;
  label?: string;
  showCenterOrb?: boolean;
  paused?: boolean;
}

export interface FrequencySampleResult {
  energy: number;
  bins: Uint8Array;
  hasSignal: boolean;
}

export function sampleAnalyserFrequencyData(
  analyser: AnalyserNode | null | undefined,
  scratchBuffer?: Uint8Array<ArrayBuffer>,
): FrequencySampleResult {
  if (!analyser || analyser.frequencyBinCount <= 0) {
    return {
      energy: 0,
      bins: scratchBuffer || new Uint8Array(0),
      hasSignal: false,
    };
  }
  const binCount = analyser.frequencyBinCount;
  const target =
    scratchBuffer && scratchBuffer.length === binCount
      ? scratchBuffer
      : new Uint8Array(new ArrayBuffer(binCount));
  analyser.getByteFrequencyData(target);
  const energy = computeNormalizedAudioEnergy(target);
  return {
    energy,
    bins: target,
    hasSignal: energy > 0.015,
  };
}

function drawClosedHarmonicLoopArrays(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  count: number,
) {
  if (count < 3) return;
  const last = count - 1;
  const firstMidX = (xs[last] + xs[0]) / 2;
  const firstMidY = (ys[last] + ys[0]) / 2;
  ctx.beginPath();
  ctx.moveTo(firstMidX, firstMidY);
  for (let i = 0; i < count; i += 1) {
    const nextIdx = (i + 1) % count;
    const midX = (xs[i] + xs[nextIdx]) / 2;
    const midY = (ys[i] + ys[nextIdx]) / 2;
    ctx.quadraticCurveTo(xs[i], ys[i], midX, midY);
  }
  ctx.closePath();
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = React.memo(({
  micAnalyser,
  aiAnalyser,
  liveClientRef,
  orbState = 'idle',
  complexity = 'full',
  liveMode = false,
  isListening = false,
  size = 304,
  label,
  showCenterOrb = true,
  paused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const micPctRef = useRef<HTMLSpanElement | null>(null);
  const aiPctRef = useRef<HTMLSpanElement | null>(null);
  const micDotRef = useRef<HTMLSpanElement | null>(null);
  const aiDotRef = useRef<HTMLSpanElement | null>(null);

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
    let lastReport = 0;
    let lastMicPct = -1;
    let lastAiPct = -1;

    const isMinimal = complexity === 'minimal';
    const targetFps =
      isMinimal || prefersReducedMotion
        ? 16
        : complexity === 'balanced'
          ? 34
          : 50;
    const frameInterval = 1000 / targetFps;
    const barCount = isMinimal ? 32 : 56;

    const smoothedMic = new Float32Array(barCount);
    const smoothedAi = new Float32Array(barCount);
    const aiPointsX = new Float32Array(barCount);
    const aiPointsY = new Float32Array(barCount);
    const micPointsX = new Float32Array(barCount);
    const micPointsY = new Float32Array(barCount);
    let micScratch = new Uint8Array(new ArrayBuffer(64));
    let aiScratch = new Uint8Array(new ArrayBuffer(64));

    const drawFrame = (now: number) => {
      const dpr = isMinimal ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
      const targetPx = Math.round(size * dpr);
      if (canvas.width !== targetPx || canvas.height !== targetPx) {
        canvas.width = targetPx;
        canvas.height = targetPx;
      }

      const activeMicAnalyser =
        micAnalyser ?? liveClientRef?.current?.getInputAnalyser() ?? null;
      const activeAiAnalyser =
        aiAnalyser ??
        liveClientRef?.current?.getOutputAnalyser() ??
        getTtsOutputAnalyser() ??
        null;

      if (activeMicAnalyser && micScratch.length !== activeMicAnalyser.frequencyBinCount) {
        micScratch = new Uint8Array(new ArrayBuffer(activeMicAnalyser.frequencyBinCount));
      }
      if (activeAiAnalyser && aiScratch.length !== activeAiAnalyser.frequencyBinCount) {
        aiScratch = new Uint8Array(new ArrayBuffer(activeAiAnalyser.frequencyBinCount));
      }

      const micSample = sampleAnalyserFrequencyData(activeMicAnalyser, micScratch);
      const aiSample = sampleAnalyserFrequencyData(activeAiAnalyser, aiScratch);

      const fallbackMic =
        !activeMicAnalyser && (isListening || orbState === 'listening') ? 0.32 : 0;
      const fallbackAi =
        !activeAiAnalyser && (orbState === 'speaking' || orbState === 'generating') ? 0.42 : 0;

      const micEnergy = Math.max(micSample.energy, fallbackMic);
      const aiEnergy = Math.max(aiSample.energy, fallbackAi);
      const combinedEnergy = Math.min(1, Math.max(micEnergy, aiEnergy));

      // Direct DOM ref telemetry update — zero React reconciliation overhead
      if (now - lastReport >= 120) {
        lastReport = now;
        const micPct = Math.round(micEnergy * 100);
        const aiPct = Math.round(aiEnergy * 100);
        if (micPct !== lastMicPct) {
          lastMicPct = micPct;
          if (micPctRef.current) micPctRef.current.textContent = `Mic Input: ${micPct}%`;
          if (micDotRef.current) {
            micDotRef.current.className = `w-1.5 h-1.5 rounded-full ${
              micPct > 5 ? 'bg-emerald-500' : 'bg-slate-400/70'
            }`;
          }
        }
        if (aiPct !== lastAiPct) {
          lastAiPct = aiPct;
          if (aiPctRef.current) aiPctRef.current.textContent = `ARORA Speech: ${aiPct}%`;
          if (aiDotRef.current) {
            aiDotRef.current.className = `w-1.5 h-1.5 rounded-full ${
              aiPct > 5 ? 'bg-cyan-500' : 'bg-slate-400/70'
            }`;
          }
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const t = prefersReducedMotion ? 0 : now * 0.001;
      const baseRadius = size * 0.345;
      const maxWaveSpan = size * 0.125;
      const useGlowPass = !isMinimal && !prefersReducedMotion;

      // 1. Futuristic Ambient Energy Halo
      if (combinedEnergy > 0.02 || liveMode || orbState !== 'idle') {
        const haloRadius = baseRadius + maxWaveSpan * (0.9 + combinedEnergy * 0.6);
        const halo = ctx.createRadialGradient(cx, cy, baseRadius * 0.72, cx, cy, haloRadius);
        if (orbState === 'error') {
          halo.addColorStop(0, 'rgba(244, 63, 94, 0.02)');
          halo.addColorStop(0.65, 'rgba(244, 63, 94, 0.16)');
          halo.addColorStop(1, 'rgba(244, 63, 94, 0)');
        } else if (micEnergy > aiEnergy + 0.08) {
          halo.addColorStop(0, 'rgba(16, 185, 129, 0.02)');
          halo.addColorStop(0.62, `rgba(16, 185, 129, ${0.12 + micEnergy * 0.22})`);
          halo.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          halo.addColorStop(0, 'rgba(34, 211, 238, 0.02)');
          halo.addColorStop(0.58, `rgba(34, 211, 238, ${0.10 + aiEnergy * 0.24})`);
          halo.addColorStop(0.84, `rgba(139, 92, 246, ${0.06 + aiEnergy * 0.16})`);
          halo.addColorStop(1, 'rgba(139, 92, 246, 0)');
        }
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Equilibrium Precision Track & Orbital Scanner Arcs
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle =
        orbState === 'error'
          ? 'rgba(244, 63, 94, 0.28)'
          : liveMode
            ? 'rgba(56, 189, 248, 0.26)'
            : 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!prefersReducedMotion && (!isMinimal || liveMode || orbState !== 'idle')) {
        const spin = t * (0.45 + combinedEnergy * 1.4);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.6;
        ctx.strokeStyle =
          orbState === 'error'
            ? 'rgba(251, 113, 133, 0.55)'
            : 'rgba(34, 211, 238, 0.52)';
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius - 6, spin, spin + Math.PI * 0.42);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(167, 139, 250, 0.48)';
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius - 6, spin + Math.PI, spin + Math.PI * 1.42);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Compute Symmetrical Circular Spectrum Points without object allocations
      const halfBars = barCount / 2;

      for (let i = 0; i < barCount; i += 1) {
        const theta = (Math.PI * 2 * i) / barCount - Math.PI / 2;
        const mirroredIdx = i < halfBars ? i : barCount - 1 - i;
        const binRatio = mirroredIdx / Math.max(1, halfBars - 1);

        let targetMic = 0;
        if (activeMicAnalyser && micSample.bins.length > 0) {
          const binIdx = Math.min(
            micSample.bins.length - 1,
            Math.floor(binRatio * Math.min(44, micSample.bins.length - 1)),
          );
          targetMic = (micSample.bins[binIdx] / 255) * 1.05;
        } else if (fallbackMic > 0) {
          targetMic =
            0.16 +
            0.26 *
              Math.abs(Math.sin(t * 4.8 + i * 0.34)) *
              (0.72 + 0.28 * Math.cos(t * 2.2 - i * 0.21));
        }

        let targetAi = 0;
        if (activeAiAnalyser && aiSample.bins.length > 0) {
          const binIdx = Math.min(
            aiSample.bins.length - 1,
            Math.floor(binRatio * Math.min(44, aiSample.bins.length - 1)),
          );
          targetAi = (aiSample.bins[binIdx] / 255) * 1.12;
        } else if (fallbackAi > 0) {
          targetAi =
            0.22 +
            0.35 *
              Math.abs(Math.sin(t * 6.4 + i * 0.42)) *
              (0.68 + 0.32 * Math.cos(t * 3.1 + i * 0.18));
        } else if (orbState === 'thinking' || orbState === 'processing') {
          targetAi = 0.09 + 0.08 * Math.sin(t * 4.2 + i * 0.32);
        }

        const lerp = prefersReducedMotion ? 1 : 0.34;
        smoothedMic[i] += (targetMic - smoothedMic[i]) * lerp;
        smoothedAi[i] += (targetAi - smoothedAi[i]) * lerp;

        const aiHeight = Math.max(2, smoothedAi[i] * maxWaveSpan);
        const micHeight = Math.max(1.5, smoothedMic[i] * (maxWaveSpan * 0.85));

        const cosA = Math.cos(theta);
        const sinA = Math.sin(theta);

        // AI output radial spectrum bar
        const rAiStart = baseRadius + 1.5;
        const rAiEnd = rAiStart + aiHeight;
        ctx.beginPath();
        ctx.moveTo(cx + cosA * rAiStart, cy + sinA * rAiStart);
        ctx.lineTo(cx + cosA * rAiEnd, cy + sinA * rAiEnd);
        ctx.strokeStyle =
          orbState === 'error'
            ? `rgba(244, 63, 94, ${0.32 + smoothedAi[i] * 0.62})`
            : `rgba(34, 211, 238, ${0.22 + smoothedAi[i] * 0.74})`;
        ctx.lineWidth = isMinimal ? 2 : 1.7;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Microphone radial spectrum bar
        if (smoothedMic[i] > 0.025) {
          const rMicStart = baseRadius - 2.5;
          const rMicEnd = rMicStart + micHeight;
          ctx.beginPath();
          ctx.moveTo(cx + cosA * rMicStart, cy + sinA * rMicStart);
          ctx.lineTo(cx + cosA * rMicEnd, cy + sinA * rMicEnd);
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.28 + smoothedMic[i] * 0.72})`;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        const aiWaveRadius =
          rAiStart + aiHeight + (prefersReducedMotion ? 0 : Math.sin(t * 2.6 + i * 0.36) * 1.4);
        const micWaveRadius =
          baseRadius + micHeight * 0.92 + (prefersReducedMotion ? 0 : Math.cos(t * 2.1 - i * 0.3) * 1.1);

        aiPointsX[i] = cx + cosA * aiWaveRadius;
        aiPointsY[i] = cy + sinA * aiWaveRadius;
        micPointsX[i] = cx + cosA * micWaveRadius;
        micPointsY[i] = cy + sinA * micWaveRadius;
      }

      // 4. Dual-Layer Circular Harmonic Waves (shadowBlur skipped in eco/minimal mode)
      ctx.save();
      if (useGlowPass) {
        ctx.shadowColor =
          orbState === 'error'
            ? 'rgba(244, 63, 94, 0.75)'
            : 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 12 + aiEnergy * 8;
      }
      drawClosedHarmonicLoopArrays(ctx, aiPointsX, aiPointsY, barCount);
      ctx.strokeStyle =
        orbState === 'error'
          ? 'rgba(251, 113, 133, 0.65)'
          : `rgba(139, 92, 246, ${0.28 + aiEnergy * 0.65})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      drawClosedHarmonicLoopArrays(ctx, aiPointsX, aiPointsY, barCount);
      ctx.strokeStyle =
        orbState === 'error'
          ? 'rgba(254, 205, 211, 0.72)'
          : `rgba(103, 232, 249, ${0.32 + aiEnergy * 0.68})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();

      if (micEnergy > 0.03) {
        ctx.save();
        if (useGlowPass) {
          ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
          ctx.shadowBlur = 10 + micEnergy * 6;
        }
        drawClosedHarmonicLoopArrays(ctx, micPointsX, micPointsY, barCount);
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.34 + micEnergy * 0.66})`;
        ctx.lineWidth = 1.9;
        ctx.stroke();

        ctx.shadowBlur = 0;
        drawClosedHarmonicLoopArrays(ctx, micPointsX, micPointsY, barCount);
        ctx.strokeStyle = `rgba(167, 243, 208, ${0.38 + micEnergy * 0.62})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
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
  }, [micAnalyser, aiAnalyser, liveClientRef, orbState, complexity, liveMode, isListening, size, paused]);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className="absolute inset-0 pointer-events-none"
        />
        {showCenterOrb && (
          <div className="relative z-10 flex items-center justify-center">
            <EnergyOrb
              state={orbState}
              complexity={complexity}
              size="lg"
              compactCircleOnly
              paused={paused}
            />
          </div>
        )}
      </div>

      {label && (
        <span className="mt-1 text-xs font-medium tracking-wide text-slate-700 dark:text-slate-200">
          {label}
        </span>
      )}

      {/* Unboxed Dual-Channel Live Audio Telemetry Line (DOM-ref updated, zero React churn) */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <span
            ref={micDotRef}
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-slate-400/70"
          />
          <span ref={micPctRef}>Mic Input: 0%</span>
        </span>
        <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            ref={aiDotRef}
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-slate-400/70"
          />
          <span ref={aiPctRef}>ARORA Speech: 0%</span>
        </span>
      </div>
    </div>
  );
});
