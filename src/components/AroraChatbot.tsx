import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  History,
  Loader2,
  Mic,
  MicOff,
  PanelLeftClose,
  PenTool,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  Volume2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { detectDiagramRequest } from '../engines/diagramUtils';
import { triggerHaptic } from '../engines/hapticsEngine';
import { sanitizeAroraOutput } from '../engines/identityGuard';
import {
  createRequestTimeoutGuard,
  createStreamCoalescer,
  type StreamCoalescer,
} from '../engines/streamCoalescer';
import {
  releaseVoiceAudioResources,
  speakAroraText,
  startVoiceRecognition,
  stopAroraSpeech,
} from '../engines/voiceEngine';
import type {
  ChatAttachment,
  ChatMessage,
  ChatSession,
  ChatbotMode,
  DeviceTelemetry,
  GeneratedDiagramSpec,
  LanguageMode,
  OrbState,
} from '../types/arora';
import { EnergyOrb } from './EnergyOrb';
import { GeneratedDiagramCard } from './GeneratedDiagramCard';
import { GlassBackButton } from './GlassBackButton';
import { RichMessageRenderer } from './RichMessageRenderer';

interface AroraChatbotProps {
  sessions: ChatSession[];
  onSaveSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
  language: LanguageMode;
  onChangeLanguage: (lang: LanguageMode) => void;
  telemetry: DeviceTelemetry;
  memoryEnabled: boolean;
  onToggleMemory: (val: boolean) => void;
  externalSelectedSessionId?: string | null;
  onConsumedExternalSession?: () => void;
  externalPromptRequest?: {
    id: string;
    text: string;
    modeOverride?: ChatbotMode;
  } | null;
  onConsumedExternalPrompt?: () => void;
}

const CHAT_MODES: ChatbotMode[] = [
  'Auto (Smart)',
  'Quick Answer',
  'Deep Explanation',
  'Problem Solving',
  'Board Exam',
  'Research',
  'Study',
  'Coding',
  'Creative',
];

const STARTER_PROMPTS: {
  title: string;
  subtitle: string;
  mode: ChatbotMode;
  prompt: string;
}[] = [
  {
    title: 'Physics Derivation',
    subtitle: "Gauss's Law · Charged Wire",
    mode: 'Deep Explanation',
    prompt:
      "Derive the expression for electric field intensity due to an infinitely long straight uniformly charged wire using Gauss's Law, with clear steps and SI units.",
  },
  {
    title: 'CBSE Numerical Solver',
    subtitle: 'Chemistry · Nernst Equation',
    mode: 'Problem Solving',
    prompt:
      'Solve step by step: Calculate the EMF of the cell Mg(s) | Mg2+(0.001 M) || Cu2+(0.0001 M) | Cu(s) at 298 K given E°(Mg2+/Mg) = -2.36 V and E°(Cu2+/Cu) = +0.34 V.',
  },
  {
    title: 'Python Stack Code',
    subtitle: 'Class 12 CS · Push, Pop & Peek',
    mode: 'Coding',
    prompt:
      'Write a clean CBSE Class 12 Python menu-driven Stack program using a list supporting Push, Pop, Peek, and Display with underflow checks and sample output.',
  },
  {
    title: 'Rapid Revision Sheet',
    subtitle: 'Physics · LCR Resonance',
    mode: 'Study',
    prompt:
      'Create crisp CBSE Class 12 revision notes for Series LCR Circuit Resonance, impedance formula, quality factor, and 2 quick self-check questions.',
  },
];

interface StreamingDraft {
  session: ChatSession;
  messageId: string;
  content: string;
}

interface FailedRetryContext {
  query: string;
  mode: ChatbotMode;
  session: ChatSession;
  attachments: ChatAttachment[];
}

function parseSseFrames(
  rawChunk: string,
  bufferRef: { value: string },
  onEvent: (evt: {
    type?: string;
    delta?: string;
    text?: string;
    provider?: string;
    sources?: { title: string; uri: string }[];
    error?: string;
  }) => void,
) {
  bufferRef.value += rawChunk;
  const frames = bufferRef.value.split(/\r?\n\r?\n/);
  bufferRef.value = frames.pop() || '';

  for (const frame of frames) {
    const lines = frame.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        onEvent(JSON.parse(jsonStr));
      } catch {
        // Ignore partial or malformed keep-alive chunk
      }
    }
  }
}

