import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  Award,
  BookOpenCheck,
  ExternalLink,
  History,
  Loader2,
  MessageSquare,
  Mic,
  Pause,
  PenTool,
  Play,
  RotateCcw,
  Send,
  Square,
  StopCircle,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from '../data/curriculum';
import {
  applyBoardCues,
  buildStepByStepFallbackCues,
  buildSubjectLaunchCues,
  createBoardBlockId,
  createBoardCueScheduler,
  exportBoardNotesMarkdown,
  teachingSpeedToRateMultiplier,
  type BoardCueScheduler,
} from '../engines/classroomSyncEngine';
import { detectDiagramRequest } from '../engines/diagramUtils';
import { triggerHaptic } from '../engines/hapticsEngine';
import { sanitizeAroraOutput } from '../engines/identityGuard';
import { AroraLiveAudioClient } from '../engines/liveAudioClient';
import {
  buildLiveChatSession,
  type LiveArchiveTurn,
} from '../engines/liveSessionArchive';
import {
  createRequestTimeoutGuard,
  createStreamCoalescer,
  type StreamCoalescer,
} from '../engines/streamCoalescer';
import {
  detectGlobalNavigationCommand,
  detectSpokenInteractiveCommand,
  parseSmartVoiceCommand,
  releaseVoiceAudioResources,
  speakAroraText,
  startVoiceRecognition,
  stopAroraSpeech,
  type GlobalVoiceNavigationIntent,
  type SmartVoiceAction,
} from '../engines/voiceEngine';
import type {
  BoardCueEvent,
  BoardSurfaceTheme,
  ChapterContent,
  ChatSession,
  ClassroomAssessmentItem,
  ClassroomQuestionLogItem,
  ClassroomSessionRecord,
  DifficultyLevel,
  DigitalBoardBlock,
  GeneratedDiagramSpec,
  LanguageMode,
  NetworkOperatingMode,
  OrbState,
  SubjectId,
  TeachingSpeed,
  TeachingStyle,
  VoicePersona,
} from '../types/arora';
import { AroraLiveChatModal } from './AroraLiveChatModal';
import { ClassroomWrapupModal } from './ClassroomWrapupModal';
import { DigitalTeachingBoard } from './DigitalTeachingBoard';
import { GeneratedDiagramCard } from './GeneratedDiagramCard';
import { GlassBackButton } from './GlassBackButton';
import { RichMessageRenderer } from './RichMessageRenderer';
import { VoiceWaveVisualizer } from './VoiceWaveVisualizer';

interface InteractiveTeacherProps {
  appTheme?: 'dark' | 'light';
  language: LanguageMode;
  onChangeLanguage: (lang: LanguageMode) => void;
  voicePersona: VoicePersona;
  onChangeVoicePersona: (vp: VoicePersona) => void;
  alwaysOnline?: boolean;
  operatingMode: NetworkOperatingMode;
  animationComplexity: 'minimal' | 'balanced' | 'full';
  ramSpec?: string;
  onMarkTopicCompleted: (topicKey: string) => void;
  liveChatSessions?: ChatSession[];
  onSaveLiveSession?: (session: ChatSession) => void;
  classroomSessions?: ClassroomSessionRecord[];
  onSaveClassroomSession?: (session: ClassroomSessionRecord) => void;
  onDeleteClassroomSession?: (id: string) => void;
  onOpenArchivedChatSession?: (sessionId: string) => void;
  onNavigateByVoice?: (intent: GlobalVoiceNavigationIntent) => void;
  onExecuteSmartVoice?: (action: SmartVoiceAction) => void;
  externalLaunchLiveToken?: number;
}

type SetupStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface ClassroomTurn {
  id: string;
  speaker: 'arora' | 'student';
  text: string;
  formula?: string;
  provider?: string;
  sources?: { title: string; uri: string }[];
  diagram?: GeneratedDiagramSpec;
}

const DIFFICULTIES: DifficultyLevel[] = ['Easy', 'Moderate', 'Hard', 'Expert'];
const STYLES: TeachingStyle[] = [
  'Conceptual learning',
  'Question-and-answer',
  'Problem solving',
  'Board preparation',
  'Numerical practice',
];

const SPOKEN_COMMANDS = [
  'Solve step by step',
  'Write that on the board',
  'Explain again',
  'Give another example',
  'Repeat the formula',
  'Ask me a question',
  'Slow down',
  'Zoom in',
  'Clear the board',
  'Next topic',
];

