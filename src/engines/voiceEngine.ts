import { detectDiagramRequest } from './diagramUtils.ts';
import type { ChatbotMode, LanguageMode, SubjectId, VoicePersona } from '../types/arora';

export interface VoiceAvailabilityReport {
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  neuralVoiceAvailable: boolean;
  installedIndianEnglishVoices: { name: string; localService: boolean }[];
  installedTamilVoices: { name: string; localService: boolean }[];
  offlineIndianEnglishAvailable: boolean;
  offlineTamilAvailable: boolean;
  honestStatusNote: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

let preferredVoicePersona: VoicePersona = 'Zephyr';
let activePlaybackToken = 0;
let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeTtsAbort: AbortController | null = null;
let activeTtsTimeoutId: number | null = null;
let activeRecognitionStop: (() => void) | null = null;
let ttsAudioCtx: AudioContext | null = null;
let ttsAnalyser: AnalyserNode | null = null;
let ttsMediaSource: MediaElementAudioSourceNode | null = null;

export function getTtsOutputAnalyser(): AnalyserNode | null {
  return activeAudioElement && ttsAnalyser ? ttsAnalyser : null;
}

export function setAroraVoicePersona(persona: VoicePersona): void {
  preferredVoicePersona = persona;
}

export function getAroraVoicePersona(): VoicePersona {
  return preferredVoicePersona;
}

export function formatTextForNaturalSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' Here is the code example displayed on screen. ')
    .replace(/[*_`#>]/g, '')
    .replace(/\u2192|->/g, ' leads to ')
    .replace(/\u03bb/g, ' lambda ')
    .replace(/\u03bc/g, ' micro ')
    .replace(/\u0394/g, ' delta ')
    .replace(/\u03b8/g, ' theta ')
    .replace(/\u03b5\u2080|\u03b50/g, ' epsilon naught ')
    .replace(/\u03c0/g, ' pi ')
    .replace(/\u03a9/g, ' ohm ')
    .replace(/(\d+)\s*\^\s*(\d+)/g, '$1 to the power of $2')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1400);
}

function pickBestNaturalVoice(
  voices: SpeechSynthesisVoice[],
  mode: LanguageMode,
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    let score = 0;
    if (mode === 'tamil') {
      if (lang.startsWith('ta-in')) score += 60;
      else if (lang.startsWith('ta')) score += 45;
    } else {
      if (lang === 'en-in') score += 60;
      else if (lang.startsWith('en')) score += 30;
    }
    // Prefer human/Siri-quality neural voices over robotic defaults
    if (name.includes('siri')) score += 50;
    if (name.includes('natural') || name.includes('neural')) score += 40;
    if (name.includes('enhanced') || name.includes('premium')) score += 32;
    if (name.includes('rishi') || name.includes('veena') || name.includes('samantha') || name.includes('ava')) score += 30;
    if (name.includes('google')) score += 24;
    if (name.includes('espeak') || name.includes('festival')) score -= 40;
    return score;
  };

  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export function inspectDeviceVoiceCapabilities(): VoiceAvailabilityReport {
  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
  const hasRec = Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  const hasSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  let voices: SpeechSynthesisVoice[] = [];
  if (hasSynth) {
    try {
      voices = window.speechSynthesis.getVoices();
    } catch {
      voices = [];
    }
  }

  const enIn = voices
    .filter((v) => v.lang.toLowerCase().startsWith('en-in') || v.name.toLowerCase().includes('india'))
    .map((v) => ({ name: v.name, localService: v.localService }));

  const taIn = voices
    .filter((v) => v.lang.toLowerCase().startsWith('ta') || v.name.toLowerCase().includes('tamil'))
    .map((v) => ({ name: v.name, localService: v.localService }));

  const offlineIndianEnglishAvailable = enIn.some((v) => v.localService);
  const offlineTamilAvailable = taIn.some((v) => v.localService);

  let honestStatusNote = '';
  if (isOnline) {
    honestStatusNote =
      'ARORA Neural Siri-Like Voice Engine & Full-Duplex Live WebSocket Audio are active online.';
  } else if (!hasSynth && !hasRec) {
    honestStatusNote = 'Browser Web Speech APIs are unavailable on this device; text mode remains active.';
  } else if (offlineTamilAvailable && offlineIndianEnglishAvailable) {
    honestStatusNote = 'Network reconnecting — Both Indian English (en-IN) and Tamil (ta-IN) device voices detected.';
  } else if (enIn.length > 0 || taIn.length > 0) {
    honestStatusNote =
      'Network reconnecting — Device voices detected; reconnect online for ARORA Neural Voice.';
  } else {
    honestStatusNote =
      'Network reconnecting — Connect online for ARORA fluent human neural voice.';
  }

  return {
    speechRecognitionSupported: hasRec,
    speechSynthesisSupported: hasSynth,
    neuralVoiceAvailable: isOnline,
    installedIndianEnglishVoices: enIn,
    installedTamilVoices: taIn,
    offlineIndianEnglishAvailable,
    offlineTamilAvailable,
    honestStatusNote,
  };
}

export function getSpeechLocaleForMode(mode: LanguageMode): string {
  if (mode === 'tamil') return 'ta-IN';
  return 'en-IN';
}

let activeProgressIntervalId: number | null = null;

function cleanupActiveAudio(): void {
  if (activeProgressIntervalId !== null && typeof window !== 'undefined') {
    window.clearInterval(activeProgressIntervalId);
    activeProgressIntervalId = null;
  }
  if (activeTtsTimeoutId !== null && typeof window !== 'undefined') {
    window.clearTimeout(activeTtsTimeoutId);
    activeTtsTimeoutId = null;
  }
  if (activeTtsAbort) {
    try {
      activeTtsAbort.abort();
    } catch {
      // ignore abort error
    }
    activeTtsAbort = null;
  }
  if (ttsMediaSource) {
    try {
      ttsMediaSource.disconnect();
    } catch {
      // ignore disconnect error
    }
    ttsMediaSource = null;
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.onplay = null;
      activeAudioElement.ontimeupdate = null;
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.removeAttribute('src');
      activeAudioElement.load();
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }
  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch {
      // ignore
    }
    activeAudioUrl = null;
  }
}

export function stopAroraSpeech(): void {
  activePlaybackToken += 1;
  cleanupActiveAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Releases all speech recognition and TTS AudioContext memory on exit or low-RAM cleanup.
 */
export function releaseVoiceAudioResources(): void {
  stopAroraSpeech();
  if (activeRecognitionStop) {
    try {
      activeRecognitionStop();
    } catch {
      // ignore
    }
    activeRecognitionStop = null;
  }
  if (ttsAnalyser) {
    try {
      ttsAnalyser.disconnect();
    } catch {
      // ignore
    }
    ttsAnalyser = null;
  }
  if (ttsAudioCtx) {
    try {
      void ttsAudioCtx.close().catch(() => {});
    } catch {
      // ignore
    }
    ttsAudioCtx = null;
  }
}

function speakViaNaturalBrowserFallback(
  cleanedText: string,
  mode: LanguageMode,
  token: number,
  callbacks?: {
    onStart?: () => void;
    onProgress?: (fraction: number, elapsedMs: number) => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
  },
  rateMultiplier = 1,
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onProgress?.(1, 0);
    callbacks?.onError?.('Speech synthesis not supported on this browser.');
    return false;
  }

  try {
    if (token !== activePlaybackToken) return false;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const voices = window.speechSynthesis.getVoices();
    const chosen = pickBestNaturalVoice(voices, mode);
    if (chosen) utterance.voice = chosen;

    const clampedRate = Math.min(1.35, Math.max(0.75, rateMultiplier));
    if (mode === 'tamil') {
      utterance.lang = 'ta-IN';
      utterance.rate = Number((0.96 * clampedRate).toFixed(2));
      utterance.pitch = 1.02;
    } else {
      utterance.lang = 'en-IN';
      utterance.rate = Number((1.01 * clampedRate).toFixed(2));
      utterance.pitch = 1.03;
    }

    let startedAt = 0;
    const estDurationMs = Math.max(1200, (cleanedText.length / (14.5 * clampedRate)) * 1000);
    let highestFraction = 0;

    const clearTimer = () => {
      if (activeProgressIntervalId !== null) {
        window.clearInterval(activeProgressIntervalId);
        activeProgressIntervalId = null;
      }
    };

    utterance.onstart = () => {
      if (token !== activePlaybackToken) return;
      startedAt = Date.now();
      callbacks?.onStart?.();
      callbacks?.onProgress?.(0.02, 0);
      if (callbacks?.onProgress) {
        clearTimer();
        activeProgressIntervalId = window.setInterval(() => {
          if (token !== activePlaybackToken) {
            clearTimer();
            return;
          }
          const elapsed = Math.max(0, Date.now() - startedAt);
          const estFrac = Math.min(0.96, elapsed / estDurationMs);
          if (estFrac > highestFraction) {
            highestFraction = estFrac;
            callbacks.onProgress?.(highestFraction, elapsed);
          }
        }, 120);
      }
    };

    utterance.onboundary = (ev) => {
      if (token !== activePlaybackToken || !callbacks?.onProgress) return;
      const elapsed = startedAt ? Date.now() - startedAt : 0;
      const charFrac = Math.min(0.98, (ev.charIndex + 1) / Math.max(1, cleanedText.length));
      if (charFrac > highestFraction) {
        highestFraction = charFrac;
        callbacks.onProgress(highestFraction, elapsed);
      }
    };

    utterance.onend = () => {
      clearTimer();
      if (token === activePlaybackToken) {
        callbacks?.onProgress?.(1, startedAt ? Date.now() - startedAt : 0);
        callbacks?.onEnd?.();
      }
    };
    utterance.onerror = (ev) => {
      clearTimer();
      if (token === activePlaybackToken && ev.error !== 'interrupted' && ev.error !== 'canceled') {
        callbacks?.onProgress?.(1, startedAt ? Date.now() - startedAt : 0);
        callbacks?.onError?.(ev.error || 'TTS playback error');
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    if (token === activePlaybackToken) {
      callbacks?.onProgress?.(1, 0);
      callbacks?.onError?.(err instanceof Error ? err.message : 'TTS failed');
    }
    return false;
  }
}

export function speakAroraText(
  text: string,
  mode: LanguageMode,
  callbacks?: {
    onStart?: () => void;
    onProgress?: (fraction: number, elapsedMs: number) => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
  },
  options?: {
    preferNeural?: boolean;
    voicePersona?: VoicePersona;
    rateMultiplier?: number;
  },
): boolean {
  if (typeof window === 'undefined') return false;

  stopAroraSpeech();
  const token = activePlaybackToken;
  const cleaned = formatTextForNaturalSpeech(text);
  if (!cleaned) {
    callbacks?.onProgress?.(1, 0);
    callbacks?.onEnd?.();
    return false;
  }

  const rateMultiplier = Math.min(1.35, Math.max(0.75, options?.rateMultiplier ?? 1));
  const persona = options?.voicePersona ?? preferredVoicePersona;
  const shouldUseNeural =
    options?.preferNeural !== false &&
    persona !== 'device_natural' &&
    typeof navigator !== 'undefined' &&
    navigator.onLine;

  if (!shouldUseNeural) {
    return speakViaNaturalBrowserFallback(cleaned, mode, token, callbacks, rateMultiplier);
  }

  const controller = new AbortController();
  activeTtsAbort = controller;
  activeTtsTimeoutId = window.setTimeout(() => controller.abort(), 7000);

  void (async () => {
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: cleaned,
          language: mode,
          voicePersona: persona,
        }),
      });
      if (activeTtsTimeoutId !== null) {
        window.clearTimeout(activeTtsTimeoutId);
        activeTtsTimeoutId = null;
      }

      if (token !== activePlaybackToken) return;
      if (!res.ok) {
        throw new Error(`Neural TTS HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!data.audioBase64 || token !== activePlaybackToken) {
        throw new Error('Empty neural audio payload');
      }

      const byteChars = atob(data.audioBase64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) {
        byteArr[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArr], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);

      if (token !== activePlaybackToken) {
        URL.revokeObjectURL(url);
        return;
      }

      const audio = new Audio(url);
      audio.playbackRate = rateMultiplier;
      activeAudioElement = audio;
      activeAudioUrl = url;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!ttsAudioCtx) {
            ttsAudioCtx = new AudioCtx();
          }
          if (ttsAudioCtx.state === 'suspended') {
            void ttsAudioCtx.resume();
          }
          if (!ttsAnalyser) {
            ttsAnalyser = ttsAudioCtx.createAnalyser();
            ttsAnalyser.fftSize = 128;
            ttsAnalyser.smoothingTimeConstant = 0.74;
          }
          ttsMediaSource = ttsAudioCtx.createMediaElementSource(audio);
          ttsMediaSource.connect(ttsAnalyser);
          ttsAnalyser.connect(ttsAudioCtx.destination);
        }
      } catch {
        // Safe fallback: play through standard HTMLAudioElement output without analyser tap
      }

      let highestFraction = 0;
      const emitAudioProgress = () => {
        if (token !== activePlaybackToken || !callbacks?.onProgress) return;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const frac = duration > 0 ? Math.min(0.99, audio.currentTime / duration) : highestFraction;
        if (frac >= highestFraction) {
          highestFraction = frac;
          callbacks.onProgress(highestFraction, Math.round(audio.currentTime * 1000));
        }
      };

      audio.onplay = () => {
        if (token !== activePlaybackToken) return;
        callbacks?.onStart?.();
        callbacks?.onProgress?.(0.02, 0);
        if (callbacks?.onProgress) {
          if (activeProgressIntervalId !== null) window.clearInterval(activeProgressIntervalId);
          activeProgressIntervalId = window.setInterval(emitAudioProgress, 100);
        }
      };
      audio.ontimeupdate = emitAudioProgress;
      audio.onended = () => {
        cleanupActiveAudio();
        if (token === activePlaybackToken) {
          callbacks?.onProgress?.(1, Math.round((audio.duration || 0) * 1000));
          callbacks?.onEnd?.();
        }
      };
      audio.onerror = () => {
        cleanupActiveAudio();
        if (token === activePlaybackToken) {
          speakViaNaturalBrowserFallback(cleaned, mode, token, callbacks, rateMultiplier);
        }
      };

      await audio.play();
    } catch {
      if (activeTtsTimeoutId !== null) {
        window.clearTimeout(activeTtsTimeoutId);
        activeTtsTimeoutId = null;
      }
      if (token !== activePlaybackToken) return;
      speakViaNaturalBrowserFallback(cleaned, mode, token, callbacks, rateMultiplier);
    }
  })();

  return true;
}