export const AroraChatbot: React.FC<AroraChatbotProps> = ({
  sessions,
  onSaveSession,
  onDeleteSession,
  language,
  onChangeLanguage,
  telemetry,
  memoryEnabled,
  onToggleMemory,
  externalSelectedSessionId,
  onConsumedExternalSession,
  externalPromptRequest,
  onConsumedExternalPrompt,
}) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    externalSelectedSessionId || sessions[0]?.id || null,
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'live_voice' | 'chat'>('all');
  const [mode, setMode] = useState<ChatbotMode>('Auto (Smart)');
  const [input, setInput] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedRetry, setFailedRetry] = useState<FailedRetryContext | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [streamingDraft, setStreamingDraft] = useState<StreamingDraft | null>(null);
  const [includeDiagramNext, setIncludeDiagramNext] = useState(false);
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [diagramLoadingForMsgId, setDiagramLoadingForMsgId] = useState<string | null>(null);
  const [messageWindowSize, setMessageWindowSize] = useState(36);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const stopMicRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const coalescerRef = useRef<StreamCoalescer | null>(null);
  const inFlightRef = useRef(false);
  const interruptedRef = useRef(false);
  const streamingDraftRef = useRef<StreamingDraft | null>(null);
  const userClearedRef = useRef(false);
  const lastConsumedPromptIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMessageWindowSize(36);
  }, [activeSessionId]);

  useEffect(() => {
    return () => {
      interruptedRef.current = true;
      coalescerRef.current?.cancel();
      coalescerRef.current = null;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      stopMicRef.current?.();
      stopMicRef.current = null;
      releaseVoiceAudioResources();
    };
  }, []);

  useEffect(() => {
    if (!externalSelectedSessionId) return;
    if (sessions.some((s) => s.id === externalSelectedSessionId)) {
      userClearedRef.current = false;
      setActiveSessionId(externalSelectedSessionId);
      setSessionFilter('all');
      onConsumedExternalSession?.();
    }
  }, [externalSelectedSessionId, sessions, onConsumedExternalSession]);

  // Sync activeSessionId cleanly when IndexedDB sessions finish loading or active session is deleted
  useEffect(() => {
    if (sessions.length === 0) {
      if (activeSessionId !== null) setActiveSessionId(null);
      return;
    }
    const stillExists = activeSessionId
      ? sessions.some((s) => s.id === activeSessionId)
      : false;
    if (!stillExists && !userClearedRef.current) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Auto-resize multiline composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`;
  }, [input]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  const visibleMessages: ChatMessage[] = useMemo(() => {
    const base = activeSession?.messages || [];
    if (streamingDraft && activeSession && streamingDraft.session.id === activeSession.id) {
      return [
        ...base,
        {
          id: streamingDraft.messageId,
          role: 'assistant',
          content: streamingDraft.content,
          timestamp: new Date().toISOString(),
          mode,
          language,
          provider: 'ARORA AI',
        },
      ];
    }
    return base;
  }, [activeSession, streamingDraft, mode, language]);

  const hiddenMessageCount = Math.max(0, visibleMessages.length - messageWindowSize);
  const windowedMessages = useMemo(
    () =>
      hiddenMessageCount > 0
        ? visibleMessages.slice(visibleMessages.length - messageWindowSize)
        : visibleMessages,
    [visibleMessages, hiddenMessageCount, messageWindowSize],
  );

  // Auto-scroll smoothly on new turns, and instantly ('auto') during rapid token streaming
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const isActivelyStreaming = Boolean(streamingDraft?.content);
    el.scrollTo({
      top: el.scrollHeight,
      behavior:
        isActivelyStreaming || telemetry.animationComplexity === 'minimal'
          ? 'auto'
          : 'smooth',
    });
  }, [visibleMessages.length, streamingDraft?.content, telemetry.animationComplexity]);

  const filteredSessions = useMemo(() => {
    const byType = sessions.filter((s) => {
      if (sessionFilter === 'live_voice') return s.sessionType === 'live_voice';
      if (sessionFilter === 'chat') return s.sessionType !== 'live_voice';
      return true;
    });
    const q = historySearch.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [sessions, historySearch, sessionFilter]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerHaptic('tap');
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((cur) => (cur === key ? null : cur));
      }, 1800);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  const cancelActiveStream = () => {
    interruptedRef.current = true;
    coalescerRef.current?.cancel();
    coalescerRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    inFlightRef.current = false;
    streamingDraftRef.current = null;
    setStreamingDraft(null);
    setIsGenerating(false);
    setIsGeneratingDiagram(false);
    stopAroraSpeech();
    setIsSpeaking(false);
    setOrbState('idle');
  };

  const startNewChat = () => {
    triggerHaptic('tap');
    cancelActiveStream();
    userClearedRef.current = false;
    const fresh: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Study Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode,
      messages: [],
    };
    onSaveSession(fresh);
    setActiveSessionId(fresh.id);
    setMessageWindowSize(36);
    setAttachments([]);
    setErrorMsg(null);
    setFailedRetry(null);
    setTimeout(() => textareaRef.current?.focus(), 40);
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    const loaded: ChatAttachment[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds 5 MB limit.`);
        continue;
      }
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.readAsDataURL(file);
      });
      loaded.push({
        id: `att-${Date.now()}-${Math.random()}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        base64Data,
      });
    }
    setAttachments((prev) => [...prev, ...loaded].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (
    overrideText?: string,
    baseSession?: ChatSession,
    options?: {
      modeOverride?: ChatbotMode;
      skipAppendingUser?: boolean;
      retryAttachments?: ChatAttachment[];
    },
  ) => {
    if (inFlightRef.current || isGenerating) return;
    const activeMode = options?.modeOverride ?? mode;
    const query = (overrideText ?? input).trim();
    const currentAttachments = options?.retryAttachments
      ? [...options.retryAttachments]
      : [...attachments];

    if (!query && currentAttachments.length === 0) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setOrbState('error');
      setErrorMsg('No internet connection detected. Reconnect to internet and tap Retry.');
      return;
    }

    inFlightRef.current = true;

    triggerHaptic('submit');
    userClearedRef.current = false;
    setErrorMsg(null);
    setFailedRetry(null);
    if (options?.modeOverride) {
      setMode(options.modeOverride);
    }

    if (!overrideText) {
      setInput('');
      setAttachments([]);
    }

    const sessionToUpdate: ChatSession = baseSession || activeSession || {
      id: `chat-${Date.now()}`,
      title: query.slice(0, 48) || 'Multimodal Study Query',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: activeMode,
      messages: [],
    };

    let updatedWithUser = sessionToUpdate;
    const effectiveQuery = query || 'Analyze attached document/image.';

    if (!options?.skipAppendingUser) {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-u`,
        role: 'user',
        content: effectiveQuery,
        timestamp: new Date().toISOString(),
        mode: activeMode,
        language,
        attachments: currentAttachments.map((a) => ({
          name: a.name,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        })),
      };

      updatedWithUser = {
        ...sessionToUpdate,
        title:
          sessionToUpdate.messages.length === 0
            ? (query || currentAttachments[0]?.name || 'Study Query').slice(0, 48)
            : sessionToUpdate.title,
        updatedAt: new Date().toISOString(),
        mode: activeMode,
        messages: [...sessionToUpdate.messages, userMsg],
      };

      onSaveSession(updatedWithUser);
    }

    setActiveSessionId(updatedWithUser.id);
    interruptedRef.current = false;
    setIsGenerating(true);
    setOrbState('thinking');

    const memorySummary = memoryEnabled
      ? sessions
          .slice(0, 3)
          .map((s) => s.title)
          .join('; ')
      : undefined;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const draftId = `msg-${Date.now()}-a`;
    const initialDraft: StreamingDraft = {
      session: updatedWithUser,
      messageId: draftId,
      content: '',
    };
    streamingDraftRef.current = initialDraft;
    setStreamingDraft(initialDraft);

    const requestBody = {
      message: effectiveQuery,
      mode: activeMode,
      language,
      history: updatedWithUser.messages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content })),
      attachments: currentAttachments.map((a) => ({
        name: a.name,
        mimeType: a.mimeType,
        base64Data: a.base64Data,
      })),
      memorySummary,
      maxContextTurns: telemetry.maxContextTurns,
    };

    const diagramIntent = detectDiagramRequest(effectiveQuery);
    const shouldGenerateDiagram = includeDiagramNext || diagramIntent.wantsDiagram;
    if (!overrideText && includeDiagramNext) {
      setIncludeDiagramNext(false);
    }

    const diagramPromise: Promise<GeneratedDiagramSpec | undefined> = shouldGenerateDiagram
      ? (() => {
          setIsGeneratingDiagram(true);
          return fetch('/api/ai/diagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              topic: diagramIntent.cleanTopic || effectiveQuery.slice(0, 140),
              subjectHint: activeMode,
              additionalContext: effectiveQuery,
              language,
            }),
          })
            .then(async (res) => {
              if (!res.ok) return undefined;
              const data = (await res.json()) as GeneratedDiagramSpec;
              return data?.svgMarkup ? data : undefined;
            })
            .catch(() => undefined)
            .finally(() => {
              setIsGeneratingDiagram(false);
            });
        })()
      : Promise.resolve(undefined);

    try {
      setOrbState('processing');
      let accumulated = '';
      let finalSources: { title: string; uri: string }[] = [];
      let finalProvider = 'ARORA AI';
      let streamSucceeded = false;
      let markedGenerating = false;

      const coalescer = createStreamCoalescer(
        (flushedText) => {
          if (interruptedRef.current || controller.signal.aborted) return;
          const nextDraft: StreamingDraft = {
            session: updatedWithUser,
            messageId: draftId,
            content: flushedText,
          };
          streamingDraftRef.current = nextDraft;
          setStreamingDraft(nextDraft);
        },
        {
          flushIntervalMs: telemetry.animationComplexity === 'minimal' ? 68 : 44,
          sanitize: sanitizeAroraOutput,
        },
      );
      coalescerRef.current = coalescer;

      const firstByteBudgetMs =
        activeMode === 'Quick Answer'
          ? 16000
          : activeMode === 'Research' || currentAttachments.length > 0
            ? 28000
            : 24000;
      const streamTimeout = createRequestTimeoutGuard(controller.signal, firstByteBudgetMs);
      try {
        const res = await fetch('/api/ai/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: streamTimeout.signal,
          body: JSON.stringify(requestBody),
        });

        if (!res.ok || !res.body) {
          streamTimeout.cleanup();
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const sseBuffer = { value: '' };

        const handleSseEvent = (evt: {
          type?: string;
          delta?: string;
          text?: string;
          provider?: string;
          sources?: { title: string; uri: string }[];
          error?: string;
        }) => {
          if (evt.type === 'delta' && evt.delta) {
            streamTimeout.markFirstByte();
            if (!markedGenerating) {
              markedGenerating = true;
              setOrbState('generating');
            }
            coalescer.push(evt.delta);
          } else if (evt.type === 'done') {
            streamTimeout.markFirstByte();
            const flushed = coalescer.flushNow();
            accumulated = evt.text ? sanitizeAroraOutput(evt.text) : flushed;
            if (evt.provider) finalProvider = evt.provider;
            if (Array.isArray(evt.sources)) finalSources = evt.sources;
            streamSucceeded = true;
          } else if (evt.type === 'error') {
            streamTimeout.markFirstByte();
            throw new Error(evt.error || 'ARORA Cloud streaming failed.');
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || interruptedRef.current) break;
          streamTimeout.markFirstByte();
          parseSseFrames(decoder.decode(value, { stream: true }), sseBuffer, handleSseEvent);
        }

        if (sseBuffer.value.trim() && !interruptedRef.current) {
          parseSseFrames('\n\n', sseBuffer, handleSseEvent);
        }

        const flushedEnd = coalescer.flushNow();
        if (!accumulated.trim() && flushedEnd.trim()) {
          accumulated = flushedEnd;
        }
        if (accumulated.trim()) {
          streamSucceeded = true;
        }
        streamTimeout.cleanup();
      } catch (streamErr) {
        streamTimeout.cleanup();
        coalescer.cancel();
        if (coalescerRef.current === coalescer) coalescerRef.current = null;
        const partialSoFar = coalescer.getText();
        if (partialSoFar.trim()) {
          accumulated = partialSoFar;
        }
        if (
          (streamErr instanceof DOMException && streamErr.name === 'AbortError' && !streamTimeout.didTimeout()) ||
          interruptedRef.current ||
          accumulated.trim().length > 0
        ) {
          throw streamErr;
        }

        // Automatic non-streaming Cloud fallback if SSE stream stalls or times out cleanly
        const fallbackTimeout = createRequestTimeoutGuard(controller.signal, 18000);
        try {
          const fallbackRes = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: fallbackTimeout.signal,
            body: JSON.stringify(requestBody),
          });
          fallbackTimeout.markFirstByte();
          const fallbackData = (await fallbackRes.json().catch(() => ({}))) as {
            text?: string;
            provider?: string;
            sources?: { title: string; uri: string }[];
            error?: string;
          };
          if (!fallbackRes.ok || !fallbackData.text) {
            throw new Error(
              fallbackData.error ||
                (streamTimeout.didTimeout()
                  ? 'Response took too long on current network. Tap Retry to reconnect.'
                  : streamErr instanceof Error
                    ? streamErr.message
                    : 'Cloud connection interrupted'),
            );
          }
          accumulated = sanitizeAroraOutput(fallbackData.text);
          if (fallbackData.provider) finalProvider = fallbackData.provider;
          if (Array.isArray(fallbackData.sources)) finalSources = fallbackData.sources;
          streamSucceeded = true;
        } catch (fbErr) {
          if (fallbackTimeout.didTimeout()) {
            throw new Error('Request timed out on slow connection. Please tap Retry.');
          }
          throw fbErr;
        } finally {
          fallbackTimeout.cleanup();
        }
      } finally {
        coalescer.cancel();
        if (coalescerRef.current === coalescer) coalescerRef.current = null;
      }

      const generatedDiagram = !interruptedRef.current ? await diagramPromise : undefined;

      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      inFlightRef.current = false;

      if (!interruptedRef.current && streamSucceeded && accumulated.trim()) {
        const assistantMsg: ChatMessage = {
          id: draftId,
          role: 'assistant',
          content: sanitizeAroraOutput(accumulated),
          timestamp: new Date().toISOString(),
          mode: activeMode,
          language,
          provider: finalProvider,
          sources: finalSources,
          ...(generatedDiagram ? { diagram: generatedDiagram } : {}),
        };
        onSaveSession({
          ...updatedWithUser,
          updatedAt: new Date().toISOString(),
          messages: [...updatedWithUser.messages, assistantMsg],
        });
      } else if (!interruptedRef.current && !accumulated.trim()) {
        throw new Error('Empty response received from ARORA Cloud.');
      }

      streamingDraftRef.current = null;
      setStreamingDraft(null);
      setIsGeneratingDiagram(false);
      setIsGenerating(false);
      setOrbState('idle');
    } catch (err) {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      inFlightRef.current = false;
      setIsGeneratingDiagram(false);
      if ((err instanceof DOMException && err.name === 'AbortError') || interruptedRef.current) {
        streamingDraftRef.current = null;
        setStreamingDraft(null);
        setIsGenerating(false);
        setOrbState('idle');
        return;
      }
      streamingDraftRef.current = null;
      setStreamingDraft(null);
      setIsGenerating(false);
      setOrbState('error');
      setFailedRetry({
        query: effectiveQuery,
        mode: activeMode,
        session: updatedWithUser,
        attachments: currentAttachments,
      });
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to reach ARORA Cloud right now. Tap Retry to reconnect.',
      );
    }
  };

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (!externalPromptRequest) return;
    if (lastConsumedPromptIdRef.current === externalPromptRequest.id) return;
    lastConsumedPromptIdRef.current = externalPromptRequest.id;
    onConsumedExternalPrompt?.();
    void sendMessageRef.current(externalPromptRequest.text, activeSession || undefined, {
      modeOverride: externalPromptRequest.modeOverride,
    });
  }, [externalPromptRequest, activeSession, onConsumedExternalPrompt]);

  const generateDiagramForMessage = async (msg: ChatMessage) => {
    if (!activeSession || diagramLoadingForMsgId === msg.id) return;
    triggerHaptic('tap');
    setErrorMsg(null);
    setDiagramLoadingForMsgId(msg.id);
    try {
      const msgIdx = activeSession.messages.findIndex((m) => m.id === msg.id);
      let userPrompt = '';
      for (let i = msgIdx - 1; i >= 0; i -= 1) {
        if (activeSession.messages[i].role === 'user') {
          userPrompt = activeSession.messages[i].content;
          break;
        }
      }
      const topicSeed =
        msg.diagram?.topic ||
        detectDiagramRequest(userPrompt).cleanTopic ||
        userPrompt.slice(0, 140) ||
        msg.content.slice(0, 140);

      const res = await fetch('/api/ai/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicSeed,
          subjectHint: msg.mode || mode,
          additionalContext: msg.content.slice(0, 450),
          language,
        }),
      });
      const data = (await res.json()) as GeneratedDiagramSpec & { error?: string };
      if (!res.ok || !data.svgMarkup) {
        throw new Error(data.error || 'Could not generate diagram for this message.');
      }

      const nextMessages = activeSession.messages.map((m) =>
        m.id === msg.id ? { ...m, diagram: data } : m,
      );
      onSaveSession({
        ...activeSession,
        updatedAt: new Date().toISOString(),
        messages: nextMessages,
      });
      triggerHaptic('success');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate diagram right now.',
      );
    } finally {
      setDiagramLoadingForMsgId((cur) => (cur === msg.id ? null : cur));
    }
  };

  const retryFailedRequest = () => {
    if (!failedRetry || isGenerating) return;
    const retryCtx = failedRetry;
    setFailedRetry(null);
    void sendMessage(retryCtx.query, retryCtx.session, {
      modeOverride: retryCtx.mode,
      skipAppendingUser: true,
      retryAttachments: retryCtx.attachments,
    });
  };

  const handleInterruptChat = () => {
    triggerHaptic('tap');
    interruptedRef.current = true;
    const flushedText = coalescerRef.current?.flushNow() || '';
    coalescerRef.current?.cancel();
    coalescerRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    inFlightRef.current = false;

    const draft = streamingDraftRef.current;
    const finalPartial = (flushedText || draft?.content || '').trim();
    if (draft && finalPartial) {
      const partialMsg: ChatMessage = {
        id: draft.messageId,
        role: 'assistant',
        content: sanitizeAroraOutput(finalPartial),
        timestamp: new Date().toISOString(),
        mode,
        language,
        provider: 'ARORA AI (Interrupted)',
      };
      onSaveSession({
        ...draft.session,
        updatedAt: new Date().toISOString(),
        messages: [...draft.session.messages, partialMsg],
      });
    }
    streamingDraftRef.current = null;
    setStreamingDraft(null);

    stopAroraSpeech();
    stopMicRef.current?.();
    setIsListening(false);
    setIsGenerating(false);
    setIsSpeaking(false);
    setOrbState('idle');
  };

  const regenerateAt = (messageId?: string) => {
    if (!activeSession || activeSession.messages.length === 0 || isGenerating) return;
    let targetUserIdx = -1;
    if (messageId) {
      const msgIdx = activeSession.messages.findIndex((m) => m.id === messageId);
      if (msgIdx > 0) {
        for (let i = msgIdx - 1; i >= 0; i -= 1) {
          if (activeSession.messages[i].role === 'user') {
            targetUserIdx = i;
            break;
          }
        }
      }
    }
    if (targetUserIdx === -1) {
      const revIdx = [...activeSession.messages]
        .reverse()
        .findIndex((m) => m.role === 'user');
      if (revIdx === -1) return;
      targetUserIdx = activeSession.messages.length - 1 - revIdx;
    }

    const lastUserText = activeSession.messages[targetUserIdx].content;
    const trimmedSession: ChatSession = {
      ...activeSession,
      messages: activeSession.messages.slice(0, targetUserIdx),
    };
    void sendMessage(lastUserText, trimmedSession);
  };

  const exportAnswerMarkdown = (msg: ChatMessage) => {
    const content = `# ARORA AI Study Export\nDate: ${msg.timestamp}\nMode: ${msg.mode || mode}\nProvider: ${msg.provider || 'ARORA AI'}\n\n${msg.content}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arora-ai-answer-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopMicRef.current?.();
      setIsListening(false);
      setOrbState('idle');
      return;
    }
    stopAroraSpeech();
    setIsListening(true);
    setOrbState('listening');
    stopMicRef.current = startVoiceRecognition(
      language,
      (transcript) => {
        setIsListening(false);
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setOrbState('idle');
      },
      () => {
        setIsListening(false);
        setOrbState((prev) => (prev === 'listening' ? 'idle' : prev));
      },
      (err) => {
        setIsListening(false);
        setOrbState('error');
        setErrorMsg(err);
      },
    );
  };

  return (
    <section className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
            Instant Token Streaming · CBSE & Live STEM Solver · Multimodal Image & PDF
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            ARORA Chat Workspace
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSidebar((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px] whitespace-nowrap"
          >
            {showSidebar ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-cyan-500" />
                Hide History
              </>
            ) : (
              <>
                <History className="w-3.5 h-3.5 text-cyan-500" />
                Show History ({sessions.length})
              </>
            )}
          </button>

          <select
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as LanguageMode)}
            aria-label="Chatbot language"
            className="px-3.5 py-2 glass-input text-xs font-medium min-h-[40px]"
          >
            <option value="indian_english">Indian English</option>
            <option value="tamil">Tamil (தமிழ்)</option>
            <option value="tanglish">Tamil-English (Tanglish)</option>
          </select>

          <label className="inline-flex items-center gap-2 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer min-h-[40px] whitespace-nowrap">
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => onToggleMemory(e.target.checked)}
              className="accent-cyan-500"
            />
            Study Memory
          </label>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Conversation History Sidebar */}
        {showSidebar && (
          <aside className="lg:col-span-4 holo-panel p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <EnergyOrb
                state={orbState}
                complexity={telemetry.animationComplexity}
                size="sm"
                label={
                  telemetry.operatingMode === 'reconnecting'
                    ? 'Reconnecting Cloud...'
                    : telemetry.operatingMode === 'weak_network'
                      ? 'Weak Network Guard'
                      : 'ARORA Cloud Online'
                }
              />
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white glass-press shadow-sm shadow-cyan-500/25 min-h-[40px] whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search saved study & live chats..."
                className="w-full pl-9 pr-3 py-2 glass-input text-xs"
              />
            </div>

            <div className="apple-segmented w-full grid grid-cols-3 text-center">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'live_voice', label: 'Live Voice' },
                  { id: 'chat', label: 'Text' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSessionFilter(tab.id)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${
                    sessionFilter === tab.id
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 flex-1">
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {sessions.length === 0
                    ? 'No saved chats yet. Ask a question or start Live Chat.'
                    : 'No sessions match your filter or search.'}
                </div>
              ) : (
                filteredSessions.map((sess) => {
                  const active = sess.id === activeSession?.id;
                  const isLive = sess.sessionType === 'live_voice';
                  return (
                    <div
                      key={sess.id}
                      className={`flex items-center justify-between gap-2 p-2.5 glass-press transition-all ${
                        active
                          ? 'rounded-2xl bg-sky-500/14 dark:bg-sky-500/18 border border-sky-400/50 shadow-xs'
                          : 'glass-subcard border-transparent hover:border-white/40 dark:hover:border-white/15'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (activeSessionId !== sess.id) {
                            cancelActiveStream();
                          }
                          userClearedRef.current = false;
                          setErrorMsg(null);
                          setFailedRetry(null);
                          setActiveSessionId(sess.id);
                        }}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {sess.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isLive ? 'Live Voice' : sess.mode} · {sess.messages.length} msgs
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(sess.id)}
                        aria-label="Delete conversation"
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* New Modern Apple Liquid Glass Chat Box */}
        <div
          className={`${
            showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'
          } holo-panel-elevated p-4 sm:p-5 flex flex-col gap-3.5 min-h-[600px]`}
        >
          {/* Chat Workspace Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              {activeSession && visibleMessages.length > 0 && (
                <GlassBackButton
                  label="Clear View"
                  onClick={() => {
                    userClearedRef.current = true;
                    setActiveSessionId(null);
                    setErrorMsg(null);
                    setFailedRetry(null);
                  }}
                />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {activeSession ? activeSession.title : 'Fresh Conversation'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mode} · ARORA Cloud Online
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(isGenerating || isSpeaking) && (
                <button
                  type="button"
                  onClick={handleInterruptChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-950/92 hover:bg-black text-white border border-rose-400/45 text-xs font-semibold glass-press min-h-[38px] whitespace-nowrap"
                >
                  <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                  Interrupt
                </button>
              )}
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[38px] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-500" />
                New Chat
              </button>
            </div>
          </div>

          {/* 7 Response Modes Segmented Strip */}
          <div className="apple-segmented w-full">
            {CHAT_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold glass-press whitespace-nowrap min-h-[34px] ${
                  mode === m
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Error Recovery Banner with One-Click Retry */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/12 dark:bg-rose-950/35 border border-rose-400/35 holo-blur text-xs text-rose-800 dark:text-rose-200 flex flex-wrap items-center justify-between gap-2">
              <span className="flex-1 min-w-[200px]">{errorMsg}</span>
              {failedRetry && (
                <button
                  type="button"
                  onClick={retryFailedRequest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold glass-press whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Scrollable Message Viewport */}
          <div
            ref={messagesScrollRef}
            className="flex-1 h-[390px] sm:h-[430px] overflow-y-auto pr-1.5 space-y-3.5"
          >
            {visibleMessages.length === 0 ? (
              <div className="h-full flex flex-col justify-center gap-4 py-3">
                <div className="text-center space-y-1.5 max-w-xl mx-auto">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    Ready for Instant Cloud Reasoning
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                    Ask anything across Physics, Chemistry, Maths, Biology, English, Python, or World Topics
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports photo uploads of handwritten sums, NCERT PDFs, voice dictation, and instant code formatting.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto w-full">
                  {STARTER_PROMPTS.map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() =>
                        void sendMessage(card.prompt, activeSession || undefined, {
                          modeOverride: card.mode,
                        })
                      }
                      className="p-3.5 glass-subcard glass-press text-left hover:border-cyan-400/55 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                          {card.title}
                        </span>
                        <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                          {card.mode}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {card.subtitle}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {hiddenMessageCount > 0 && (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => setMessageWindowSize((n) => n + 36)}
                      className="px-3.5 py-1.5 glass-subcard glass-press text-xs font-medium text-cyan-600 dark:text-cyan-300 hover:border-cyan-400/50"
                    >
                      Show earlier messages ({hiddenMessageCount} archived in session)
                    </button>
                  </div>
                )}
                {windowedMessages.map((msg) => {
                  const isStreamingMsg = streamingDraft?.messageId === msg.id;
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={
                        telemetry.animationComplexity === 'minimal'
                          ? false
                          : { opacity: 0, y: 8, scale: 0.992 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className={`p-4 text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                        isUser
                          ? 'rounded-2xl rounded-br-md bg-sky-500/14 dark:bg-sky-500/18 border border-sky-400/35 holo-blur text-slate-900 dark:text-white max-w-[88%] sm:max-w-[80%] ml-auto'
                          : 'glass-subcard rounded-bl-md text-slate-800 dark:text-slate-100 max-w-[96%] mr-auto'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                          {isUser ? 'You' : 'ARORA AI'}
                          {msg.mode ? ` · ${msg.mode}` : ''}
                        </span>
                        {msg.provider && <span>{msg.provider}</span>}
                      </div>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="text-xs text-violet-600 dark:text-violet-300">
                          Attachments: {msg.attachments.map((a) => a.name).join(', ')}
                        </div>
                      )}

                      {isStreamingMsg && !msg.content ? (
                        <div className="flex items-center gap-2 py-1 text-xs text-cyan-600 dark:text-cyan-300">
                          <span className="inline-flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:120ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:240ms]" />
                          </span>
                          ARORA AI is thinking...
                        </div>
                      ) : (
                        <RichMessageRenderer
                          content={msg.content}
                          copiedKey={copiedKey}
                          onCopy={(text, key) => void handleCopy(text, key)}
                          msgId={msg.id}
                        />
                      )}

                      {isStreamingMsg && isGeneratingDiagram && (
                        <div className="p-3 rounded-2xl border border-cyan-500/30 bg-slate-950/75 text-xs text-cyan-300 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          Drawing precision labelled vector diagram...
                        </div>
                      )}

                      {msg.diagram && (
                        <GeneratedDiagramCard
                          diagram={msg.diagram}
                          onRegenerate={() => void generateDiagramForMessage(msg)}
                          isRegenerating={diagramLoadingForMsgId === msg.id}
                        />
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap gap-2.5">
                          {msg.sources.map((src) => (
                            <a
                              key={src.uri}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {src.title}
                            </a>
                          ))}
                        </div>
                      )}

                      {!isUser && !isStreamingMsg && (
                        <div className="flex flex-wrap items-center gap-3.5 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
                          <button
                            type="button"
                            onClick={() => void handleCopy(msg.content, `msg-${msg.id}`)}
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                          >
                            {copiedKey === `msg-${msg.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              speakAroraText(
                                msg.content,
                                language,
                                {
                                  onStart: () => {
                                    setIsSpeaking(true);
                                    setOrbState('speaking');
                                  },
                                  onEnd: () => {
                                    setIsSpeaking(false);
                                    setOrbState('idle');
                                  },
                                  onError: () => {
                                    setIsSpeaking(false);
                                    setOrbState('idle');
                                  },
                                },
                                { preferNeural: true },
                              )
                            }
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Speak
                          </button>

                          <button
                            type="button"
                            onClick={() => exportAnswerMarkdown(msg)}
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Export .md
                          </button>

                          <button
                            type="button"
                            onClick={() => regenerateAt(msg.id)}
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Regenerate
                          </button>

                          {!msg.diagram && (
                            <button
                              type="button"
                              onClick={() => void generateDiagramForMessage(msg)}
                              disabled={diagramLoadingForMsgId === msg.id}
                              className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors disabled:opacity-55"
                            >
                              {diagramLoadingForMsgId === msg.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PenTool className="w-3.5 h-3.5" />
                              )}
                              {diagramLoadingForMsgId === msg.id
                                ? 'Drawing Diagram...'
                                : 'Generate Diagram'}
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Pending Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-cyan-700 dark:text-cyan-300">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/12 border border-sky-400/30 holo-blur"
                >
                  {a.name} ({Math.round(a.sizeBytes / 1024)} KB)
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((item) => item.id !== a.id))
                    }
                    className="text-rose-500 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Unified Floating Glass Composer Dock */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="glass-input rounded-3xl p-2 flex items-end gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/csv"
              multiple
              onChange={(e) => void handleFileAttach(e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image or PDF"
              aria-label="Attach Image or PDF"
              className="p-2.5 glass-subcard glass-press text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <FileUp className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleVoiceInput}
              title="Voice Input"
              aria-label="Voice Input"
              className={`p-2.5 glass-press min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
                isListening
                  ? 'rounded-2xl bg-rose-600 border border-rose-500 text-white shadow-sm shadow-rose-500/25'
                  : 'glass-subcard text-slate-600 dark:text-slate-300 hover:border-cyan-400/50'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setIncludeDiagramNext((v) => !v);
              }}
              title="Include a precision labelled vector diagram with this reply"
              aria-label="Toggle Diagram Generation"
              aria-pressed={includeDiagramNext}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 glass-press min-h-[44px] text-xs font-semibold shrink-0 ${
                includeDiagramNext
                  ? 'rounded-2xl bg-cyan-600 border border-cyan-400/60 text-white shadow-sm shadow-cyan-500/25'
                  : 'glass-subcard text-slate-600 dark:text-slate-300 hover:border-cyan-400/50'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Diagram</span>
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={
                includeDiagramNext
                  ? 'Enter any topic to generate a labelled diagram + explanation...'
                  : `Ask ARORA AI (${mode}) or ask for any diagram · Enter to send...`
              }
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 px-2 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none max-h-[136px] leading-snug"
            />

            {(isGenerating || isSpeaking) && (
              <button
                type="button"
                onClick={handleInterruptChat}
                aria-label="Interrupt AI"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-neutral-950/92 hover:bg-black text-white border border-rose-400/45 glass-press min-h-[44px] text-xs font-semibold shrink-0"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Interrupt</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isGenerating || (!input.trim() && attachments.length === 0)}
              aria-label="Send message"
              className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-45 disabled:cursor-not-allowed text-white glass-press shadow-sm shadow-cyan-500/25 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
