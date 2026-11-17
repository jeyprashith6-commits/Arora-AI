import React, { useEffect, useRef, useState } from 'react';
import {
  Captions,
  MessageSquare,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  StopCircle,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AroraLiveAudioClient } from '../engines/liveAudioClient';
import type { LanguageMode, OrbState, VoicePersona } from '../types/arora';
import { VoiceWaveVisualizer } from './VoiceWaveVisualizer';

export interface LiveTranscriptTurn {
  id: string;
  speaker: 'arora' | 'student';
  text: string;
}

interface AroraLiveChatModalProps {
  isOpen: boolean;
  liveMode: boolean;
  liveConnecting: boolean;
  liveHoldPaused: boolean;
  isListening: boolean;
  voiceOutputEnabled: boolean;
  orbState: OrbState;
  latencyMs: number | null;
  statusError: string | null;
  language: LanguageMode;
  onChangeLanguage: (lang: LanguageMode) => void;
  voicePersona: VoicePersona;
  onChangeVoicePersona: (vp: VoicePersona) => void;
  contextSubtitle?: string;
  micAnalyser: AnalyserNode | null;
  aiAnalyser: AnalyserNode | null;
  liveClientRef: React.RefObject<AroraLiveAudioClient | null>;
  turns: LiveTranscriptTurn[];
  liveDrafts: { input: string; output: string };
  animationComplexity: 'minimal' | 'balanced' | 'full';
  onToggleMic: () => void;
  onToggleHoldPause: () => void;
  onToggleVoiceOutput: () => void;
  onInterrupt: () => void;
  onSendText: (text: string) => void;
  onRetryConnect: () => void;
  onClose: () => void;
}