export function startVoiceRecognition(
  mode: LanguageMode,
  onTranscript: (text: string) => void,
  onEnd: () => void,
  onError: (message: string) => void,
): (() => void) | null {
  if (typeof window === 'undefined') return null;

  // Guard against overlapping speech playback and duplicate microphone initialization
  stopAroraSpeech();
  if (activeRecognitionStop) {
    try {
      activeRecognitionStop();
    } catch {
      // ignore prior stop error
    }
    activeRecognitionStop = null;
  }

  const win = window as unknown as Record<string, unknown>;
  const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as
    | SpeechRecognitionCtor
    | undefined;

  if (!Ctor) {
    onError('Speech recognition is unavailable in this browser. Use text input below.');
    return null;
  }

  try {
    const rec = new Ctor();
    rec.lang = getSpeechLocaleForMode(mode);
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let stopped = false;

    const cleanupRec = () => {
      if (stopped) return;
      stopped = true;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      if (activeRecognitionStop === stopFn) {
        activeRecognitionStop = null;
      }
      try {
        rec.stop();
      } catch {
        // Ignore already stopped
      }
    };

    const stopFn = () => {
      cleanupRec();
    };

    rec.onresult = (ev) => {
      const result = ev.results?.[0]?.[0]?.transcript || '';
      if (result.trim()) onTranscript(result.trim());
    };
    rec.onerror = (ev) => {
      if (ev.error === 'aborted' || ev.error === 'no-speech') {
        return;
      }
      const friendly =
        ev.error === 'not-allowed' || ev.error === 'service-not-allowed'
          ? 'Microphone permission denied. Please enable mic access in your browser.'
          : ev.error === 'audio-capture'
            ? 'No working microphone found or mic is busy in another app.'
            : ev.error === 'network'
              ? 'Speech recognition network error. Check connection or type below.'
              : `Voice recognition error: ${ev.error}`;
      onError(friendly);
    };
    rec.onend = () => {
      cleanupRec();
      onEnd();
    };
    activeRecognitionStop = stopFn;
    rec.start();

    return stopFn;
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Unable to start microphone');
    return null;
  }
}