export const InteractiveTeacher: React.FC<InteractiveTeacherProps> = ({
  appTheme = 'dark',
  language,
  onChangeLanguage,
  voicePersona,
  onChangeVoicePersona,
  operatingMode,
  animationComplexity,
  onMarkTopicCompleted,
  liveChatSessions = [],
  onSaveLiveSession,
  classroomSessions = [],
  onSaveClassroomSession,
  onDeleteClassroomSession,
  onOpenArchivedChatSession,
  onNavigateByVoice,
  onExecuteSmartVoice,
  externalLaunchLiveToken,
}) => {
  const [step, setStep] = useState<SetupStep>(0);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveConnecting, setLiveConnecting] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveHoldPaused, setLiveHoldPaused] = useState(false);
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);
  const [showPastLiveDrawer, setShowPastLiveDrawer] = useState(false);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const [syllabusName, setSyllabusName] = useState('CBSE');
  const [className, setClassName] = useState('Class 12');
  const [subjectId, setSubjectId] = useState<SubjectId>('physics');
  const [chapterId, setChapterId] = useState<string>('phy-ch6');
  const [topicIndex, setTopicIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Moderate');
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>('Conceptual learning');

  const [inputValue, setInputValue] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [turns, setTurns] = useState<ClassroomTurn[]>([]);
  const [streamingCasualDraft, setStreamingCasualDraft] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [liveDrafts, setLiveDrafts] = useState<{
    input: string;
    output: string;
  }>({ input: '', output: '' });
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastFailedUtterance, setLastFailedUtterance] = useState<string | null>(null);
  const [includeDiagramNext, setIncludeDiagramNext] = useState(false);
  const [diagramLoadingTurnId, setDiagramLoadingTurnId] = useState<string | null>(null);
  const [turnWindowSize, setTurnWindowSize] = useState(36);
  const [liveAnalysers, setLiveAnalysers] = useState<{
    micAnalyser: AnalyserNode | null;
    aiAnalyser: AnalyserNode | null;
  }>({ micAnalyser: null, aiAnalyser: null });

  // Virtual Classroom Board, Sync & Session Tracking States
  const [teachingSpeed, setTeachingSpeed] = useState<TeachingSpeed>('normal');
  const [boardTheme, setBoardTheme] = useState<BoardSurfaceTheme>(() =>
    appTheme === 'dark' ? 'blackboard' : 'whiteboard',
  );
  const [boardThemePinned, setBoardThemePinned] = useState(false);
  const [boardZoom, setBoardZoom] = useState(100);
  const [boardBlocks, setBoardBlocks] = useState<DigitalBoardBlock[]>([]);
  const [activeBoardBlockId, setActiveBoardBlockId] = useState<string | null>(null);
  const [isBoardDiagramLoading, setIsBoardDiagramLoading] = useState(false);
  const [classroomSessionId, setClassroomSessionId] = useState<string | null>(null);
  const [classroomCreatedAt, setClassroomCreatedAt] = useState<string | null>(null);
  const [topicsCovered, setTopicsCovered] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [questionLog, setQuestionLog] = useState<ClassroomQuestionLogItem[]>([]);
  const [showSavedClassroomsDrawer, setShowSavedClassroomsDrawer] = useState(false);
  const [wrapupOpen, setWrapupOpen] = useState(false);
  const [wrapupLoading, setWrapupLoading] = useState(false);
  const [wrapupData, setWrapupData] = useState<{
    lessonSummary: string;
    revisionNotes: string;
    assessment: ClassroomAssessmentItem[];
  }>({ lessonSummary: '', revisionNotes: '', assessment: [] });

  const stopMicRef = useRef<(() => void) | null>(null);
  const dialogueScrollRef = useRef<HTMLDivElement | null>(null);
  const teacherTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const liveClientRef = useRef<AroraLiveAudioClient | null>(null);
  const liveModeRef = useRef(false);
  const isPausedRef = useRef(false);
  const voiceOutputEnabledRef = useRef(true);
  const isInterruptedRef = useRef(false);
  const teachingSpeedRef = useRef<TeachingSpeed>('normal');
  const cueSchedulerRef = useRef<BoardCueScheduler | null>(null);
  const cueFallbackTimerRef = useRef<number | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const casualCoalescerRef = useRef<StreamCoalescer | null>(null);
  const streamingDraftRef = useRef<{ id: string; text: string } | null>(null);
  const liveInputAccRef = useRef('');
  const liveOutputAccRef = useRef('');
  const liveDraftTimerRef = useRef<number | null>(null);
  const activeLiveParamsRef = useRef<{
    language: LanguageMode;
    voicePersona: VoicePersona;
  } | null>(null);
  const liveContextRef = useRef('');
  const lastSentLiveContextRef = useRef('');
  const liveArchiveMetaRef = useRef<{
    id: string;
    createdAt: string;
    turns: LiveArchiveTurn[];
    language: LanguageMode;
    voicePersona: VoicePersona;
    classroomContext?: string;
  } | null>(null);
  const liveNavTimerRef = useRef<number | null>(null);
  const processUtteranceRef = useRef<(rawText: string) => Promise<void>>(async () => {});
  const lastExternalLiveTokenRef = useRef<number>(externalLaunchLiveToken || 0);

  const persistLiveArchiveSnapshot = useCallback(
    (extraTurns?: { speaker: 'student' | 'arora'; text: string }[]) => {
      const meta = liveArchiveMetaRef.current;
      if (!meta || !onSaveLiveSession) return;
      if (extraTurns && extraTurns.length > 0) {
        const nowIso = new Date().toISOString();
        for (const item of extraTurns) {
          const clean = sanitizeAroraOutput(item.text).trim();
          if (!clean) continue;
          meta.turns.push({
            id: `live-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            speaker: item.speaker,
            text: clean,
            timestamp: nowIso,
          });
        }
      }
      const record = buildLiveChatSession({
        sessionId: meta.id,
        createdAt: meta.createdAt,
        turns: meta.turns,
        language: meta.language,
        voicePersona: meta.voicePersona,
        classroomContext: meta.classroomContext,
      });
      if (record) {
        onSaveLiveSession(record);
      }
    },
    [onSaveLiveSession],
  );

  const persistLiveArchiveRef = useRef(persistLiveArchiveSnapshot);
  persistLiveArchiveRef.current = persistLiveArchiveSnapshot;

  const scheduleLiveDraftSync = useCallback(() => {
    if (liveDraftTimerRef.current !== null) return;
    liveDraftTimerRef.current = window.setTimeout(() => {
      liveDraftTimerRef.current = null;
      setLiveDrafts({
        input: liveInputAccRef.current,
        output: liveOutputAccRef.current,
      });
    }, 45);
  }, []);

  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    teachingSpeedRef.current = teachingSpeed;
  }, [teachingSpeed]);

  useEffect(() => {
    if (!boardThemePinned) {
      setBoardTheme(appTheme === 'dark' ? 'blackboard' : 'whiteboard');
    }
  }, [appTheme, boardThemePinned]);

  useEffect(() => {
    voiceOutputEnabledRef.current = voiceOutputEnabled;
    liveClientRef.current?.setMuted(!voiceOutputEnabled || liveHoldPaused);
  }, [voiceOutputEnabled, liveHoldPaused]);

  const cancelBoardSyncTimers = useCallback(() => {
    cueSchedulerRef.current?.cancel();
    cueSchedulerRef.current = null;
    if (cueFallbackTimerRef.current !== null) {
      window.clearInterval(cueFallbackTimerRef.current);
      cueFallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      const pending: { speaker: 'student' | 'arora'; text: string }[] = [];
      if (liveInputAccRef.current.trim()) {
        pending.push({ speaker: 'student', text: liveInputAccRef.current });
      }
      if (liveOutputAccRef.current.trim()) {
        pending.push({ speaker: 'arora', text: liveOutputAccRef.current });
      }
      if (pending.length > 0 || liveArchiveMetaRef.current) {
        persistLiveArchiveRef.current(pending);
        liveArchiveMetaRef.current = null;
      }
      cancelBoardSyncTimers();
      casualCoalescerRef.current?.cancel();
      casualCoalescerRef.current = null;
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
      if (liveNavTimerRef.current !== null) {
        window.clearTimeout(liveNavTimerRef.current);
        liveNavTimerRef.current = null;
      }
      if (liveDraftTimerRef.current !== null) {
        window.clearTimeout(liveDraftTimerRef.current);
        liveDraftTimerRef.current = null;
      }
      stopMicRef.current?.();
      stopMicRef.current = null;
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
      releaseVoiceAudioResources();
    };
  }, [cancelBoardSyncTimers]);

  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);
  const chapter: ChapterContent = useMemo(
    () => subject.chapters.find((c) => c.id === chapterId) || subject.chapters[0],
    [subject, chapterId],
  );
  const currentTopic = chapter.topics[topicIndex] || chapter.topics[0];

  const liveContextText = useMemo(() => {
    if (step === 7) {
      return `Interactive Classroom active on ${subject.name}, Chapter ${chapter.number}: ${chapter.title}, Topic: ${currentTopic}. Difficulty: ${difficulty}, Style: ${teachingStyle}.`;
    }
    if (step > 0) {
      return `Guided Classroom Onboarding Step ${step} of 6 for ${syllabusName} ${className}, ${subject.name}, Chapter ${chapter.number}: ${chapter.title}.`;
    }
    return `Casual AI Teacher Mode active. Student language: ${language}.`;
  }, [
    step,
    subject.name,
    chapter.number,
    chapter.title,
    currentTopic,
    difficulty,
    teachingStyle,
    syllabusName,
    className,
    language,
  ]);

  useEffect(() => {
    liveContextRef.current = liveContextText;
    if (!liveMode || !liveClientRef.current) return;
    if (lastSentLiveContextRef.current === liveContextText) return;
    lastSentLiveContextRef.current = liveContextText;
    liveClientRef.current.updateContext(liveContextText);
  }, [liveMode, liveContextText]);

  const flushLiveDraftTurns = useCallback(() => {
    if (liveDraftTimerRef.current !== null) {
      window.clearTimeout(liveDraftTimerRef.current);
      liveDraftTimerRef.current = null;
    }
    const uText = sanitizeAroraOutput(liveInputAccRef.current.trim());
    const aText = sanitizeAroraOutput(liveOutputAccRef.current.trim());
    liveInputAccRef.current = '';
    liveOutputAccRef.current = '';
    setLiveDrafts({ input: '', output: '' });

    if (uText || aText) {
      const pendingArchive: { speaker: 'student' | 'arora'; text: string }[] = [];
      if (uText) pendingArchive.push({ speaker: 'student', text: uText });
      if (aText) pendingArchive.push({ speaker: 'arora', text: aText });
      persistLiveArchiveSnapshot(pendingArchive);

      setTurns((prev) => {
        const next = [...prev];
        if (uText) {
          next.push({
            id: `live-u-${Date.now()}-${Math.random()}`,
            speaker: 'student',
            text: uText,
          });
        }
        if (aText) {
          next.push({
            id: `live-a-${Date.now()}-${Math.random()}`,
            speaker: 'arora',
            text: aText,
            provider: 'ARORA Live Voice',
          });
        }
        return next;
      });
    }
  }, [persistLiveArchiveSnapshot]);

  const dispatchBoardCuesNow = useCallback((cues: BoardCueEvent[]) => {
    if (cues.length === 0) return;
    setBoardBlocks((prev) => {
      const applied = applyBoardCues(prev, cues);
      if (applied.activeBlockId) {
        setActiveBoardBlockId(applied.activeBlockId);
      } else if (applied.blocks.length === 0) {
        setActiveBoardBlockId(null);
      }
      return applied.blocks;
    });
  }, []);

  const persistActiveClassroomSnapshot = useCallback(
    (overrides?: {
      status?: 'active' | 'paused' | 'completed';
      boardBlocks?: DigitalBoardBlock[];
      topicsCovered?: string[];
      correctCount?: number;
      incorrectCount?: number;
      questionLog?: ClassroomQuestionLogItem[];
      currentQuestion?: string;
      lessonSummary?: string;
      revisionNotes?: string;
      assessment?: ClassroomAssessmentItem[];
    }) => {
      if (!onSaveClassroomSession || !classroomSessionId) return;
      const nowIso = new Date().toISOString();
      const record: ClassroomSessionRecord = {
        id: classroomSessionId,
        subjectId,
        chapterId: chapter.id,
        chapterTitle: `Ch ${chapter.number}: ${chapter.title}`,
        topicsCovered: overrides?.topicsCovered ?? topicsCovered,
        currentTopicIndex: topicIndex,
        difficulty,
        teachingStyle,
        teachingSpeed,
        boardTheme,
        boardBlocks: overrides?.boardBlocks ?? boardBlocks,
        turns: turns.slice(-40).map((t) => ({
          id: t.id,
          speaker: t.speaker,
          text: t.text,
          formula: t.formula,
          provider: t.provider,
        })),
        correctCount: overrides?.correctCount ?? correctCount,
        incorrectCount: overrides?.incorrectCount ?? incorrectCount,
        questionLog: overrides?.questionLog ?? questionLog,
        status: overrides?.status ?? (isPaused ? 'paused' : 'active'),
        currentQuestion: overrides?.currentQuestion ?? currentQuestion,
        lessonSummary: overrides?.lessonSummary ?? wrapupData.lessonSummary,
        revisionNotes: overrides?.revisionNotes ?? wrapupData.revisionNotes,
        assessment: overrides?.assessment ?? wrapupData.assessment,
        createdAt: classroomCreatedAt || nowIso,
        updatedAt: nowIso,
      };
      onSaveClassroomSession(record);
    },
    [
      onSaveClassroomSession,
      classroomSessionId,
      subjectId,
      chapter.id,
      chapter.number,
      chapter.title,
      topicsCovered,
      topicIndex,
      difficulty,
      teachingStyle,
      teachingSpeed,
      boardTheme,
      boardBlocks,
      turns,
      correctCount,
      incorrectCount,
      questionLog,
      isPaused,
      currentQuestion,
      wrapupData.lessonSummary,
      wrapupData.revisionNotes,
      wrapupData.assessment,
      classroomCreatedAt,
    ],
  );

  useEffect(() => {
    if (step !== 7 || !classroomSessionId) return;
    persistActiveClassroomSnapshot();
  }, [
    step,
    classroomSessionId,
    boardBlocks,
    topicsCovered,
    correctCount,
    incorrectCount,
    isPaused,
    teachingSpeed,
    boardTheme,
    persistActiveClassroomSnapshot,
  ]);

  const speakAndAppend = (
    text: string,
    extra?: {
      formula?: string;
      provider?: string;
      sources?: { title: string; uri: string }[];
      diagram?: GeneratedDiagramSpec;
      boardCues?: BoardCueEvent[];
    },
  ) => {
    const safeText = sanitizeAroraOutput(text);
    setTurns((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}-${Math.random()}`,
        speaker: 'arora',
        text: safeText,
        formula: extra?.formula,
        provider: extra?.provider,
        sources: extra?.sources,
        diagram: extra?.diagram,
      },
    ]);

    cancelBoardSyncTimers();
    const cues = extra?.boardCues;
    const scheduler =
      cues && cues.length > 0
        ? createBoardCueScheduler(cues, dispatchBoardCuesNow)
        : null;
    if (scheduler) {
      cueSchedulerRef.current = scheduler;
      // Reveal immediate 0-delay cues (like 'clear' or initial header) cleanly right away
      scheduler.updateProgress(0.05);
    }

    if (voiceOutputEnabledRef.current && !liveModeRef.current) {
      isInterruptedRef.current = false;
      speakAroraText(
        safeText,
        language,
        {
          onStart: () => {
            if (!isInterruptedRef.current) setOrbState('speaking');
          },
          onProgress: (fraction) => {
            if (!isInterruptedRef.current) {
              scheduler?.updateProgress(fraction);
            }
          },
          onEnd: () => {
            if (!isInterruptedRef.current) {
              scheduler?.flushRemaining();
              setOrbState('idle');
            }
            if (cueSchedulerRef.current === scheduler) cueSchedulerRef.current = null;
          },
          onError: () => {
            scheduler?.flushRemaining();
            if (cueSchedulerRef.current === scheduler) cueSchedulerRef.current = null;
            setOrbState('idle');
          },
        },
        {
          preferNeural: true,
          voicePersona,
          rateMultiplier: teachingSpeedToRateMultiplier(teachingSpeedRef.current),
        },
      );
    } else if (!liveModeRef.current) {
      if (scheduler && scheduler.getRemainingCount() > 0) {
        let stepFrac = 0.2;
        cueFallbackTimerRef.current = window.setInterval(() => {
          stepFrac += 0.25;
          scheduler.updateProgress(stepFrac);
          if (stepFrac >= 1 || scheduler.getRemainingCount() === 0) {
            scheduler.flushRemaining();
            if (cueFallbackTimerRef.current !== null) {
              window.clearInterval(cueFallbackTimerRef.current);
              cueFallbackTimerRef.current = null;
            }
            if (cueSchedulerRef.current === scheduler) cueSchedulerRef.current = null;
          }
        }, 320);
      }
      setOrbState('idle');
    } else {
      scheduler?.flushRemaining();
    }
  };

  const fetchTeacherDiagram = async (
    topic: string,
    subjectHint?: string,
    additionalContext?: string,
    signal?: AbortSignal,
  ): Promise<GeneratedDiagramSpec | undefined> => {
    try {
      const res = await fetch('/api/ai/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          topic: topic.slice(0, 180),
          subjectHint,
          additionalContext: additionalContext?.slice(0, 500),
          language,
        }),
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as GeneratedDiagramSpec;
      return data?.svgMarkup ? data : undefined;
    } catch {
      return undefined;
    }
  };

  const handleGenerateDiagramForTurn = async (turn: ClassroomTurn) => {
    if (diagramLoadingTurnId === turn.id) return;
    triggerHaptic('tap');
    setStatusError(null);
    setDiagramLoadingTurnId(turn.id);
    try {
      const idx = turns.findIndex((item) => item.id === turn.id);
      let studentPrompt = '';
      for (let i = idx - 1; i >= 0; i -= 1) {
        if (turns[i].speaker === 'student') {
          studentPrompt = turns[i].text;
          break;
        }
      }
      const topicSeed =
        turn.diagram?.topic ||
        detectDiagramRequest(studentPrompt).cleanTopic ||
        studentPrompt.slice(0, 140) ||
        (step === 7 ? `${currentTopic} (${chapter.title})` : turn.text.slice(0, 140));

      const res = await fetch('/api/ai/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicSeed,
          subjectHint: step === 7 ? `${subject.name} · ${chapter.title}` : 'ARORA AI Teacher',
          additionalContext: turn.text.slice(0, 450),
          language,
        }),
      });
      const data = (await res.json()) as GeneratedDiagramSpec & { error?: string };
      if (!res.ok || !data.svgMarkup) {
        throw new Error(data.error || 'Unable to generate topic diagram.');
      }
      setTurns((prev) =>
        prev.map((item) => (item.id === turn.id ? { ...item, diagram: data } : item)),
      );
      triggerHaptic('success');
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Unable to generate diagram right now.',
      );
    } finally {
      setDiagramLoadingTurnId((cur) => (cur === turn.id ? null : cur));
    }
  };

  const deactivateLiveMode = useCallback(() => {
    triggerHaptic('tap');
    if (liveNavTimerRef.current !== null) {
      window.clearTimeout(liveNavTimerRef.current);
      liveNavTimerRef.current = null;
    }
    if (liveDraftTimerRef.current !== null) {
      window.clearTimeout(liveDraftTimerRef.current);
      liveDraftTimerRef.current = null;
    }
    flushLiveDraftTurns();
    persistLiveArchiveSnapshot();
    liveArchiveMetaRef.current = null;
    liveClientRef.current?.disconnect();
    liveClientRef.current = null;
    activeLiveParamsRef.current = null;
    lastSentLiveContextRef.current = '';
    setLiveLatencyMs(null);
    setLiveAnalysers({ micAnalyser: null, aiAnalyser: null });
    setLiveModalOpen(false);
    setLiveHoldPaused(false);
    setLiveMode(false);
    setLiveConnecting(false);
    liveModeRef.current = false;
    setIsListening(false);
    stopAroraSpeech();
    setOrbState('idle');
  }, [flushLiveDraftTurns, persistLiveArchiveSnapshot]);

  const executeGlobalVoiceNavigation = useCallback(
    (intent: GlobalVoiceNavigationIntent) => {
      if (!onNavigateByVoice) return;
      triggerHaptic('submit');
      if (liveModeRef.current) {
        deactivateLiveMode();
      }
      if (voiceOutputEnabledRef.current) {
        speakAroraText(
          intent.spokenConfirmation,
          language,
          undefined,
          { preferNeural: false, voicePersona },
        );
      }
      onNavigateByVoice(intent);
    },
    [onNavigateByVoice, deactivateLiveMode, language, voicePersona],
  );

  const activateLiveMode = useCallback(async () => {
    triggerHaptic('submit');
    setStatusError(null);
    isInterruptedRef.current = false;
    stopMicRef.current?.();
    stopAroraSpeech();
    aiAbortRef.current?.abort();
    liveClientRef.current?.disconnect();

    activeLiveParamsRef.current = { language, voicePersona };
    const classroomTag =
      step === 7
        ? `${subject.name} · Ch ${chapter.number}: ${currentTopic}`
        : undefined;
    if (!liveArchiveMetaRef.current) {
      liveArchiveMetaRef.current = {
        id: `live-sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        turns: [],
        language,
        voicePersona,
        classroomContext: classroomTag,
      };
    } else {
      liveArchiveMetaRef.current.language = language;
      liveArchiveMetaRef.current.voicePersona = voicePersona;
      if (classroomTag) liveArchiveMetaRef.current.classroomContext = classroomTag;
    }

    setLiveModalOpen(true);
    setLiveHoldPaused(false);
    setLiveLatencyMs(null);
    setVoiceOutputEnabled(true);
    voiceOutputEnabledRef.current = true;
    setLiveConnecting(true);
    setOrbState('processing');

    const initialLiveCtx = liveContextRef.current;
    lastSentLiveContextRef.current = initialLiveCtx;

    const client = new AroraLiveAudioClient({
      onLatencyUpdate: (rttMs) => {
        setLiveLatencyMs(rttMs);
      },
      onAnalysersChange: (analysers) => {
        setLiveAnalysers(analysers);
      },
      onReady: () => {
        setLiveConnecting(false);
        setLiveMode(true);
        liveModeRef.current = true;
        setIsListening(true);
        setOrbState('listening');
        if (liveContextRef.current && liveContextRef.current !== lastSentLiveContextRef.current) {
          lastSentLiveContextRef.current = liveContextRef.current;
          client.updateContext(liveContextRef.current);
        }
      },
      onInputTranscript: (piece) => {
        const clean = sanitizeAroraOutput(piece);
        // If AI had finished a prior turn in liveOutputAccRef, commit AI turn first
        if (liveOutputAccRef.current.trim()) {
          const finishedAi = sanitizeAroraOutput(liveOutputAccRef.current.trim());
          liveOutputAccRef.current = '';
          persistLiveArchiveSnapshot([{ speaker: 'arora', text: finishedAi }]);
          setTurns((prev) => [
            ...prev,
            {
              id: `live-a-${Date.now()}-${Math.random()}`,
              speaker: 'arora',
              text: finishedAi,
              provider: 'ARORA Live Voice',
            },
          ]);
        }
        liveInputAccRef.current += clean;
        scheduleLiveDraftSync();
        setOrbState('listening');

        const cmd = detectSpokenInteractiveCommand(liveInputAccRef.current);
        if (cmd === 'live_off') {
          deactivateLiveMode();
          return;
        }

        if (liveNavTimerRef.current !== null) {
          window.clearTimeout(liveNavTimerRef.current);
          liveNavTimerRef.current = null;
        }
        const liveSpeechSnapshot = liveInputAccRef.current;
        liveNavTimerRef.current = window.setTimeout(() => {
          liveNavTimerRef.current = null;
          const smartAction = parseSmartVoiceCommand(liveSpeechSnapshot);
          if (smartAction) {
            if (
              smartAction.kind === 'set_theme' ||
              smartAction.kind === 'set_language' ||
              smartAction.kind === 'set_voice_persona'
            ) {
              onExecuteSmartVoice?.(smartAction);
              return;
            }
            if (
              smartAction.kind === 'navigate' &&
              smartAction.intent.target !== 'interactive_teacher'
            ) {
              if (onExecuteSmartVoice) {
                deactivateLiveMode();
                onExecuteSmartVoice(smartAction);
              } else if (onNavigateByVoice) {
                executeGlobalVoiceNavigation(smartAction.intent);
              }
              return;
            }
            if (smartAction.kind === 'history_back' && onExecuteSmartVoice) {
              deactivateLiveMode();
              onExecuteSmartVoice(smartAction);
              return;
            }
          }
          const navIntent = detectGlobalNavigationCommand(liveSpeechSnapshot);
          if (navIntent && onNavigateByVoice) {
            executeGlobalVoiceNavigation(navIntent);
          }
        }, 550);
      },
      onOutputTranscript: (piece) => {
        const clean = sanitizeAroraOutput(piece);
        // Commit accumulated user speech before AI speaks
        if (liveInputAccRef.current.trim()) {
          const finishedUser = sanitizeAroraOutput(liveInputAccRef.current.trim());
          liveInputAccRef.current = '';
          persistLiveArchiveSnapshot([{ speaker: 'student', text: finishedUser }]);
          setTurns((prev) => [
            ...prev,
            {
              id: `live-u-${Date.now()}-${Math.random()}`,
              speaker: 'student',
              text: finishedUser,
            },
          ]);
        }
        liveOutputAccRef.current += clean;
        scheduleLiveDraftSync();
      },
      onAudioStart: () => {
        setOrbState('speaking');
      },
      onInterrupted: () => {
        flushLiveDraftTurns();
        setOrbState('listening');
      },
      onTurnComplete: () => {
        flushLiveDraftTurns();
        if (liveModeRef.current) {
          setOrbState('listening');
        }
      },
      onError: (msg) => {
        flushLiveDraftTurns();
        persistLiveArchiveSnapshot();
        setStatusError(msg);
        activeLiveParamsRef.current = null;
        lastSentLiveContextRef.current = '';
        setLiveLatencyMs(null);
        setLiveAnalysers({ micAnalyser: null, aiAnalyser: null });
        setLiveConnecting(false);
        setLiveMode(false);
        liveModeRef.current = false;
        setIsListening(false);
        setOrbState('error');
      },
      onClose: () => {
        flushLiveDraftTurns();
        persistLiveArchiveSnapshot();
        activeLiveParamsRef.current = null;
        lastSentLiveContextRef.current = '';
        setLiveLatencyMs(null);
        setLiveAnalysers({ micAnalyser: null, aiAnalyser: null });
        setLiveConnecting(false);
        setLiveMode(false);
        liveModeRef.current = false;
        setIsListening(false);
        setOrbState('idle');
      },
    });

    liveClientRef.current = client;
    try {
      await client.connect({
        language,
        voicePersona,
        interactiveContext: initialLiveCtx,
        bufferSize: animationComplexity === 'minimal' ? 2048 : 1024,
      });
    } catch (err) {
      client.disconnect();
      liveClientRef.current = null;
      activeLiveParamsRef.current = null;
      lastSentLiveContextRef.current = '';
      setLiveLatencyMs(null);
      setLiveConnecting(false);
      setLiveMode(false);
      liveModeRef.current = false;
      setIsListening(false);
      setOrbState('error');
      setStatusError(
        err instanceof Error
          ? err.message
          : 'Could not open full-duplex Live Voice WebSocket session.',
      );
    }
  }, [
    language,
    voicePersona,
    animationComplexity,
    step,
    subject.name,
    chapter.number,
    currentTopic,
    deactivateLiveMode,
    flushLiveDraftTurns,
    persistLiveArchiveSnapshot,
  ]);

  // Seamlessly re-negotiate the Live WebSocket session if the student switches voice or language mid-session
  useEffect(() => {
    if (!liveModeRef.current || liveConnecting) return;
    const active = activeLiveParamsRef.current;
    if (!active) return;
    if (active.language === language && active.voicePersona === voicePersona) return;
    void activateLiveMode();
  }, [language, voicePersona, liveConnecting, activateLiveMode]);

  // Launch Live Chat externally when invoked via Global Smart Voice HUD
  useEffect(() => {
    if (!externalLaunchLiveToken) return;
    if (lastExternalLiveTokenRef.current === externalLaunchLiveToken) return;
    lastExternalLiveTokenRef.current = externalLaunchLiveToken;
    if (!liveModeRef.current && !liveConnecting) {
      void activateLiveMode();
    }
  }, [externalLaunchLiveToken, liveConnecting, activateLiveMode]);

  const handleInterrupt = useCallback(() => {
    triggerHaptic('tap');
    isInterruptedRef.current = true;
    cancelBoardSyncTimers();

    const flushedCasual = casualCoalescerRef.current?.flushNow() || '';
    casualCoalescerRef.current?.cancel();
    casualCoalescerRef.current = null;

    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
    }

    const activeDraft = streamingDraftRef.current;
    const finalPartial = (flushedCasual || activeDraft?.text || '').trim();
    if (activeDraft && finalPartial) {
      setTurns((prev) => [
        ...prev,
        {
          id: activeDraft.id,
          speaker: 'arora',
          text: sanitizeAroraOutput(finalPartial),
          provider: 'ARORA AI (Interrupted)',
        },
      ]);
    }
    streamingDraftRef.current = null;
    setStreamingCasualDraft(null);

    if (liveModeRef.current && liveClientRef.current) {
      liveClientRef.current.interruptPlayback(true);
      flushLiveDraftTurns();
      setOrbState('listening');
      return;
    }

    stopAroraSpeech();
    stopMicRef.current?.();
    setIsListening(false);
    setOrbState('idle');
  }, [cancelBoardSyncTimers, flushLiveDraftTurns]);

  const toggleLiveMode = () => {
    if (liveMode || liveConnecting || liveModalOpen) {
      deactivateLiveMode();
    } else {
      void activateLiveMode();
    }
  };

  const toggleLiveHoldPause = useCallback(() => {
    triggerHaptic('tap');
    setLiveHoldPaused((prev) => {
      const nextHold = !prev;
      if (liveClientRef.current) {
        if (nextHold) {
          liveClientRef.current.interruptPlayback(true);
          liveClientRef.current.setMicPaused(true);
          liveClientRef.current.setMuted(true);
          setIsListening(false);
          setOrbState('idle');
        } else {
          liveClientRef.current.setMicPaused(false);
          liveClientRef.current.setMuted(!voiceOutputEnabledRef.current);
          setIsListening(true);
          setOrbState('listening');
        }
      }
      return nextHold;
    });
  }, []);

  const activateInteractiveMode = () => {
    triggerHaptic('submit');
    setStatusError(null);
    setIsPaused(false);
    setAttemptCount(0);
    setStep(1);
    const prompt =
      language === 'tamil'
        ? 'வணக்கம்! ARORA Interactive Classroom தயாராக உள்ளது. முதலில், எந்த பாடத்திட்டம் (Syllabus) வேண்டும்? CBSE-ஆ?'
        : language === 'tanglish'
          ? 'Vanakkam! ARORA Interactive Mode ON. First question: Which syllabus venum — CBSE-a?'
          : 'Interactive Mode activated. Question 1: Which syllabus would you like to study? (e.g., CBSE)';
    speakAndAppend(prompt, { provider: 'ARORA Interactive Classroom Core' });
  };

  const requestBoardDiagram = useCallback(
    async (topicPrompt: string, subjectCtx?: string, extraCtx?: string) => {
      if (isBoardDiagramLoading) return;
      setIsBoardDiagramLoading(true);
      try {
        const diagram = await fetchTeacherDiagram(
          topicPrompt,
          subjectCtx || `${subject.name} · ${chapter.title}`,
          extraCtx || `Draw a clear labelled CBSE Class 12 diagram for ${topicPrompt}`,
        );
        if (diagram) {
          dispatchBoardCuesNow([
            {
              id: createBoardBlockId('cue-diag-live'),
              op: 'append',
              delayRatio: 0,
              block: {
                id: createBoardBlockId('diag-live'),
                kind: 'diagram',
                tone: 'example',
                title: diagram.title || `Diagram · ${topicPrompt}`,
                content: diagram.caption || `Labelled board diagram for ${topicPrompt}`,
                generatedDiagram: diagram,
                topicTag: currentTopic,
                createdAt: new Date().toISOString(),
              },
            },
          ]);
        }
      } finally {
        setIsBoardDiagramLoading(false);
      }
    },
    [isBoardDiagramLoading, subject.name, chapter.title, currentTopic, dispatchBoardCuesNow],
  );

  const launchActiveClassroom = (
    subId: SubjectId,
    ch: ChapterContent,
    tIdx: number,
    diff: DifficultyLevel,
    style: TeachingStyle,
  ) => {
    const topic = ch.topics[tIdx] || ch.topics[0];
    const concept = ch.concepts[0] || ch.definitions[0]?.definition || ch.title;
    const formula = ch.formulas[0]?.expression || '';
    const firstQ = `Before I reveal the full derivation, how would you explain or apply "${topic}" in your own words?`;
    const newId = `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    setClassroomSessionId(newId);
    setClassroomCreatedAt(nowIso);
    setTopicsCovered([topic]);
    setCorrectCount(0);
    setIncorrectCount(0);
    setQuestionLog([]);
    setWrapupOpen(false);
    setWrapupData({ lessonSummary: '', revisionNotes: '', assessment: [] });
    setCurrentQuestion(firstQ);
    setAttemptCount(0);
    setIsPaused(false);
    setStep(7);

    const launchCues = buildSubjectLaunchCues(subId, ch, topic, firstQ);
    const intro =
      language === 'tanglish'
        ? `Super! ${getSubjectById(subId).name}, Chapter ${ch.number}: ${ch.title} — Topic: ${topic} (${diff}, ${style}). Concept: ${concept}. Board-la formula and notes ezhuthirken. Ippo unga turn: ${firstQ}`
        : `Virtual Classroom live for ${getSubjectById(subId).name}, Chapter ${ch.number}: ${ch.title}, Topic: ${topic} at ${diff} level. Key idea: ${concept}. Let us begin — ${firstQ}`;

    speakAndAppend(intro, {
      formula,
      provider: 'ARORA Virtual Classroom Core',
      boardCues: launchCues,
    });
  };

  const handleResumeSavedClassroom = (session: ClassroomSessionRecord) => {
    triggerHaptic('submit');
    cancelBoardSyncTimers();
    stopAroraSpeech();
    setShowSavedClassroomsDrawer(false);
    setSubjectId(session.subjectId);
    setChapterId(session.chapterId);
    setTopicIndex(session.currentTopicIndex);
    setDifficulty(session.difficulty);
    setTeachingStyle(session.teachingStyle);
    setTeachingSpeed(session.teachingSpeed || 'normal');
    setBoardTheme(session.boardTheme || (appTheme === 'dark' ? 'blackboard' : 'whiteboard'));
    setBoardBlocks(session.boardBlocks || []);
    setActiveBoardBlockId(session.boardBlocks[session.boardBlocks.length - 1]?.id || null);
    setClassroomSessionId(session.id);
    setClassroomCreatedAt(session.createdAt);
    setTopicsCovered(session.topicsCovered || []);
    setCorrectCount(session.correctCount || 0);
    setIncorrectCount(session.incorrectCount || 0);
    setQuestionLog(session.questionLog || []);
    setCurrentQuestion(session.currentQuestion || '');
    setTurns(
      (session.turns || []).map((t) => ({
        id: t.id,
        speaker: t.speaker,
        text: t.text,
        formula: t.formula,
        provider: t.provider,
      })),
    );
    setIsPaused(false);
    setStep(7);
    if (session.currentQuestion) {
      speakAndAppend(
        `Welcome back to ${session.chapterTitle}! Here is where we left off on the board: ${session.currentQuestion}`,
        { provider: 'ARORA Virtual Classroom Core' },
      );
    }
  };

  const handleExportClassroomNotes = useCallback(() => {
    triggerHaptic('tap');
    const md = exportBoardNotesMarkdown({
      subjectName: subject.name,
      chapterTitle: `Chapter ${chapter.number}: ${chapter.title}`,
      topic: currentTopic,
      blocks: boardBlocks,
      questionLog,
      lessonSummary: wrapupData.lessonSummary,
      revisionNotes: wrapupData.revisionNotes,
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arora-${subject.id}-ch${chapter.number}-notes.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [
    subject.name,
    subject.id,
    chapter.number,
    chapter.title,
    currentTopic,
    boardBlocks,
    questionLog,
    wrapupData.lessonSummary,
    wrapupData.revisionNotes,
  ]);

  const handleWrapUpClassroom = async () => {
    triggerHaptic('submit');
    stopAroraSpeech();
    cancelBoardSyncTimers();
    setWrapupOpen(true);
    setWrapupLoading(true);

    const boardNotesSummary = boardBlocks
      .map((b) => `${b.title || b.kind}: ${b.content}`)
      .slice(-14);

    try {
      const res = await fetch('/api/ai/classroom-wrapup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.name,
          chapter: `Ch ${chapter.number}: ${chapter.title}`,
          topicsCovered,
          boardNotes: boardNotesSummary,
          questionLog: questionLog.map((q) => ({
            question: q.question,
            studentAnswer: q.studentAnswer,
            status: q.status,
          })),
          language,
        }),
      });
      if (!res.ok) throw new Error('Wrap-up service unavailable');
      const data = (await res.json()) as {
        lessonSummary: string;
        revisionNotes: string;
        assessment: ClassroomAssessmentItem[];
      };
      setWrapupData(data);
      persistActiveClassroomSnapshot({
        status: 'completed',
        lessonSummary: data.lessonSummary,
        revisionNotes: data.revisionNotes,
        assessment: data.assessment,
      });
    } catch {
      const fallbackSummary = `Completed interactive study on ${subject.name} (${chapter.title}), covering ${topicsCovered.join(', ') || currentTopic}. Answered ${correctCount} question(s) accurately.`;
      const fallbackNotes = [
        `### ${chapter.title} — Revision Recap`,
        ...chapter.concepts.slice(0, 3).map((c) => `- ${c}`),
        ...chapter.formulas.slice(0, 3).map((f) => `- **${f.name}:** ${f.expression}`),
      ].join('\n');
      const fallbackQuiz: ClassroomAssessmentItem[] = chapter.definitions
        .slice(0, 2)
        .map((d, i) => ({
          id: `fb-q-${i}`,
          question: `Which statement accurately defines "${d.term}"?`,
          options: [
            d.definition,
            'A scalar invariant independent of field geometry.',
            'An empirically negated hypothesis from classical mechanics.',
            'None of the above.',
          ],
          correctIndex: 0,
          explanation: `${d.term}: ${d.definition}`,
          topic: currentTopic,
        }));
      setWrapupData({
        lessonSummary: fallbackSummary,
        revisionNotes: fallbackNotes,
        assessment: fallbackQuiz,
      });
      persistActiveClassroomSnapshot({
        status: 'completed',
        lessonSummary: fallbackSummary,
        revisionNotes: fallbackNotes,
        assessment: fallbackQuiz,
      });
    } finally {
      setWrapupLoading(false);
    }
  };

  const handleCasualConversation = async (
    trimmed: string,
    priorHistory: { role: 'user' | 'assistant'; content: string }[],
  ) => {
    if (
      operatingMode === 'reconnecting' ||
      (typeof navigator !== 'undefined' && navigator.onLine === false)
    ) {
      setOrbState('error');
      setLastFailedUtterance(trimmed);
      setStatusError('Network connection is currently offline or reconnecting. Tap Retry once online.');
      return;
    }

    // Cancel any outdated in-flight request when the user starts a new turn
    casualCoalescerRef.current?.cancel();
    casualCoalescerRef.current = null;
    aiAbortRef.current?.abort();

    isInterruptedRef.current = false;
    setLastFailedUtterance(null);
    setOrbState('thinking');

    const controller = new AbortController();
    aiAbortRef.current = controller;
    const draftId = `arora-${Date.now()}`;
    const initialDraft = { id: draftId, text: '' };
    streamingDraftRef.current = initialDraft;
    setStreamingCasualDraft(initialDraft);

    const diagramCheck = detectDiagramRequest(trimmed);
    const shouldDrawDiagram = includeDiagramNext || diagramCheck.wantsDiagram;
    if (includeDiagramNext) setIncludeDiagramNext(false);
    const diagramPromise = shouldDrawDiagram
      ? fetchTeacherDiagram(
          diagramCheck.cleanTopic || trimmed,
          'ARORA AI Teacher',
          trimmed,
          controller.signal,
        )
      : Promise.resolve(undefined);

    const coalescer = createStreamCoalescer(
      (flushedText) => {
        if (isInterruptedRef.current || controller.signal.aborted) return;
        const nextDraft = { id: draftId, text: flushedText };
        streamingDraftRef.current = nextDraft;
        setStreamingCasualDraft(nextDraft);
      },
      {
        flushIntervalMs: animationComplexity === 'minimal' ? 68 : 44,
        sanitize: sanitizeAroraOutput,
      },
    );
    casualCoalescerRef.current = coalescer;

    try {
      setOrbState('processing');
      let accumulated = '';
      let finalSources: { title: string; uri: string }[] = [];
      let finalProvider = 'ARORA AI';
      let markedGenerating = false;

      const streamTimeout = createRequestTimeoutGuard(controller.signal, 24000);
      try {
        const res = await fetch('/api/ai/teacher-casual/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: streamTimeout.signal,
          body: JSON.stringify({
            message: trimmed,
            language,
            history: priorHistory,
          }),
        });

        if (!res.ok || !res.body) {
          streamTimeout.cleanup();
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const consumeFrameChunk = (rawChunk: string) => {
          buffer += rawChunk;
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() || '';
          for (const frame of frames) {
            for (const rawLine of frame.split(/\r?\n/)) {
              const line = rawLine.trim();
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;
              let evt: {
                type?: string;
                delta?: string;
                text?: string;
                provider?: string;
                sources?: { title: string; uri: string }[];
                error?: string;
              };
              try {
                evt = JSON.parse(jsonStr);
              } catch {
                continue;
              }
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
              } else if (evt.type === 'error') {
                streamTimeout.markFirstByte();
                throw new Error(evt.error || 'ARORA Cloud stream failed.');
              }
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || isInterruptedRef.current) break;
          streamTimeout.markFirstByte();
          consumeFrameChunk(decoder.decode(value, { stream: true }));
        }
        if (buffer.trim() && !isInterruptedRef.current) {
          consumeFrameChunk('\n\n');
        }
        const flushedEnd = coalescer.flushNow();
        if (!accumulated.trim() && flushedEnd.trim()) {
          accumulated = flushedEnd;
        }
        streamTimeout.cleanup();
      } catch (streamErr) {
        streamTimeout.cleanup();
        coalescer.cancel();
        if (casualCoalescerRef.current === coalescer) casualCoalescerRef.current = null;
        const partial = coalescer.getText();
        if (partial.trim()) accumulated = partial;
        if (
          (streamErr instanceof DOMException && streamErr.name === 'AbortError' && !streamTimeout.didTimeout()) ||
          isInterruptedRef.current ||
          accumulated.trim().length > 0
        ) {
          throw streamErr;
        }
        const fallbackTimeout = createRequestTimeoutGuard(controller.signal, 18000);
        try {
          const fallbackRes = await fetch('/api/ai/teacher-casual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: fallbackTimeout.signal,
            body: JSON.stringify({
              message: trimmed,
              language,
              history: priorHistory,
            }),
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
                  ? 'Response timed out on current connection. Tap Retry.'
                  : streamErr instanceof Error
                    ? streamErr.message
                    : 'Cloud request interrupted'),
            );
          }
          accumulated = sanitizeAroraOutput(fallbackData.text);
          if (fallbackData.provider) finalProvider = fallbackData.provider;
          if (Array.isArray(fallbackData.sources)) finalSources = fallbackData.sources;
        } catch (fbErr) {
          if (fallbackTimeout.didTimeout()) {
            throw new Error('Request timed out on slow network. Please tap Retry.');
          }
          throw fbErr;
        } finally {
          fallbackTimeout.cleanup();
        }
      } finally {
        coalescer.cancel();
        if (casualCoalescerRef.current === coalescer) casualCoalescerRef.current = null;
      }

      const generatedDiagram = !isInterruptedRef.current ? await diagramPromise : undefined;

      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      streamingDraftRef.current = null;
      setStreamingCasualDraft(null);

      if (isInterruptedRef.current || controller.signal.aborted) return;
      if (accumulated.trim()) {
        speakAndAppend(accumulated, {
          provider: finalProvider,
          sources: finalSources,
          diagram: generatedDiagram,
        });
      } else {
        setOrbState('idle');
      }
    } catch (err) {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      streamingDraftRef.current = null;
      setStreamingCasualDraft(null);
      if ((err instanceof DOMException && err.name === 'AbortError') || isInterruptedRef.current) {
        setOrbState('idle');
        return;
      }
      setOrbState('error');
      setLastFailedUtterance(trimmed);
      setStatusError(
        `Cloud AI connection interrupted (${err instanceof Error ? err.message : 'network error'}). Tap Retry to send again.`,
      );
    }
  };

  const processUtterance = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    setStatusError(null);

    const cmd = detectSpokenInteractiveCommand(trimmed);

    if (cmd === 'interrupt') {
      handleInterrupt();
      return;
    }

    if (cmd === 'live_on') {
      setTurns((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, speaker: 'student', text: trimmed },
      ]);
      void activateLiveMode();
      return;
    }

    if (cmd === 'live_off') {
      setTurns((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, speaker: 'student', text: trimmed },
      ]);
      deactivateLiveMode();
      return;
    }

    const smartAction = parseSmartVoiceCommand(trimmed);
    if (
      smartAction &&
      (smartAction.kind === 'set_theme' ||
        smartAction.kind === 'set_language' ||
        smartAction.kind === 'set_voice_persona' ||
        smartAction.kind === 'history_back' ||
        smartAction.kind === 'stop_speech')
    ) {
      if (smartAction.kind === 'stop_speech') {
        handleInterrupt();
      }
      setTurns((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, speaker: 'student', text: trimmed },
        {
          id: `arora-smart-${Date.now()}`,
          speaker: 'arora',
          text: smartAction.spokenConfirmation,
          provider: 'ARORA Smart Voice Engine',
        },
      ]);
      if (
        (smartAction.kind === 'history_back' || smartAction.kind === 'stop_speech') &&
        liveModeRef.current
      ) {
        deactivateLiveMode();
      }
      onExecuteSmartVoice?.(smartAction);
      return;
    }

    const globalNavIntent = detectGlobalNavigationCommand(trimmed);
    if (globalNavIntent && (onNavigateByVoice || onExecuteSmartVoice)) {
      setTurns((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, speaker: 'student', text: trimmed },
        {
          id: `arora-nav-${Date.now()}`,
          speaker: 'arora',
          text: globalNavIntent.spokenConfirmation,
          provider: 'ARORA Voice Navigator',
        },
      ]);
      if (onExecuteSmartVoice) {
        if (liveModeRef.current) deactivateLiveMode();
        onExecuteSmartVoice({
          kind: 'navigate',
          intent: globalNavIntent,
          spokenConfirmation: globalNavIntent.spokenConfirmation,
        });
      } else {
        executeGlobalVoiceNavigation(globalNavIntent);
      }
      return;
    }

    // If Full-Duplex Live WebSocket session is active, route ALL messages & classroom commands directly over WebSocket without REST fallback
    if (liveModeRef.current && liveClientRef.current) {
      if (cmd === 'end_class') {
        setStep(0);
        setIsPaused(false);
      } else if (cmd === 'pause') {
        setIsPaused(true);
      } else if (cmd === 'resume') {
        setIsPaused(false);
      } else if (cmd === 'make_easier') {
        const idx = Math.max(0, DIFFICULTIES.indexOf(difficulty) - 1);
        setDifficulty(DIFFICULTIES[idx]);
      } else if (cmd === 'make_harder') {
        const idx = Math.min(DIFFICULTIES.length - 1, DIFFICULTIES.indexOf(difficulty) + 1);
        setDifficulty(DIFFICULTIES[idx]);
      } else if (cmd === 'next_topic') {
        onMarkTopicCompleted(`${chapter.id}:${currentTopic}`);
        setTopicIndex((prev) => (prev + 1) % chapter.topics.length);
      }

      persistLiveArchiveSnapshot([{ speaker: 'student', text: trimmed }]);
      setTurns((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, speaker: 'student', text: trimmed },
      ]);
      liveClientRef.current.sendText(trimmed);
      return;
    }

    const priorHistory = turns.slice(-10).map((t) => ({
      role: (t.speaker === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: t.text,
    }));

    setTurns((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, speaker: 'student', text: trimmed },
    ]);

    // Casual AI Teacher Agent Mode (Default when step === 0)
    if (step === 0) {
      if (cmd === 'activate') {
        activateInteractiveMode();
        return;
      }
      await handleCasualConversation(trimmed, priorHistory);
      return;
    }

    // Exit Interactive Classroom Mode -> return to normal Casual AI Agent Mode
    if (cmd === 'end_class') {
      stopAroraSpeech();
      setStep(0);
      setIsPaused(false);
      setOrbState('idle');
      speakAndAppend(
        language === 'tanglish'
          ? 'Interactive mode off pannitten. Ippo namma normal-a casual-a pesalam! Enna ketkanum?'
          : language === 'tamil'
            ? 'Interactive Mode நிறுத்தப்பட்டது. இப்போது சாதாரணமாக உரையாடலாம். என்ன கேட்க விரும்புகிறீர்கள்?'
            : 'Interactive Mode off—we are back in casual conversation mode. Feel free to ask me anything!',
        { provider: 'ARORA AI' },
      );
      return;
    }

    if (cmd === 'pause') {
      stopAroraSpeech();
      setIsPaused(true);
      setOrbState('idle');
      speakAndAppend('Class paused. Say "Resume" whenever you are ready to continue.');
      return;
    }
    if (cmd === 'resume') {
      setIsPaused(false);
      speakAndAppend(`Resuming ${chapter.title} (${currentTopic}). Current question: ${currentQuestion}`);
      return;
    }
    if (isPaused) {
      speakAndAppend('Class is currently paused. Say or click "Resume" to continue.');
      return;
    }

    // Handle 6-step ONE BY ONE Voice Onboarding
    if (step === 1) {
      setSyllabusName(trimmed.toUpperCase().includes('NCERT') ? 'CBSE / NCERT' : trimmed);
      setStep(2);
      speakAndAppend('Got it. Question 2: Which class are you studying in? (e.g., Class 12)');
      return;
    }
    if (step === 2) {
      setClassName(trimmed);
      setStep(3);
      speakAndAppend('Question 3: Which subject? Physics, Chemistry, Mathematics, Biology, English, or Computer Science?');
      return;
    }
    if (step === 3) {
      const lower = trimmed.toLowerCase();
      const matched =
        CBSE_CLASS_12_CURRICULUM.find(
          (s) => lower.includes(s.name.toLowerCase()) || lower.includes(s.id.replace('_', ' ')),
        ) || subject;
      setSubjectId(matched.id);
      setChapterId(matched.chapters[0].id);
      setStep(4);
      speakAndAppend(
        `Subject set to ${matched.name}. Question 4: Which chapter would you like? (For example, Chapter 1: ${matched.chapters[0].title}, or say any chapter name/number)`,
      );
      return;
    }
    if (step === 4) {
      const lower = trimmed.toLowerCase();
      const numMatch = lower.match(/\b([0-9]{1,2})\b/);
      const matchedCh =
        (numMatch
          ? subject.chapters.find((c) => c.number === Number(numMatch[1]))
          : undefined) ||
        subject.chapters.find((c) => c.title.toLowerCase().includes(lower)) ||
        subject.chapters[0];
      setChapterId(matchedCh.id);
      setTopicIndex(0);
      setStep(5);
      speakAndAppend(
        `Chapter ${matchedCh.number}: ${matchedCh.title}. Question 5: Which topic would you like to focus on? Available topics include ${matchedCh.topics.slice(0, 3).join(', ')}.`,
      );
      return;
    }
    if (step === 5) {
      const lower = trimmed.toLowerCase();
      const idx = chapter.topics.findIndex((t) => t.toLowerCase().includes(lower));
      setTopicIndex(idx >= 0 ? idx : 0);
      setStep(6);
      speakAndAppend(
        'Question 6: Which difficulty (Easy, Moderate, Hard, Expert) and teaching style (Conceptual learning, Question-and-answer, Problem solving, Board preparation, or Numerical practice) do you prefer?',
      );
      return;
    }
    if (step === 6) {
      const lower = trimmed.toLowerCase();
      const chosenDiff =
        DIFFICULTIES.find((d) => lower.includes(d.toLowerCase())) || difficulty;
      const chosenStyle =
        STYLES.find((s) => lower.includes(s.toLowerCase().split(' ')[0])) || teachingStyle;
      setDifficulty(chosenDiff);
      setTeachingStyle(chosenStyle);
      launchActiveClassroom(subjectId, chapter, topicIndex, chosenDiff, chosenStyle);
      return;
    }

    // Active Virtual Classroom Step (Step 7)
    if (cmd === 'clear_board') {
      cancelBoardSyncTimers();
      setBoardBlocks([]);
      setActiveBoardBlockId(null);
      speakAndAppend('Digital board cleared. Tell me what you would like to study or solve next!', {
        provider: 'ARORA Virtual Classroom Core',
      });
      return;
    }

    if (cmd === 'zoom_in') {
      const nextZ = Math.min(160, boardZoom + 20);
      setBoardZoom(nextZ);
      speakAndAppend(`Board zoomed in to ${nextZ} percent.`, {
        provider: 'ARORA Virtual Classroom Core',
      });
      return;
    }

    if (cmd === 'zoom_out') {
      const nextZ = Math.max(70, boardZoom - 20);
      setBoardZoom(nextZ);
      speakAndAppend(`Board zoomed out to ${nextZ} percent.`, {
        provider: 'ARORA Virtual Classroom Core',
      });
      return;
    }

    if (cmd === 'reset_zoom') {
      setBoardZoom(100);
      speakAndAppend('Board zoom reset to 100 percent.', {
        provider: 'ARORA Virtual Classroom Core',
      });
      return;
    }

    if (cmd === 'slow_down') {
      setTeachingSpeed('slow');
      teachingSpeedRef.current = 'slow';
      speakAndAppend(
        'Got it, I will slow down and walk through each step on the board carefully.',
        { provider: 'ARORA Virtual Classroom Core' },
      );
      return;
    }

    if (cmd === 'speed_up') {
      setTeachingSpeed((prev) => {
        const next = prev === 'slow' ? 'normal' : 'fast';
        teachingSpeedRef.current = next;
        return next;
      });
      speakAndAppend('Adjusted teaching pace upward. Ready for the next step.', {
        provider: 'ARORA Virtual Classroom Core',
      });
      return;
    }

    if (cmd === 'make_easier') {
      const idx = Math.max(0, DIFFICULTIES.indexOf(difficulty) - 1);
      setDifficulty(DIFFICULTIES[idx]);
    } else if (cmd === 'make_harder') {
      const idx = Math.min(DIFFICULTIES.length - 1, DIFFICULTIES.indexOf(difficulty) + 1);
      setDifficulty(DIFFICULTIES[idx]);
    } else if (cmd === 'next_topic') {
      onMarkTopicCompleted(`${chapter.id}:${currentTopic}`);
      const nextIdx = (topicIndex + 1) % chapter.topics.length;
      setTopicIndex(nextIdx);
      const nextT = chapter.topics[nextIdx];
      setTopicsCovered((prev) => (prev.includes(nextT) ? prev : [...prev, nextT]));
      const nextQ = `Let us move to "${nextT}". What do you already know about this concept?`;
      setCurrentQuestion(nextQ);
      setAttemptCount(0);
      const nextTopicCues = buildSubjectLaunchCues(subjectId, chapter, nextT, nextQ);
      speakAndAppend(`Moving to next topic: ${nextT}. ${nextQ}`, {
        formula: chapter.formulas[0]?.expression,
        provider: 'ARORA Virtual Classroom Core',
        boardCues: nextTopicCues,
      });
      return;
    }

    if (operatingMode === 'reconnecting') {
      // Offline resilient fallbacks when student issues board commands without cloud connectivity
      if (cmd === 'solve_step_by_step') {
        const stepCues = buildStepByStepFallbackCues(subjectId, chapter, currentTopic);
        if (stepCues.length > 0) {
          speakAndAppend(
            `Here is the worked step-by-step solution on the board for ${currentTopic}.`,
            { provider: 'ARORA Local Classroom Board', boardCues: stepCues },
          );
          return;
        }
      }
      if (cmd === 'write_on_board') {
        const lastAroraTurn = [...turns].reverse().find((t) => t.speaker === 'arora');
        const noteContent =
          lastAroraTurn?.formula ||
          lastAroraTurn?.text ||
          chapter.concepts[0] ||
          chapter.title;
        speakAndAppend(`Written on the board for ${currentTopic}.`, {
          provider: 'ARORA Local Classroom Board',
          boardCues: [
            {
              id: createBoardBlockId('cue-write-local'),
              op: 'append',
              delayRatio: 0.05,
              block: {
                id: createBoardBlockId('write-local'),
                kind: lastAroraTurn?.formula ? 'formula' : 'explanation',
                tone: lastAroraTurn?.formula ? 'formula' : 'important',
                title: `${currentTopic} · Board Note`,
                content: noteContent,
                isHighlighted: !lastAroraTurn?.formula,
                topicTag: currentTopic,
                createdAt: new Date().toISOString(),
              },
            },
          ],
        });
        return;
      }
      if (cmd === 'ask_question') {
        const nextQ = `Quick concept check on ${currentTopic}: state its core rule or formula and one real CBSE Board application.`;
        setCurrentQuestion(nextQ);
        setAttemptCount(0);
        speakAndAppend(nextQ, {
          provider: 'ARORA Local Classroom Board',
          boardCues: [
            {
              id: createBoardBlockId('cue-q-local'),
              op: 'append',
              delayRatio: 0.1,
              block: {
                id: createBoardBlockId('q-local'),
                kind: 'question',
                tone: 'question',
                title: 'Your Turn',
                content: nextQ,
                topicTag: currentTopic,
                createdAt: new Date().toISOString(),
              },
            },
          ],
        });
        return;
      }
      setOrbState('error');
      setStatusError('Network connection is currently reconnecting. Please try again in a moment.');
      return;
    }

    isInterruptedRef.current = false;
    setOrbState('thinking');

    const controller = new AbortController();
    aiAbortRef.current?.abort();
    aiAbortRef.current = controller;
    const step7DiagramIntent = detectDiagramRequest(trimmed);
    const shouldStep7Diagram = includeDiagramNext || step7DiagramIntent.wantsDiagram;
    if (includeDiagramNext) setIncludeDiagramNext(false);
    const step7DiagramPromise = shouldStep7Diagram
      ? fetchTeacherDiagram(
          step7DiagramIntent.cleanTopic || `${currentTopic} (${chapter.title})`,
          `${subject.name} · ${chapter.title}`,
          trimmed,
          controller.signal,
        )
      : Promise.resolve(undefined);

    const step7Timeout = createRequestTimeoutGuard(controller.signal, 24000);
    try {
      setOrbState('processing');
      const res = await fetch('/api/ai/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: step7Timeout.signal,
        body: JSON.stringify({
          subject: subject.name,
          chapter: chapter.title,
          topic: currentTopic,
          difficulty,
          teachingStyle,
          language,
          studentUtterance: trimmed,
          currentConcept: chapter.concepts.join(' '),
          currentQuestion,
          attemptCount,
          struggleCount: incorrectCount,
          recentHistory: turns.slice(-8).map((t) => ({
            role: (t.speaker === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: t.text,
          })),
          command: cmd,
          boardContext: {
            teachingSpeed: teachingSpeedRef.current,
            existingBlockTitles: boardBlocks.slice(-6).map((b) => b.title || b.kind),
          },
        }),
      });
      step7Timeout.markFirstByte();
      step7Timeout.cleanup();
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        spokenResponse: string;
        evaluationStatus: string;
        nextQuestion: string;
        formulaHighlight: string;
        adaptedDifficulty: DifficultyLevel;
        advanceTopic: boolean;
        teachingSpeedHint?: string;
        diagramTopic?: string;
        boardCues?: BoardCueEvent[];
        provider: string;
      };

      let step7Diagram = !isInterruptedRef.current ? await step7DiagramPromise : undefined;
      if (!step7Diagram && data.diagramTopic && !isInterruptedRef.current) {
        void requestBoardDiagram(
          data.diagramTopic,
          `${subject.name} · ${chapter.title}`,
          data.spokenResponse.slice(0, 300),
        );
      }

      if (isInterruptedRef.current) return;
      if (DIFFICULTIES.includes(data.adaptedDifficulty)) {
        setDifficulty(data.adaptedDifficulty);
      }
      if (
        data.teachingSpeedHint === 'slow' ||
        data.teachingSpeedHint === 'normal' ||
        data.teachingSpeedHint === 'fast'
      ) {
        setTeachingSpeed(data.teachingSpeedHint);
        teachingSpeedRef.current = data.teachingSpeedHint;
      }

      if (data.evaluationStatus === 'correct') {
        onMarkTopicCompleted(`${chapter.id}:${currentTopic}`);
        setCorrectCount((c) => c + 1);
      } else if (data.evaluationStatus === 'incorrect' || data.evaluationStatus === 'partial') {
        setIncorrectCount((c) => c + 1);
      }

      if (!cmd && currentQuestion) {
        const logStatus: ClassroomQuestionLogItem['status'] =
          data.evaluationStatus === 'correct'
            ? 'correct'
            : data.evaluationStatus === 'partial'
              ? 'partial'
              : data.evaluationStatus === 'incorrect'
                ? 'incorrect'
                : 'skipped';
        setQuestionLog((prev) => [
          ...prev.slice(-24),
          {
            id: `qlog-${Date.now()}`,
            question: currentQuestion,
            studentAnswer: trimmed,
            status: logStatus,
            topic: currentTopic,
            feedback: data.spokenResponse,
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      const assembledCues: BoardCueEvent[] = [...(data.boardCues || [])];
      if (step7Diagram) {
        assembledCues.push({
          id: createBoardBlockId('cue-diag-turn'),
          op: 'append',
          delayRatio: 0.35,
          block: {
            id: createBoardBlockId('diag-turn'),
            kind: 'diagram',
            tone: 'example',
            title: step7Diagram.title || `Diagram · ${currentTopic}`,
            content: step7Diagram.caption,
            generatedDiagram: step7Diagram,
            topicTag: currentTopic,
            createdAt: new Date().toISOString(),
          },
        });
      } else if (assembledCues.length === 0 && data.spokenResponse) {
        assembledCues.push({
          id: createBoardBlockId('cue-fallback'),
          op: 'append',
          delayRatio: 0.1,
          block: {
            id: createBoardBlockId('exp-fb'),
            kind: data.formulaHighlight ? 'formula' : 'explanation',
            tone: data.formulaHighlight ? 'formula' : 'default',
            title: `${currentTopic} · Live Board Note`,
            content: data.formulaHighlight || data.spokenResponse,
            topicTag: currentTopic,
            createdAt: new Date().toISOString(),
          },
        });
      }

      if (data.nextQuestion) {
        assembledCues.push({
          id: createBoardBlockId('cue-nextq'),
          op: 'append',
          delayRatio: 0.85,
          block: {
            id: createBoardBlockId('q-turn'),
            kind: 'question',
            tone: 'question',
            title: 'Your Turn',
            content: data.nextQuestion,
            topicTag: currentTopic,
            createdAt: new Date().toISOString(),
          },
        });
      }

      setCurrentQuestion(data.nextQuestion);
      setAttemptCount((c) => (data.evaluationStatus === 'correct' ? 0 : c + 1));
      setOrbState('generating');
      speakAndAppend(
        data.nextQuestion
          ? `${data.spokenResponse}\n\nNext Question: ${data.nextQuestion}`
          : data.spokenResponse,
        {
          formula: data.formulaHighlight || undefined,
          provider: data.provider,
          diagram: step7Diagram,
          boardCues: assembledCues,
        },
      );
    } catch (err) {
      step7Timeout.cleanup();
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      if (
        (err instanceof DOMException && err.name === 'AbortError' && !step7Timeout.didTimeout()) ||
        isInterruptedRef.current
      ) {
        setOrbState('idle');
        return;
      }
      setOrbState('error');
      setLastFailedUtterance(trimmed);
      setStatusError(
        step7Timeout.didTimeout()
          ? 'Interactive Classroom response timed out. Tap Retry to continue.'
          : `Interactive AI Classroom could not reach ARORA Cloud (${err instanceof Error ? err.message : 'network error'}). Please try your answer again.`,
      );
    }
  };

  processUtteranceRef.current = processUtterance;

  const toggleMic = () => {
    triggerHaptic('tap');
    if (liveMode) {
      // In full-duplex Live Mode, allow quick mic pause/resume without tearing down the WebSocket
      const nextListening = !isListening;
      liveClientRef.current?.setMicPaused(!nextListening);
      setIsListening(nextListening);
      setOrbState(nextListening ? 'listening' : 'idle');
      return;
    }

    if (isListening) {
      stopMicRef.current?.();
      setIsListening(false);
      setOrbState('idle');
      return;
    }

    stopMicRef.current?.();
    stopAroraSpeech();
    setStatusError(null);
    setIsListening(true);
    setOrbState('listening');
    stopMicRef.current = startVoiceRecognition(
      language,
      (transcript) => {
        setIsListening(false);
        setOrbState('processing');
        void processUtteranceRef.current(transcript);
      },
      () => {
        setIsListening(false);
        setOrbState((prev) => (prev === 'listening' ? 'idle' : prev));
      },
      (err) => {
        setIsListening(false);
        setOrbState('error');
        setStatusError(err);
      },
    );
  };

  const canInterruptNow =
    orbState === 'speaking' ||
    orbState === 'thinking' ||
    orbState === 'processing' ||
    orbState === 'generating' ||
    isListening ||
    liveMode;

  const visibleTurns: ClassroomTurn[] = useMemo(() => {
    const base = [...turns];
    if (streamingCasualDraft) {
      base.push({
        id: streamingCasualDraft.id,
        speaker: 'arora',
        text: streamingCasualDraft.text || 'Thinking...',
        provider: 'ARORA AI',
      });
    }
    if (liveDrafts.input.trim()) {
      base.push({
        id: 'live-draft-input',
        speaker: 'student',
        text: liveDrafts.input,
      });
    }
    if (liveDrafts.output.trim()) {
      base.push({
        id: 'live-draft-output',
        speaker: 'arora',
        text: liveDrafts.output,
        provider: 'ARORA Live Voice',
      });
    }
    return base;
  }, [turns, streamingCasualDraft, liveDrafts]);

  const hiddenTurnCount = Math.max(0, visibleTurns.length - turnWindowSize);
  const windowedTurns = useMemo(
    () =>
      hiddenTurnCount > 0
        ? visibleTurns.slice(visibleTurns.length - turnWindowSize)
        : visibleTurns,
    [visibleTurns, hiddenTurnCount, turnWindowSize],
  );

  useEffect(() => {
    const el = dialogueScrollRef.current;
    if (!el) return;
    const isStreamingDraft = Boolean(
      streamingCasualDraft?.text || liveDrafts.input || liveDrafts.output,
    );
    el.scrollTo({
      top: el.scrollHeight,
      behavior: isStreamingDraft || animationComplexity === 'minimal' ? 'auto' : 'smooth',
    });
  }, [
    visibleTurns.length,
    streamingCasualDraft?.text,
    liveDrafts.input,
    liveDrafts.output,
    animationComplexity,
  ]);

  useEffect(() => {
    const el = teacherTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [inputValue]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          {step > 0 && (
            <GlassBackButton
              label={step === 7 ? 'Back to Casual Mode' : `Back (Step ${step - 1})`}
              onClick={() => {
                stopAroraSpeech();
                setIsPaused(false);
                setOrbState('idle');
                if (step === 7 || step === 1) {
                  setStep(0);
                } else {
                  setStep((step - 1) as SetupStep);
                }
              }}
            />
          )}
          <div>
            <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
              {liveMode
                ? `Full-Duplex WebSocket Live Voice · Speak Anytime to Barge In · 24kHz Audio${liveLatencyMs !== null ? ` · ${liveLatencyMs}ms RTT` : ''}`
                : liveConnecting
                  ? 'Connecting Full-Duplex Live Voice WebSocket...'
                  : step === 0
                    ? 'Casual AI Teacher Agent · Ultra-Fast Stream · Say "Interactive mode on" for Classroom'
                    : 'Voice-First Interactive Classroom · Attempt Before Reveal Enforced'}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              ARORA AI Teacher
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleLiveMode}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold glass-press min-h-[40px] border transition-all ${
              liveMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/60 shadow-sm shadow-emerald-500/30'
                : liveConnecting
                  ? 'bg-sky-600 text-white border-sky-400/60 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white border-cyan-400/50 shadow-sm shadow-cyan-500/25'
            }`}
          >
            <AudioLines className={`w-4 h-4 ${liveMode ? 'animate-pulse text-white' : 'text-white'}`} />
            {liveConnecting ? 'Connecting Live Chat...' : liveMode ? 'Live Chat Active' : 'Live Chat'}
          </button>

          <select
            value={voicePersona}
            onChange={(e) => onChangeVoicePersona(e.target.value as VoicePersona)}
            aria-label="ARORA Voice Persona"
            className="px-3.5 py-2 glass-input text-xs font-medium min-h-[40px]"
          >
            <option value="Zephyr">Voice: Siri-Like (Zephyr)</option>
            <option value="Kore">Voice: Warm Human (Kore)</option>
            <option value="Puck">Voice: Clear Studio (Puck)</option>
            <option value="device_natural">Voice: Device Natural</option>
          </select>

          <select
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as LanguageMode)}
            aria-label="Voice language mode"
            className="px-3.5 py-2 glass-input text-xs font-medium min-h-[40px]"
          >
            <option value="indian_english">Indian English (en-IN)</option>
            <option value="tamil">Tamil (தமிழ்)</option>
            <option value="tanglish">Tamil-English Mixed (Tanglish)</option>
          </select>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              if (voiceOutputEnabled) stopAroraSpeech();
              setVoiceOutputEnabled((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px]"
          >
            {voiceOutputEnabled ? <Volume2 className="w-4 h-4 text-cyan-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            {voiceOutputEnabled ? 'Voice On' : 'Voice Muted'}
          </button>

          {liveChatSessions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowPastLiveDrawer((v) => !v);
                if (!selectedArchiveId && liveChatSessions[0]) {
                  setSelectedArchiveId(liveChatSessions[0].id);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium min-h-[40px] ${
                showPastLiveDrawer
                  ? 'border-cyan-400/60 text-cyan-600 dark:text-cyan-300'
                  : 'text-slate-700 dark:text-slate-200 hover:border-cyan-400/50'
              }`}
            >
              <History className="w-4 h-4 text-cyan-500" />
              Past Live Chats ({liveChatSessions.length})
            </button>
          )}

          {classroomSessions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowSavedClassroomsDrawer((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium min-h-[40px] ${
                showSavedClassroomsDrawer
                  ? 'border-emerald-400/60 text-emerald-600 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-200 hover:border-emerald-400/50'
              }`}
            >
              <BookOpenCheck className="w-4 h-4 text-emerald-500" />
              Saved Classes ({classroomSessions.length})
            </button>
          )}
        </div>
      </div>

      {showSavedClassroomsDrawer && classroomSessions.length > 0 && (
        <div className="holo-panel p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Saved &amp; Paused Virtual Classrooms
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resume any board session with your saved formulas, diagrams, and Q&amp;A progress intact
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSavedClassroomsDrawer(false)}
              aria-label="Close Saved Classes"
              className="p-2 rounded-xl glass-subcard text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classroomSessions.map((cs) => (
              <div key={cs.id} className="glass-subcard p-3.5 flex flex-col justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                    <span className="text-cyan-600 dark:text-cyan-400">
                      {getSubjectById(cs.subjectId).name} · {cs.difficulty}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 capitalize">
                      {cs.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {cs.chapterTitle}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {cs.boardBlocks.length} board notes · {cs.correctCount} correct ·{' '}
                    {new Date(cs.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleResumeSavedClassroom(cs)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold min-h-[36px] glass-press"
                  >
                    Resume Board
                  </button>
                  {onDeleteClassroomSession && (
                    <button
                      type="button"
                      onClick={() => onDeleteClassroomSession(cs.id)}
                      aria-label="Delete saved classroom"
                      className="p-2 rounded-xl glass-subcard text-rose-500 hover:bg-rose-500/12 min-h-[36px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPastLiveDrawer && liveChatSessions.length > 0 && (
        <div className="holo-panel p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Archived Live Voice Transcripts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every Live Chat call is saved automatically for revision and reference
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPastLiveDrawer(false)}
              aria-label="Close Past Live Chats"
              className="p-2 rounded-xl glass-subcard text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {liveChatSessions.map((sess) => {
                const active = (selectedArchiveId || liveChatSessions[0]?.id) === sess.id;
                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => setSelectedArchiveId(sess.id)}
                    className={`w-full text-left p-2.5 rounded-2xl transition-all glass-press ${
                      active
                        ? 'bg-sky-500/14 dark:bg-sky-500/18 border border-sky-400/50'
                        : 'glass-subcard border-transparent hover:border-white/30'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {sess.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(sess.updatedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {sess.messages.length} turns
                    </div>
                  </button>
                );
              })}
            </div>

            {(() => {
              const activeArchive =
                liveChatSessions.find((s) => s.id === selectedArchiveId) || liveChatSessions[0];
              if (!activeArchive) return null;
              return (
                <div className="md:col-span-7 glass-subcard p-3.5 flex flex-col gap-2.5 max-h-64">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {activeArchive.title}
                    </span>
                    {onOpenArchivedChatSession && (
                      <button
                        type="button"
                        onClick={() => onOpenArchivedChatSession(activeArchive.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold glass-press whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Continue in Chat
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                    {activeArchive.messages.map((m) => (
                      <div
                        key={m.id}
                        className={
                          m.role === 'user'
                            ? 'text-slate-900 dark:text-sky-200'
                            : 'text-slate-700 dark:text-slate-200'
                        }
                      >
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400 mr-1.5">
                          {m.role === 'user' ? 'You:' : 'ARORA AI:'}
                        </span>
                        <span>{m.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main 2-Zone Conversational & Interactive Virtual Classroom Stage */}
      {(() => {
        const orbPanelNode = (
          <div className={`holo-panel-elevated ${step === 7 ? 'p-4' : 'p-6'} flex flex-col items-center text-center space-y-3`}>
            <div
              role="button"
              tabIndex={0}
              aria-label={
                canInterruptNow
                  ? 'Tap orb to interrupt ARORA AI'
                  : 'ARORA AI Energy Orb'
              }
              onClick={() => {
                if (canInterruptNow) handleInterrupt();
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && canInterruptNow) {
                  e.preventDefault();
                  handleInterrupt();
                }
              }}
              className={canInterruptNow ? 'cursor-pointer' : ''}
            >
              <VoiceWaveVisualizer
                micAnalyser={liveAnalysers.micAnalyser}
                aiAnalyser={liveAnalysers.aiAnalyser}
                liveClientRef={liveClientRef}
                orbState={orbState}
                complexity={animationComplexity}
                liveMode={liveMode}
                isListening={isListening}
                paused={liveModalOpen}
                label={
                  liveMode
                    ? 'Full-Duplex Live Voice · Tap Orb to Interrupt'
                    : step === 0
                      ? 'Casual AI Agent · Fast Stream'
                      : 'Virtual Classroom · Synced Voice & Board'
                }
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              {liveMode
                ? 'Live Chat full-duplex audio active · Speak freely anytime to barge in'
                : step === 0
                  ? 'Tap Live Chat for a real-time two-way voice conversation, or launch the Virtual Classroom'
                  : step < 7
                    ? `Voice Onboarding Step ${step} of 6 · ${syllabusName} · ${className}`
                    : `${subject.name} · Ch ${chapter.number}: ${currentTopic} (${topicIndex + 1}/${chapter.topics.length})`}
            </div>

            {step === 7 && (
              <div className="w-full space-y-2 pt-1 text-left">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  <span>Lesson Progress</span>
                  <span className="tabular-nums">
                    {topicsCovered.length}/{chapter.topics.length} topics · {correctCount} correct
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round(((topicIndex + 1) / Math.max(1, chapter.topics.length)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Teaching Pace:
                  </span>
                  <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-white/[0.07] border border-white/40 dark:border-white/10 text-[11px]">
                    {(['slow', 'normal', 'fast'] as TeachingSpeed[]).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          setTeachingSpeed(spd);
                          teachingSpeedRef.current = spd;
                        }}
                        className={`px-2.5 py-1 rounded-lg capitalize font-medium ${
                          teachingSpeed === spd
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <button
                type="button"
                onClick={toggleLiveMode}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold glass-press min-h-[42px] shadow-sm ${
                  liveMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-cyan-500/25'
                }`}
              >
                <AudioLines className={`w-4 h-4 ${liveMode ? 'animate-pulse' : ''}`} />
                {liveConnecting ? 'Connecting...' : liveMode ? 'Live Active' : 'Live Chat'}
              </button>

              {!liveMode && step > 0 && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold glass-press min-h-[42px] shadow-sm ${
                    isListening
                      ? 'bg-rose-600 text-white shadow-rose-500/25'
                      : 'glass-subcard text-slate-700 dark:text-slate-200 hover:border-cyan-400/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {isListening ? 'Stop Mic' : 'Speak'}
                </button>
              )}

              {canInterruptNow && (
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-950/92 hover:bg-black text-white border border-rose-400/45 holo-blur text-xs font-semibold glass-press min-h-[42px]"
                >
                  <StopCircle className="w-4 h-4 text-rose-400" />
                  Interrupt
                </button>
              )}

              {step === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => launchActiveClassroom(subjectId, chapter, topicIndex, difficulty, teachingStyle)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold glass-press min-h-[44px] shadow-sm shadow-emerald-500/25"
                  >
                    <BookOpenCheck className="w-4 h-4" />
                    Virtual Classroom
                  </button>
                  <button
                    type="button"
                    onClick={activateInteractiveMode}
                    className="px-4 py-2.5 glass-subcard glass-press text-xs font-semibold border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/12 min-h-[44px]"
                  >
                    Voice Guided Setup
                  </button>
                </>
              ) : (
                <>
                  {step === 7 && (
                    <>
                      <button
                        type="button"
                        onClick={() => void processUtterance(isPaused ? 'Resume' : 'Pause')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[42px]"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleWrapUpClassroom()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold glass-press min-h-[42px]"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Wrap-Up &amp; Quiz
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => void processUtterance('Interactive mode off')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 glass-subcard glass-press text-xs font-medium border-rose-500/35 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 min-h-[42px]"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Casual
                  </button>
                </>
              )}
            </div>

            {step > 0 && step < 7 && (
              <button
                type="button"
                onClick={() => launchActiveClassroom(subjectId, chapter, topicIndex, difficulty, teachingStyle)}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Or jump straight into {subject.name}: {chapter.title}
              </button>
            )}
          </div>
        );

        const qaPanelNode = (
          <div className={step === 7 ? 'holo-panel p-4 flex flex-col gap-3 min-h-[340px]' : 'holo-panel p-5 flex flex-col gap-4 min-h-[520px]'}>
          {step > 0 && (
            <div className="space-y-2 pb-3 border-b border-slate-200/70 dark:border-white/10 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={subjectId}
                  onChange={(e) => {
                    const id = e.target.value as SubjectId;
                    setSubjectId(id);
                    const sub = getSubjectById(id);
                    const nextCh = sub.chapters[0];
                    setChapterId(nextCh.id);
                    setTopicIndex(0);
                    if (step === 7) {
                      launchActiveClassroom(id, nextCh, 0, difficulty, teachingStyle);
                    }
                  }}
                  aria-label="Select subject"
                  className="px-2.5 py-2 glass-input text-xs"
                >
                  {CBSE_CLASS_12_CURRICULUM.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={chapter.id}
                  onChange={(e) => {
                    const nextCh = subject.chapters.find((c) => c.id === e.target.value) || subject.chapters[0];
                    setChapterId(nextCh.id);
                    setTopicIndex(0);
                    if (step === 7) {
                      launchActiveClassroom(subjectId, nextCh, 0, difficulty, teachingStyle);
                    }
                  }}
                  aria-label="Select chapter"
                  className="px-2.5 py-2 glass-input text-xs"
                >
                  {subject.chapters.map((c) => (
                    <option key={c.id} value={c.id}>Ch {c.number}: {c.title}</option>
                  ))}
                </select>

                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  aria-label="Select difficulty"
                  className="px-2.5 py-2 glass-input text-xs"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={teachingStyle}
                  onChange={(e) => setTeachingStyle(e.target.value as TeachingStyle)}
                  aria-label="Select teaching style"
                  className="px-2.5 py-2 glass-input text-xs"
                >
                  {STYLES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {step === 7 && chapter.topics.length > 0 && (
                <select
                  value={topicIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setTopicIndex(idx);
                    const tName = chapter.topics[idx];
                    setTopicsCovered((prev) => (prev.includes(tName) ? prev : [...prev, tName]));
                    const nextQ = `Let us focus on "${tName}". What key principle or formula comes to mind first?`;
                    setCurrentQuestion(nextQ);
                    setAttemptCount(0);
                    speakAndAppend(`Switching board focus to ${tName}. ${nextQ}`, {
                      provider: 'ARORA Virtual Classroom Core',
                      boardCues: buildSubjectLaunchCues(subjectId, chapter, tName, nextQ),
                    });
                  }}
                  aria-label="Select topic"
                  className="w-full px-2.5 py-2 glass-input text-xs"
                >
                  {chapter.topics.map((t, idx) => (
                    <option key={t} value={idx}>
                      Topic {idx + 1}: {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {statusError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/12 dark:bg-rose-950/35 border border-rose-400/35 holo-blur text-xs text-rose-700 dark:text-rose-200 flex flex-wrap items-center justify-between gap-2">
              <span className="flex-1 min-w-[200px]">{statusError}</span>
              {lastFailedUtterance && (
                <button
                  type="button"
                  onClick={() => {
                    const msg = lastFailedUtterance;
                    setLastFailedUtterance(null);
                    void processUtterance(msg);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold glass-press whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Dialogue Feed */}
          <div ref={dialogueScrollRef} className={`flex-1 space-y-3 overflow-y-auto pr-1 ${step === 7 ? 'max-h-[260px]' : 'max-h-[410px]'}`}>
            {visibleTurns.length === 0 ? (
              <div className="p-6 glass-subcard text-center space-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  Hi! ARORA AI Teacher is online and ready
                </p>
                <p>
                  Tap &ldquo;Live Chat&rdquo; for a real-time two-way voice conversation, type any Class 12 question below, or tap &ldquo;Interactive Mode On&rdquo; for guided teaching.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {hiddenTurnCount > 0 && (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => setTurnWindowSize((n) => n + 36)}
                      className="px-3.5 py-1.5 glass-subcard glass-press text-xs font-medium text-cyan-600 dark:text-cyan-300 hover:border-cyan-400/50"
                    >
                      Show earlier turns ({hiddenTurnCount} older in feed)
                    </button>
                  </div>
                )}
                {windowedTurns.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={animationComplexity === 'minimal' ? false : { opacity: 0, y: 8, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`p-4 text-xs sm:text-sm leading-relaxed ${
                      t.speaker === 'arora'
                        ? 'glass-subcard border-cyan-500/20 text-slate-800 dark:text-slate-100'
                        : 'rounded-2xl bg-sky-500/12 dark:bg-violet-500/16 border border-sky-400/30 holo-blur text-slate-900 dark:text-white ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                        {t.speaker === 'arora' ? 'ARORA AI' : 'You'}
                      </span>
                      {t.provider && <span>{t.provider}</span>}
                    </div>
                    <RichMessageRenderer content={t.text} msgId={t.id} />
                    {t.formula && (
                      <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/20 text-cyan-300 font-mono text-xs">
                        {t.formula}
                      </div>
                    )}
                    {t.diagram && (
                      <div className="mt-3">
                        <GeneratedDiagramCard
                          diagram={t.diagram}
                          compact
                          onRegenerate={() => void handleGenerateDiagramForTurn(t)}
                          isRegenerating={diagramLoadingTurnId === t.id}
                        />
                      </div>
                    )}
                    {t.sources && t.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap gap-2">
                        {t.sources.map((src) => (
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
                    {t.speaker === 'arora' && !t.diagram && !streamingCasualDraft && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleGenerateDiagramForTurn(t)}
                          disabled={diagramLoadingTurnId === t.id}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 disabled:opacity-55"
                        >
                          {diagramLoadingTurnId === t.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PenTool className="w-3.5 h-3.5" />
                          )}
                          {diagramLoadingTurnId === t.id ? 'Drawing Diagram...' : 'Draw Diagram'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {step === 7 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70 dark:border-white/10">
              {SPOKEN_COMMANDS.map((cmdLabel) => (
                <button
                  key={cmdLabel}
                  type="button"
                  onClick={() => void processUtterance(cmdLabel)}
                  className="px-3 py-1.5 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 hover:text-cyan-600 dark:hover:text-cyan-300"
                >
                  {cmdLabel}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = inputValue;
              if (!val.trim()) return;
              setInputValue('');
              void processUtterance(val);
            }}
            className="glass-input rounded-3xl p-2 flex items-end gap-2"
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setIncludeDiagramNext((v) => !v);
              }}
              aria-label="Include diagram with response"
              aria-pressed={includeDiagramNext}
              title="Generate a labelled vector diagram with ARORA's reply"
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
              ref={teacherTextareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  const val = inputValue;
                  if (!val.trim()) return;
                  setInputValue('');
                  void processUtterance(val);
                }
              }}
              placeholder={
                includeDiagramNext
                  ? 'Enter any topic to draw a labelled textbook diagram...'
                  : liveMode
                    ? 'Type or speak freely in two-way Live Mode...'
                    : step === 0
                      ? 'Chat naturally, ask for any diagram, or say "Interactive mode on"...'
                      : 'Speak or type your answer / diagram request / command...'
              }
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 px-2.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none max-h-[128px] leading-snug"
            />
            {canInterruptNow && (
              <button
                type="button"
                onClick={handleInterrupt}
                aria-label="Interrupt response"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-neutral-950/92 hover:bg-black text-white border border-rose-400/45 glass-press min-h-[44px] text-xs font-semibold shrink-0"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Interrupt</span>
              </button>
            )}
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-45 disabled:cursor-not-allowed text-white glass-press shadow-sm shadow-cyan-500/25 min-h-[44px] min-w-[44px] shrink-0"
              aria-label="Send response"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          </div>
        );

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {step === 7 ? (
              <>
                <div className="lg:col-span-8 space-y-4">
                  <DigitalTeachingBoard
                    subjectId={subjectId}
                    subjectName={subject.name}
                    chapterTitle={`Ch ${chapter.number}: ${chapter.title}`}
                    currentTopic={currentTopic}
                    boardTheme={boardTheme}
                    onChangeBoardTheme={(nextTheme) => {
                      setBoardThemePinned(true);
                      setBoardTheme(nextTheme);
                    }}
                    zoomPercent={boardZoom}
                    onChangeZoom={setBoardZoom}
                    blocks={boardBlocks}
                    activeBlockId={activeBoardBlockId}
                    isSpeakingSync={orbState === 'speaking'}
                    animationComplexity={animationComplexity}
                    onHighlightBlock={(id) =>
                      setBoardBlocks((prev) =>
                        prev.map((b) =>
                          b.id === id ? { ...b, isHighlighted: !b.isHighlighted } : b,
                        ),
                      )
                    }
                    onEraseBlock={(id) =>
                      setBoardBlocks((prev) => prev.filter((b) => b.id !== id))
                    }
                    onClearBoard={() => {
                      cancelBoardSyncTimers();
                      setBoardBlocks([]);
                      setActiveBoardBlockId(null);
                    }}
                    onAskAboutBlock={(blk) => {
                      if (orbState === 'speaking') handleInterrupt();
                      const promptText = `Explain or clarify "${blk.title || blk.kind}" from the board: ${blk.content.slice(0, 140)}`;
                      void processUtterance(promptText);
                    }}
                    onRequestDiagramOnBoard={(topicPrompt) =>
                      void requestBoardDiagram(topicPrompt)
                    }
                    isGeneratingDiagram={isBoardDiagramLoading}
                    onExportNotes={handleExportClassroomNotes}
                  />
                </div>
                <div className="lg:col-span-4 space-y-4">
                  {orbPanelNode}
                  {qaPanelNode}
                </div>
              </>
            ) : (
              <>
                <div className="lg:col-span-5 space-y-5">{orbPanelNode}</div>
                <div className="lg:col-span-7">{qaPanelNode}</div>
              </>
            )}
          </div>
        );
      })()}

      <AroraLiveChatModal
        isOpen={liveModalOpen}
        liveMode={liveMode}
        liveConnecting={liveConnecting}
        liveHoldPaused={liveHoldPaused}
        isListening={isListening}
        voiceOutputEnabled={voiceOutputEnabled}
        orbState={orbState}
        latencyMs={liveLatencyMs}
        statusError={statusError}
        language={language}
        onChangeLanguage={onChangeLanguage}
        voicePersona={voicePersona}
        onChangeVoicePersona={onChangeVoicePersona}
        contextSubtitle={
          step === 7
            ? `${subject.name} · Ch ${chapter.number}: ${currentTopic}`
            : step > 0
              ? `Classroom Setup Step ${step} of 6`
              : undefined
        }
        micAnalyser={liveAnalysers.micAnalyser}
        aiAnalyser={liveAnalysers.aiAnalyser}
        liveClientRef={liveClientRef}
        turns={turns.map((t) => ({ id: t.id, speaker: t.speaker, text: t.text }))}
        liveDrafts={liveDrafts}
        animationComplexity={animationComplexity}
        onToggleMic={toggleMic}
        onToggleHoldPause={toggleLiveHoldPause}
        onToggleVoiceOutput={() => {
          triggerHaptic('tap');
          setVoiceOutputEnabled((v) => !v);
        }}
        onInterrupt={handleInterrupt}
        onSendText={(msg) => void processUtterance(msg)}
        onRetryConnect={() => void activateLiveMode()}
        onClose={deactivateLiveMode}
      />

      <ClassroomWrapupModal
        isOpen={wrapupOpen}
        onClose={() => setWrapupOpen(false)}
        isLoading={wrapupLoading}
        subjectName={subject.name}
        chapterTitle={`Ch ${chapter.number}: ${chapter.title}`}
        topicsCovered={topicsCovered}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        lessonSummary={wrapupData.lessonSummary}
        revisionNotes={wrapupData.revisionNotes}
        assessment={wrapupData.assessment}
        onDownloadNotes={handleExportClassroomNotes}
      />
    </section>
  );
};