export const AroraLiveChatModal: React.FC<AroraLiveChatModalProps> = ({
  isOpen,
  liveMode,
  liveConnecting,
  liveHoldPaused,
  isListening,
  voiceOutputEnabled,
  orbState,
  latencyMs,
  statusError,
  language,
  onChangeLanguage,
  voicePersona,
  onChangeVoicePersona,
  contextSubtitle,
  micAnalyser,
  aiAnalyser,
  liveClientRef,
  turns,
  liveDrafts,
  animationComplexity,
  onToggleMic,
  onToggleHoldPause,
  onToggleVoiceOutput,
  onInterrupt,
  onSendText,
  onRetryConnect,
  onClose,
}) => {
  const [showCaptions, setShowCaptions] = useState(true);
  const [showTextComposer, setShowTextComposer] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [orbSize, setOrbSize] = useState(328);
  const captionsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncSize = () => {
      if (typeof window === 'undefined') return;
      setOrbSize(window.innerWidth < 640 ? 256 : 328);
    };
    syncSize();
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const recentCaptions = turns.slice(-4);

  useEffect(() => {
    if (!showCaptions) return;
    captionsEndRef.current?.scrollIntoView({
      behavior: animationComplexity === 'minimal' ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [
    recentCaptions.length,
    liveDrafts.input,
    liveDrafts.output,
    showCaptions,
    animationComplexity,
  ]);

  const canInterrupt =
    liveMode &&
    !liveHoldPaused &&
    (orbState === 'speaking' || orbState === 'generating' || orbState === 'processing');

  const isMinimal = animationComplexity === 'minimal';

  const voiceStateTitle = liveConnecting
    ? 'Connecting'
    : statusError || orbState === 'error'
      ? 'Error'
      : liveHoldPaused
        ? 'Paused'
        : orbState === 'speaking'
          ? 'Speaking'
          : orbState === 'thinking' || orbState === 'processing' || orbState === 'generating'
            ? 'Thinking'
            : isListening
              ? 'Listening'
              : 'Ready';

  const stageStatusMessage = liveConnecting
    ? 'Connecting full-duplex ARORA Live Chat...'
    : statusError
      ? 'Connection interrupted — tap Reconnect below'
      : liveHoldPaused
        ? 'Live Chat on hold · Tap Play to resume conversation'
        : !isListening
          ? 'Microphone muted · Tap Mic to speak'
          : orbState === 'speaking'
            ? 'ARORA is speaking · Speak anytime or tap orb to interrupt'
            : orbState === 'thinking' || orbState === 'processing'
              ? 'Thinking...'
              : 'Listening · Speak naturally, just like a real conversation';

  const voiceLabel =
    voicePersona === 'Zephyr'
      ? 'Zephyr'
      : voicePersona === 'Kore'
        ? 'Kore'
        : voicePersona === 'Puck'
          ? 'Puck'
          : 'Natural';

  const langLabel =
    language === 'tamil' ? 'Tamil' : language === 'tanglish' ? 'Tanglish' : 'Indian English';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="ARORA Live Chat"
          initial={isMinimal ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={isMinimal ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          transition={{ duration: isMinimal ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden text-white ${
            isMinimal ? 'bg-slate-950' : 'bg-slate-950/94 holo-blur'
          }`}
          style={
            isMinimal
              ? undefined
              : {
                  backgroundImage:
                    orbState === 'speaking'
                      ? 'radial-gradient(ellipse 70% 55% at 50% 44%, rgba(34, 211, 238, 0.20), transparent 70%), radial-gradient(ellipse 55% 45% at 50% 85%, rgba(139, 92, 246, 0.14), transparent 72%)'
                      : isListening && !liveHoldPaused
                        ? 'radial-gradient(ellipse 68% 52% at 50% 44%, rgba(16, 185, 129, 0.16), transparent 70%), radial-gradient(ellipse 52% 45% at 50% 85%, rgba(56, 189, 248, 0.14), transparent 72%)'
                        : 'radial-gradient(ellipse 60% 48% at 50% 44%, rgba(56, 189, 248, 0.10), transparent 72%)',
                }
          }
        >
          {/* Minimal Top Glass Bar */}
          <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pt-4 pb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg font-display font-semibold tracking-tight text-white">
                  ARORA Live
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="text-xs font-medium text-cyan-300 truncate">
                  {voiceLabel} · {langLabel}
                  {latencyMs !== null ? ` · ${latencyMs}ms` : ''}
                </span>
              </div>
              {contextSubtitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{contextSubtitle}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={voicePersona}
                onChange={(e) => onChangeVoicePersona(e.target.value as VoicePersona)}
                aria-label="Live Chat voice persona"
                className="px-3 py-1.5 rounded-xl bg-white/8 border border-white/15 text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60 min-h-[38px]"
              >
                <option value="Zephyr" className="bg-slate-900 text-white">
                  Voice: Zephyr
                </option>
                <option value="Kore" className="bg-slate-900 text-white">
                  Voice: Kore
                </option>
                <option value="Puck" className="bg-slate-900 text-white">
                  Voice: Puck
                </option>
                <option value="device_natural" className="bg-slate-900 text-white">
                  Voice: Natural
                </option>
              </select>

              <select
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as LanguageMode)}
                aria-label="Live Chat language"
                className="px-3 py-1.5 rounded-xl bg-white/8 border border-white/15 text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60 min-h-[38px]"
              >
                <option value="indian_english" className="bg-slate-900 text-white">
                  Indian English
                </option>
                <option value="tamil" className="bg-slate-900 text-white">
                  Tamil (தமிழ்)
                </option>
                <option value="tanglish" className="bg-slate-900 text-white">
                  Tanglish
                </option>
              </select>

              <button
                type="button"
                onClick={() => setShowCaptions((v) => !v)}
                aria-pressed={showCaptions}
                aria-label={showCaptions ? 'Hide live captions' : 'Show live captions'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium glass-press min-h-[38px] ${
                  showCaptions
                    ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-200'
                    : 'bg-white/6 border-white/12 text-slate-300 hover:text-white'
                }`}
              >
                <Captions className="w-4 h-4" />
                <span className="hidden sm:inline">Captions</span>
              </button>

              <button
                type="button"
                onClick={onToggleVoiceOutput}
                aria-label={voiceOutputEnabled ? 'Mute ARORA audio' : 'Unmute ARORA audio'}
                className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-white/6 border border-white/12 text-slate-200 hover:bg-white/12 glass-press"
              >
                {voiceOutputEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-300" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </header>

          {/* Center Harmonic Voice Stage */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
            <div
              role="button"
              tabIndex={0}
              aria-label={
                canInterrupt
                  ? 'Tap orb to interrupt ARORA AI'
                  : 'ARORA Live Chat harmonic visualizer'
              }
              onClick={() => {
                if (canInterrupt) onInterrupt();
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && canInterrupt) {
                  e.preventDefault();
                  onInterrupt();
                }
              }}
              className={`flex flex-col items-center ${canInterrupt ? 'cursor-pointer' : ''}`}
            >
              <VoiceWaveVisualizer
                micAnalyser={micAnalyser}
                aiAnalyser={aiAnalyser}
                liveClientRef={liveClientRef}
                orbState={liveHoldPaused ? 'idle' : orbState}
                complexity={animationComplexity}
                liveMode={liveMode && !liveHoldPaused}
                isListening={isListening && !liveHoldPaused}
                size={orbSize}
              />
            </div>

            <div className="mt-2 flex flex-col items-center gap-1 px-4 text-center max-w-md">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  voiceStateTitle === 'Error'
                    ? 'text-rose-400'
                    : voiceStateTitle === 'Speaking'
                      ? 'text-cyan-300'
                      : voiceStateTitle === 'Listening'
                        ? 'text-emerald-300'
                        : voiceStateTitle === 'Thinking' || voiceStateTitle === 'Connecting'
                          ? 'text-violet-300'
                          : 'text-amber-300'
                }`}
              >
                {voiceStateTitle}
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-200">
                {stageStatusMessage}
              </p>
            </div>

            {statusError && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-100 max-w-md text-center">
                <span>{statusError}</span>
                <button
                  type="button"
                  onClick={onRetryConnect}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold glass-press"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reconnect
                </button>
              </div>
            )}

            {/* Live Translucent Caption Stream */}
            {showCaptions &&
              (recentCaptions.length > 0 ||
                liveDrafts.input.trim().length > 0 ||
                liveDrafts.output.trim().length > 0) && (
                <div
                  className={`mt-4 w-full max-w-2xl max-h-36 sm:max-h-44 overflow-y-auto px-4 py-3 rounded-2xl border border-white/10 space-y-2 text-xs sm:text-sm ${
                    isMinimal ? 'bg-slate-900/95' : 'bg-white/[0.045] backdrop-blur-xl'
                  }`}
                >
                  {recentCaptions.map((item) => (
                    <div
                      key={item.id}
                      className={`leading-relaxed ${
                        item.speaker === 'student' ? 'text-emerald-200' : 'text-slate-100'
                      }`}
                    >
                      <span className="font-semibold text-[11px] uppercase tracking-wider mr-2 text-slate-400">
                        {item.speaker === 'student' ? 'You' : 'ARORA'}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                  {liveDrafts.input.trim() && (
                    <div className="text-emerald-200 leading-relaxed">
                      <span className="font-semibold text-[11px] uppercase tracking-wider mr-2 text-emerald-400">
                        You
                      </span>
                      <span>{liveDrafts.input}</span>
                    </div>
                  )}
                  {liveDrafts.output.trim() && (
                    <div className="text-cyan-100 leading-relaxed">
                      <span className="font-semibold text-[11px] uppercase tracking-wider mr-2 text-cyan-400">
                        ARORA
                      </span>
                      <span>{liveDrafts.output}</span>
                    </div>
                  )}
                  <div ref={captionsEndRef} />
                </div>
              )}

            {/* Optional Text Injection Composer into Live WebSocket */}
            {showTextComposer && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = draftText.trim();
                  if (!trimmed) return;
                  setDraftText('');
                  onSendText(trimmed);
                }}
                className="mt-3 w-full max-w-xl flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-xl"
              >
                <input
                  type="text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Type a question or formula into Live Chat..."
                  className="flex-1 bg-transparent border-0 text-sm text-white placeholder:text-slate-400 focus:outline-none px-1"
                />
                <button
                  type="submit"
                  disabled={!draftText.trim() || !liveMode}
                  aria-label="Send text to Live Chat"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white glass-press"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </main>

          {/* Bottom Gemini Live–Style Control Dock */}
          <footer className="relative z-10 flex items-center justify-center px-4 pb-7 pt-3">
            <div
              className={`inline-flex items-center gap-3 sm:gap-4 px-5 py-3 rounded-full border border-white/15 shadow-2xl ${
                isMinimal ? 'bg-slate-900/95' : 'bg-white/[0.07] backdrop-blur-2xl'
              }`}
            >
              {/* Hold / Pause */}
              <button
                type="button"
                onClick={onToggleHoldPause}
                disabled={!liveMode && !liveConnecting}
                aria-label={liveHoldPaused ? 'Resume Live Chat' : 'Pause Live Chat'}
                title={liveHoldPaused ? 'Resume' : 'Pause'}
                className={`inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full border glass-press transition-colors disabled:opacity-40 ${
                  liveHoldPaused
                    ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                    : 'bg-white/10 hover:bg-white/16 border-white/15 text-white'
                }`}
              >
                {liveHoldPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>

              {/* Mic Mute / Unmute */}
              <button
                type="button"
                onClick={onToggleMic}
                disabled={!liveMode}
                aria-label={isListening && !liveHoldPaused ? 'Mute microphone' : 'Unmute microphone'}
                title={isListening && !liveHoldPaused ? 'Mute Mic' : 'Unmute Mic'}
                className={`inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full border glass-press transition-colors disabled:opacity-40 ${
                  isListening && !liveHoldPaused
                    ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200 shadow-[0_0_24px_-4px_rgba(34,211,238,0.55)]'
                    : 'bg-white/12 border-white/20 text-slate-300'
                }`}
              >
                {isListening && !liveHoldPaused ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5 text-rose-300" />
                )}
              </button>

              {/* Toggle Text Input Drawer */}
              <button
                type="button"
                onClick={() => setShowTextComposer((v) => !v)}
                aria-pressed={showTextComposer}
                aria-label="Toggle text input in Live Chat"
                title="Type into Live Chat"
                className={`inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full border glass-press transition-colors ${
                  showTextComposer
                    ? 'bg-violet-500/25 border-violet-400/50 text-violet-200'
                    : 'bg-white/10 hover:bg-white/16 border-white/15 text-white'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Instant Barge-In / Interrupt */}
              {canInterrupt && (
                <button
                  type="button"
                  onClick={onInterrupt}
                  aria-label="Interrupt ARORA response"
                  title="Interrupt"
                  className="inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white/12 hover:bg-white/20 border border-rose-400/50 text-rose-300 glass-press"
                >
                  <StopCircle className="w-5 h-5" />
                </button>
              )}

              {/* End Live Chat (Signature Crimson Close Button) */}
              <button
                type="button"
                onClick={onClose}
                aria-label="End Live Chat"
                title="End Live Chat"
                className="inline-flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 shadow-[0_10px_28px_-6px_rgba(244,63,94,0.65)] glass-press"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