export function detectSpokenInteractiveCommand(utterance: string): string | undefined {
  const u = utterance.toLowerCase().trim();
  const hasInteractiveOn =
    u.includes('interactive mode on') ||
    u.includes('intractive mode on') ||
    u.includes('start interactive mode') ||
    u.includes('turn on interactive mode') ||
    u.includes('open virtual classroom') ||
    u.includes('start virtual classroom');
  if (hasInteractiveOn) return 'activate';

  if (
    u.includes('live mode on') ||
    (u.includes('live chat') &&
      !u.includes('off') &&
      !u.includes('end') &&
      !u.includes('stop') &&
      !u.includes('close') &&
      !u.includes('exit')) ||
    u.includes('go live') ||
    u.includes('start live mode') ||
    u.includes('turn on live mode')
  ) {
    return 'live_on';
  }

  if (
    u.includes('live mode off') ||
    u.includes('live chat off') ||
    u.includes('end live chat') ||
    u.includes('close live chat') ||
    u.includes('exit live chat') ||
    u.includes('stop live chat') ||
    u.includes('stop live mode') ||
    u.includes('turn off live mode') ||
    u.includes('exit live mode')
  ) {
    return 'live_off';
  }

  if (
    u === 'stop' ||
    u === 'interrupt' ||
    u === 'wait' ||
    u === 'hold on' ||
    u.includes('stop speaking') ||
    u.includes('stop talking')
  ) {
    return 'interrupt';
  }

  if (
    u.includes('interactive mode off') ||
    u.includes('intractive mode off') ||
    u.includes('exit interactive mode') ||
    u.includes('casual mode') ||
    u.includes('normal mode') ||
    u.includes('end class') ||
    u.includes('stop class')
  ) {
    return 'end_class';
  }

  if (u.includes('clear the board') || u.includes('clear board') || u.includes('erase the board') || u.includes('clean the board')) {
    return 'clear_board';
  }
  if (u.includes('write that on the board') || u.includes('write on the board') || u.includes('write on board') || u.includes('put that on the board')) {
    return 'write_on_board';
  }
  if (u.includes('zoom in')) return 'zoom_in';
  if (u.includes('zoom out')) return 'zoom_out';
  if (u.includes('reset zoom')) return 'reset_zoom';
  if (u.includes('solve step by step') || u.includes('step by step solution') || u.includes('solve it step by step')) {
    return 'solve_step_by_step';
  }
  if (u.includes('slow down') || u.includes('teach slower') || u.includes('speak slower')) {
    return 'slow_down';
  }
  if (u.includes('speed up') || u.includes('teach faster') || u.includes('normal speed')) {
    return 'speed_up';
  }
  if (u.includes('ask me a question') || u.includes('quiz me') || u.includes('test me now')) {
    return 'ask_question';
  }

  if (u.includes('explain again') || u.includes('thirumba sollunga') || u.includes('repeat explanation'))
    return 'explain_again';
  if (u.includes('give an example') || u.includes('give another example') || u.includes('another example') || u.includes('example'))
    return 'give_example';
  if (u.includes('make it easier') || u.includes('easier') || u.includes('simple'))
    return 'make_easier';
  if (u.includes('ask harder') || u.includes('harder')) return 'make_harder';
  if (u.includes('give a hint') || u.includes('hint')) return 'give_hint';
  if (u.includes('repeat the formula') || u.includes('formula')) return 'repeat_formula';
  if (u.includes('next topic') || u.includes('move to the next topic')) return 'next_topic';
  if (u === 'pause' || u.includes('pause class') || u.includes('pause the class')) return 'pause';
  if (u === 'resume' || u.includes('resume class') || u.includes('resume the class')) return 'resume';
  if (u.includes('reveal answer') || u.includes('tell me the answer')) return 'reveal';
  return undefined;
}

export type GlobalWorkspaceTarget =
  | 'curriculum'
  | 'question_bank'
  | 'pyq_guides'
  | 'mock_tests'
  | 'interactive_teacher'
  | 'chatbot'
  | 'system';

export interface GlobalVoiceNavigationIntent {
  target: GlobalWorkspaceTarget;
  subjectId?: SubjectId;
  autoStartMockTest?: boolean;
  pyqOnly?: boolean;
  totalMarks?: 20 | 30 | 40 | 70 | 80;
  spokenConfirmation: string;
}

const SUBJECT_MATCHERS: { id: SubjectId; label: string; regex: RegExp }[] = [
  { id: 'physics', label: 'Physics', regex: /\bphysics\b/i },
  { id: 'chemistry', label: 'Chemistry', regex: /\bchemistry\b/i },
  { id: 'mathematics', label: 'Mathematics', regex: /\b(?:mathematics|maths|math)\b/i },
  { id: 'biology', label: 'Biology', regex: /\bbiology\b/i },
  { id: 'english', label: 'English', regex: /\benglish\b/i },
  {
    id: 'computer_science',
    label: 'Computer Science',
    regex: /\b(?:computer\s+science|comp\s+sci|cs|python)\b/i,
  },
];

const NAV_VERB_REGEX =
  /\b(show(?:\s+me)?|open|go\s+to|navigate\s+to|switch\s+to|launch|start|begin|take(?:\s+me\s+to)?|bring\s+up|display|view|give\s+me|load)\b/i;

const EXPLANATION_QUESTION_REGEX =
  /^(?:what\s+(?:is|are)|why\s+(?:is|are|do|does)|how\s+(?:to|do|does|many)|explain|define|tell\s+me\s+about|compare|difference\s+between)\b/i;

const ALLOWED_MARK_COUNTS = [20, 30, 40, 70, 80] as const;

/**
 * Parses global hands-free navigation voice commands such as:
 * - "Arora, show me the syllabus"
 * - "Arora, start a mock test for Physics"
 * - "Arora, open Chemistry previous year questions"
 */
export function detectGlobalNavigationCommand(
  utterance: string,
): GlobalVoiceNavigationIntent | undefined {
  const cleaned = utterance
    .replace(/^(?:hey\s+|ok\s+|hi\s+)?arora[\s,.:;-]*/i, '')
    .trim();

  if (!cleaned) return undefined;

  const lower = cleaned.toLowerCase();

  // Never hijack normal conceptual questions like "What is the syllabus of Electrostatics?"
  if (EXPLANATION_QUESTION_REGEX.test(lower) && !NAV_VERB_REGEX.test(lower)) {
    return undefined;
  }

  const matchedSubject = SUBJECT_MATCHERS.find((s) => s.regex.test(lower));
  const hasNavVerb = NAV_VERB_REGEX.test(lower);

  // 1. Mock Test commands (check before generic syllabus/subject checks)
  const mentionsMockTest =
    /\b(mock\s*tests?|practice\s+test|sample\s+test|model\s+test|test\s+arena|board\s+test)\b/i.test(
      lower,
    );
  if (mentionsMockTest && (hasNavVerb || /^(?:mock\s*tests?|start\s+mock\s*test)/i.test(lower))) {
    const autoStart = /\b(start|begin|launch|take|create|generate|give\s+me)\b/i.test(lower);
    const pyqOnly = /\b(pyq|previous\s+year)\b/i.test(lower);
    const marksMatch = lower.match(/\b(20|30|40|70|80)\s*(?:marks?|m)\b/i);
    const parsedMarks = marksMatch
      ? (Number(marksMatch[1]) as (typeof ALLOWED_MARK_COUNTS)[number])
      : undefined;
    const totalMarks =
      parsedMarks && ALLOWED_MARK_COUNTS.includes(parsedMarks) ? parsedMarks : undefined;
    const subjectLabel = matchedSubject?.label || 'Physics';

    return {
      target: 'mock_tests',
      subjectId: matchedSubject?.id || (autoStart ? 'physics' : undefined),
      autoStartMockTest: autoStart,
      pyqOnly,
      totalMarks,
      spokenConfirmation: autoStart
        ? `Starting a ${totalMarks ? `${totalMarks}-mark ` : ''}${pyqOnly ? 'PYQ ' : ''}${subjectLabel} mock test now.`
        : `Opening Mock Tests${matchedSubject ? ` for ${matchedSubject.label}` : ''}.`,
    };
  }

  // 2. Curriculum / Syllabus commands
  const mentionsSyllabus =
    /\b(syllabus|curriculum|portion|portions|ncert\s+chapters?|year\s+library)\b/i.test(lower);
  if (
    mentionsSyllabus &&
    (hasNavVerb || /^(?:the\s+)?(?:syllabus|curriculum|portion)$/i.test(lower))
  ) {
    return {
      target: 'curriculum',
      subjectId: matchedSubject?.id,
      spokenConfirmation: matchedSubject
        ? `Opening the CBSE Class 12 ${matchedSubject.label} syllabus.`
        : 'Opening the CBSE Class 12 Syllabus & Curriculum Library.',
    };
  }

  // 3. PYQs & Guides workspace
  const mentionsPyq =
    /\b(pyqs?|previous\s+year\s+(?:questions?|papers?)|paper\s+guides?)\b/i.test(lower);
  if (mentionsPyq && (hasNavVerb || /^(?:pyqs?|previous\s+year\s+papers?)$/i.test(lower))) {
    return {
      target: 'pyq_guides',
      subjectId: matchedSubject?.id,
      spokenConfirmation: matchedSubject
        ? `Showing Previous Year Questions and guides for ${matchedSubject.label}.`
        : 'Opening the Previous Year Questions & Paper Guides archive.',
    };
  }

  // 4. Question Bank workspace
  const mentionsQuestionBank = /\bquestion\s+bank\b/i.test(lower);
  if (mentionsQuestionBank && (hasNavVerb || /^question\s+bank$/i.test(lower))) {
    return {
      target: 'question_bank',
      subjectId: matchedSubject?.id,
      spokenConfirmation: matchedSubject
        ? `Opening the ${matchedSubject.label} Question Bank.`
        : 'Opening the CBSE Question Bank.',
    };
  }

  // 5. Chatbot workspace
  const mentionsChatbot =
    /\b(chat\s*bot|arora\s+chat|chat\s+workspace|text\s+chat)\b/i.test(lower);
  if (mentionsChatbot && hasNavVerb) {
    return {
      target: 'chatbot',
      spokenConfirmation: 'Switching to the ARORA Chat Workspace.',
    };
  }

  // 6. System & Profile workspace
  const mentionsSystem =
    /\b(system(?:\s+and\s+profile)?|settings|profile|diagnostics)\b/i.test(lower);
  if (mentionsSystem && hasNavVerb) {
    return {
      target: 'system',
      spokenConfirmation: 'Opening System Settings and Student Profile.',
    };
  }

  // 7. Return to AI Teacher workspace
  const mentionsTeacher = /\b(ai\s+teacher|interactive\s+teacher|teacher\s+workspace)\b/i.test(
    lower,
  );
  if (mentionsTeacher && hasNavVerb) {
    return {
      target: 'interactive_teacher',
      spokenConfirmation: 'Opening ARORA AI Teacher.',
    };
  }

  return undefined;
}

export type SmartVoiceAction =
  | {
      kind: 'navigate';
      intent: GlobalVoiceNavigationIntent;
      spokenConfirmation: string;
    }
  | {
      kind: 'draw_diagram';
      topic: string;
      spokenConfirmation: string;
    }
  | {
      kind: 'ask_arora';
      query: string;
      modeOverride: ChatbotMode;
      spokenConfirmation: string;
    }
  | {
      kind: 'launch_live_chat';
      spokenConfirmation: string;
    }
  | {
      kind: 'set_theme';
      theme: 'dark' | 'light';
      spokenConfirmation: string;
    }
  | {
      kind: 'set_language';
      language: LanguageMode;
      spokenConfirmation: string;
    }
  | {
      kind: 'set_voice_persona';
      persona: VoicePersona;
      spokenConfirmation: string;
    }
  | {
      kind: 'history_back';
      spokenConfirmation: string;
    }
  | {
      kind: 'stop_speech';
      spokenConfirmation: string;
    };

/**
 * Parses high-tech multi-domain voice commands across workspace navigation,
 * instant diagram drawing, theme/language/voice controls, Live Chat launch, and back navigation.
 */
export function parseSmartVoiceCommand(utterance: string): SmartVoiceAction | undefined {
  const cleaned = utterance
    .replace(/^(?:hey\s+|ok\s+|hi\s+)?arora[\s,.:;-]*/i, '')
    .trim();

  if (!cleaned) return undefined;
  const lower = cleaned.toLowerCase();

  // 1. History Back
  if (
    /^(?:go\s+back|back|previous\s+(?:screen|page|tab|workspace)|return\s+back)$/i.test(
      lower,
    )
  ) {
    return {
      kind: 'history_back',
      spokenConfirmation: 'Returning to your previous workspace.',
    };
  }

  // 2. Stop / Mute active speech output
  if (
    /\b(?:stop\s+speaking|stop\s+talking|mute\s+voice|silence\s+arora|quiet\s+please)\b/i.test(
      lower,
    )
  ) {
    return {
      kind: 'stop_speech',
      spokenConfirmation: 'Voice playback muted.',
    };
  }

  // 3. Appearance Theme Control (Dark / Light)
  if (
    /\b(?:dark\s+mode|dark\s+theme|night\s+mode|switch\s+to\s+dark|enable\s+dark)\b/i.test(
      lower,
    )
  ) {
    return {
      kind: 'set_theme',
      theme: 'dark',
      spokenConfirmation: 'Switched interface to Liquid Glass Dark Mode.',
    };
  }
  if (
    /\b(?:light\s+mode|light\s+theme|day\s+mode|switch\s+to\s+light|enable\s+light)\b/i.test(
      lower,
    )
  ) {
    return {
      kind: 'set_theme',
      theme: 'light',
      spokenConfirmation: 'Switched interface to Liquid Glass Light Mode.',
    };
  }

  // 4. Spoken Language Switching
  if (
    /\b(?:switch|change|set|speak)\b.*\btanglish\b|\btanglish\s+mode\b/i.test(lower)
  ) {
    return {
      kind: 'set_language',
      language: 'tanglish',
      spokenConfirmation: 'Language switched to conversational Tamil-English (Tanglish).',
    };
  }
  if (
    /\b(?:switch|change|set|speak)\b.*\btamil\b|\btamil\s+mode\b/i.test(lower)
  ) {
    return {
      kind: 'set_language',
      language: 'tamil',
      spokenConfirmation: 'Language switched to Tamil.',
    };
  }
  if (
    /\b(?:switch|change|set|speak)\b.*\b(?:indian\s+)?english\b|\benglish\s+mode\b/i.test(
      lower,
    )
  ) {
    return {
      kind: 'set_language',
      language: 'indian_english',
      spokenConfirmation: 'Language switched to Indian English.',
    };
  }

  // 5. Voice Persona Switching
  if (/\b(?:voice|persona)\b/i.test(lower)) {
    if (/\bzephyr\b|\bsiri\b/i.test(lower)) {
      return {
        kind: 'set_voice_persona',
        persona: 'Zephyr',
        spokenConfirmation: 'Voice persona set to Zephyr (Siri-like natural clarity).',
      };
    }
    if (/\bkore\b|\bwarm\b/i.test(lower)) {
      return {
        kind: 'set_voice_persona',
        persona: 'Kore',
        spokenConfirmation: 'Voice persona set to Kore (Warm Human).',
      };
    }
    if (/\bpuck\b|\bstudio\b/i.test(lower)) {
      return {
        kind: 'set_voice_persona',
        persona: 'Puck',
        spokenConfirmation: 'Voice persona set to Puck (Clear Studio).',
      };
    }
    if (/\bdevice\b|\boffline\b|\blocal\b/i.test(lower)) {
      return {
        kind: 'set_voice_persona',
        persona: 'device_natural',
        spokenConfirmation: 'Voice persona set to Device Natural.',
      };
    }
  }

  // 6. Launch Full-Duplex Live Chat
  if (
    /\b(?:start\s+live\s+(?:chat|voice)|go\s+live|launch\s+live\s+(?:chat|mode)|open\s+live\s+chat|two[- ]way\s+live\s+voice)\b/i.test(
      lower,
    )
  ) {
    return {
      kind: 'launch_live_chat',
      spokenConfirmation: 'Launching ARORA Live Chat full-duplex voice mode.',
    };
  }

  // 7. Workspace Navigation & Auto-Start Mock Tests
  const navIntent = detectGlobalNavigationCommand(utterance);
  if (navIntent) {
    return {
      kind: 'navigate',
      intent: navIntent,
      spokenConfirmation: navIntent.spokenConfirmation,
    };
  }

  // 8. Precision Diagram Command ("Arora, draw a diagram of compound microscope")
  const diagramIntent = detectDiagramRequest(cleaned);
  if (diagramIntent.wantsDiagram) {
    return {
      kind: 'draw_diagram',
      topic: diagramIntent.cleanTopic,
      spokenConfirmation: `Generating precision labelled diagram for ${diagramIntent.cleanTopic}.`,
    };
  }

  // 9. Explicit Chat / Search / Solve Command ("Arora, ask about Kirchhoff's law")
  const askMatch = cleaned.match(
    /^(?:ask(?:\s+arora)?(?:\s+about)?|search(?:\s+for)?|look\s+up)\s+(.+)$/i,
  );
  if (askMatch && askMatch[1].trim().length >= 3) {
    const query = askMatch[1].trim();
    return {
      kind: 'ask_arora',
      query,
      modeOverride: /\bsearch\b|\blook\s+up\b/i.test(lower)
        ? 'Research'
        : 'Deep Explanation',
      spokenConfirmation: `Sending "${query}" to ARORA Chat.`,
    };
  }

  return undefined;
}

/**
 * Live interim Web Speech listener for high-tech real-time HUD feedback.
 */
export function startSmartVoiceListener(
  mode: LanguageMode,
  callbacks: {
    onInterim: (transcript: string) => void;
    onFinal: (transcript: string) => void;
    onEnd: () => void;
    onError: (message: string) => void;
  },
): (() => void) | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as
    | (new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        onresult: ((ev: {
          resultIndex?: number;
          results: ArrayLike<
            ArrayLike<{ transcript: string }> & { isFinal?: boolean }
          >;
        }) => void) | null;
        onerror: ((ev: { error: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      })
    | undefined;

  if (!Ctor) {
    callbacks.onError('Microphone speech recognition is unavailable in this browser. Type your command below.');
    return null;
  }

  try {
    const rec = new Ctor();
    rec.lang = getSpeechLocaleForMode(mode);
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let committed = false;

    rec.onresult = (ev) => {
      let fullText = '';
      let isFinal = false;
      for (let i = 0; i < ev.results.length; i += 1) {
        const res = ev.results[i];
        const piece = res?.[0]?.transcript || '';
        fullText += piece;
        if (res?.isFinal) isFinal = true;
      }
      const trimmed = fullText.trim();
      if (!trimmed) return;
      callbacks.onInterim(trimmed);
      if (isFinal && !committed) {
        committed = true;
        callbacks.onFinal(trimmed);
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === 'aborted' || ev.error === 'no-speech') return;
      callbacks.onError(`Voice recognition error: ${ev.error}`);
    };

    rec.onend = () => {
      callbacks.onEnd();
    };

    rec.start();
    return () => {
      try {
        rec.stop();
      } catch {
        // Ignore stop errors
      }
    };
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Unable to start voice listener.');
    return null;
  }
}

