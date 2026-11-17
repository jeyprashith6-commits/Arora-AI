import React, { Component, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AudioLines,
  BookOpen,
  Bot,
  ClipboardCheck,
  FileArchive,
  GraduationCap,
  HelpCircle,
  WifiOff,
  X,
} from 'lucide-react';
import { AroraBrandIcon } from './components/AroraBrandIcon';
import { AroraChatbot } from './components/AroraChatbot';
import { CurriculumHub } from './components/CurriculumHub';
import { GlassBackButton } from './components/GlassBackButton';
import { InteractiveTeacher } from './components/InteractiveTeacher';
import { MockTestCentre } from './components/MockTestCentre';
import { PyqAndGuidesZone } from './components/PyqAndGuidesZone';
import { QuestionBankView } from './components/QuestionBankView';
import { SystemConsole } from './components/SystemConsole';
import { INITIAL_ACADEMIC_YEARS } from './data/academicYears';
import { PAPER_GENERATION_GUIDES } from './data/pyqAndGuides';
import {
  areTelemetrySnapshotsEqual,
  clearTelemetryCache,
  collectDeviceTelemetry,
} from './engines/deviceOptimizer';
import { triggerHaptic, updateHapticPolicy } from './engines/hapticsEngine';
import {
  bulkSaveUserQuestions,
  deleteChatSession,
  deleteClassroomSession,
  getOrCreateStudentProfile,
  listChatSessions,
  listClassroomSessions,
  listMockAttempts,
  listQuestionProgress,
  listStoredAcademicYears,
  listUserQuestions,
  listVersionCheckpoints,
  saveAcademicYear,
  saveChatSession,
  saveClassroomSession,
  saveMockAttempt,
  saveQuestionProgress,
  saveStudentProfile,
  saveUserQuestion,
} from './engines/localDb';
import {
  releaseVoiceAudioResources,
  setAroraVoicePersona,
  speakAroraText,
  stopAroraSpeech,
  type GlobalVoiceNavigationIntent,
  type SmartVoiceAction,
} from './engines/voiceEngine';
import type {
  AcademicYearRecord,
  ChatbotMode,
  ChatSession,
  ClassroomSessionRecord,
  DeviceTelemetry,
  DifficultyLevel,
  MockTestAttempt,
  MockTestLaunchPreset,
  MockTestType,
  QuestionItem,
  QuestionPracticeProgress,
  RamProfileTier,
  ReferenceBookName,
  StudentProfile,
  SubjectId,
  VersionCheckpoint,
  VoicePersona,
} from './types/arora';

type ActiveWorkspace =
  | 'curriculum'
  | 'question_bank'
  | 'pyq_guides'
  | 'mock_tests'
  | 'interactive_teacher'
  | 'chatbot'
  | 'system';

class SafeErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 arora-canvas-bg text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full p-6 holo-panel-elevated border-rose-500/35 space-y-3">
            <h2 className="text-lg font-semibold text-rose-500 dark:text-rose-400">
              ARORA Safe Recovery Mode
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              A component error was intercepted without affecting your local student data: {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold glass-press"
            >
              Recover Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_TELEMETRY: DeviceTelemetry = {
  totalRamGb: 4,
  estimatedAvailableRamGb: 2.1,
  jsHeapUsedMb: null,
  jsHeapLimitMb: null,
  memoryPressure: 'moderate',
  cpuCores: 4,
  architecture: 'Universal',
  platform: 'Web',
  androidVersion: null,
  storageUsedMb: null,
  storageQuotaMb: null,
  batteryLevelPercent: null,
  batteryCharging: null,
  networkEffectiveType: '4g',
  networkDownlinkMbps: null,
  isOnline: true,
  operatingMode: 'online',
  activeProfile: 'eco_3_4gb',
  manualTierOverride: 'auto',
  localModelSpec: 'Quantized 0.5B INT4 Curriculum Index (On-Demand)',
  maxContextTurns: 4,
  maxCacheEntries: 16,
  animationComplexity: 'minimal',
  modelLoadedInMemory: true,
};

export default function App() {
  const [workspace, setWorkspace] = useState<ActiveWorkspace>('interactive_teacher');
  const [workspaceHistory, setWorkspaceHistory] = useState<ActiveWorkspace[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>(
    INITIAL_ACADEMIC_YEARS,
  );
  const [selectedYear, setSelectedYear] = useState<number>(2027);
  const [userQuestions, setUserQuestions] = useState<QuestionItem[]>([]);
  const [questionProgressMap, setQuestionProgressMap] = useState<
    Record<string, QuestionPracticeProgress>
  >({});
  const [mockAttempts, setMockAttempts] = useState<MockTestAttempt[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [classroomSessions, setClassroomSessions] = useState<ClassroomSessionRecord[]>([]);
  const [checkpoints, setCheckpoints] = useState<VersionCheckpoint[]>([]);

  const [telemetry, setTelemetry] = useState<DeviceTelemetry>(DEFAULT_TELEMETRY);
  const [ramOverride, setRamOverride] = useState<RamProfileTier | 'auto'>(() => {
    try {
      const saved = window.localStorage?.getItem('arora_ram_override');
      if (
        saved === 'auto' ||
        saved === 'eco_3_4gb' ||
        saved === 'balanced_6gb' ||
        saved === 'ultra_8gb_plus'
      ) {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
    return 'auto';
  });
  const [modelLoaded, setModelLoaded] = useState(true);
  const [serverReachable, setServerReachable] = useState(true);
  const [selectedPaperGuides, setSelectedPaperGuides] = useState<ReferenceBookName[]>(() =>
    PAPER_GENERATION_GUIDES.map((g) => g.id),
  );
  const [curriculumPresetSubjectId, setCurriculumPresetSubjectId] = useState<SubjectId | undefined>(undefined);
  const [pyqPresetSubjectId, setPyqPresetSubjectId] = useState<SubjectId | undefined>(undefined);
  const [questionBankPresetSubjectId, setQuestionBankPresetSubjectId] = useState<SubjectId | undefined>(undefined);
  const [mockPresetSubjectId, setMockPresetSubjectId] = useState<SubjectId | undefined>(undefined);
  const [mockPresetChapterId, setMockPresetChapterId] = useState<string | undefined>(undefined);
  const [mockPresetTopic, setMockPresetTopic] = useState<string | undefined>(undefined);
  const [mockPresetTestType, setMockPresetTestType] = useState<MockTestType | undefined>(undefined);
  const [mockPresetDifficulty, setMockPresetDifficulty] = useState<DifficultyLevel | 'Mixed' | undefined>(undefined);
  const [mockPresetPyqOnly, setMockPresetPyqOnly] = useState<boolean>(false);
  const [mockPresetMarks, setMockPresetMarks] = useState<20 | 30 | 40 | 70 | 80 | undefined>(undefined);
  const [mockAutoStartToken, setMockAutoStartToken] = useState<number>(0);
  const [externalChatSessionId, setExternalChatSessionId] = useState<string | null>(null);
  const [externalChatPrompt, setExternalChatPrompt] = useState<{
    id: string;
    text: string;
    modeOverride?: ChatbotMode;
  } | null>(null);
  const [externalLaunchLiveToken, setExternalLaunchLiveToken] = useState<number>(0);
  const [voiceExecutionToast, setVoiceExecutionToast] = useState<string | null>(null);

  const navigateToWorkspace = useCallback((next: ActiveWorkspace) => {
    setWorkspace((current) => {
      if (current === next) return current;
      setWorkspaceHistory((hist) => [...hist.slice(-14), current]);
      if (typeof window !== 'undefined' && window.history?.pushState) {
        try {
          window.history.pushState({ aroraWorkspace: next }, '');
        } catch {
          // Ignore pushState restrictions
        }
      }
      return next;
    });
  }, []);

  const handleBackWorkspace = useCallback(() => {
    setWorkspaceHistory((hist) => {
      if (hist.length > 0) {
        const previous = hist[hist.length - 1];
        setWorkspace(previous);
        return hist.slice(0, -1);
      }
      setWorkspace('interactive_teacher');
      return hist;
    });
  }, []);

  const loadAllLocalData = useCallback(async () => {
    const [prof, storedYears, uQuestions, qProgressList, attempts, chats, classrooms, cps] = await Promise.all([
      getOrCreateStudentProfile(),
      listStoredAcademicYears(),
      listUserQuestions(),
      listQuestionProgress(),
      listMockAttempts(),
      listChatSessions(),
      listClassroomSessions(),
      listVersionCheckpoints(),
    ]);

    setProfile(prof);
    setSelectedYear(prof.targetYear || 2027);
    if (storedYears.length > 0) {
      const mergedMap = new Map<number, AcademicYearRecord>();
      for (const y of INITIAL_ACADEMIC_YEARS) mergedMap.set(y.year, y);
      for (const y of storedYears) mergedMap.set(y.year, y);
      setAcademicYears(
        Array.from(mergedMap.values()).sort((a, b) => a.year - b.year),
      );
    }
    setUserQuestions(uQuestions);
    const progMap: Record<string, QuestionPracticeProgress> = {};
    for (const p of qProgressList) progMap[p.questionId] = p;
    setQuestionProgressMap(progMap);
    setMockAttempts(attempts);
    setChatSessions(chats);
    setClassroomSessions(classrooms);
    setCheckpoints(cps);
  }, []);

  useEffect(() => {
    void loadAllLocalData();
  }, [loadAllLocalData]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const theme = profile?.theme || 'dark';
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [profile?.theme]);

  // Sync voice persona & Always-Online telemetry heartbeat
  useEffect(() => {
    setAroraVoicePersona(profile?.voicePersona ?? 'Zephyr');
  }, [profile?.voicePersona]);

  // Sync browser/Android hardware Back button with workspace history
  useEffect(() => {
    const onPopState = () => {
      setWorkspaceHistory((hist) => {
        if (hist.length > 0) {
          const previous = hist[hist.length - 1];
          setWorkspace(previous);
          return hist.slice(0, -1);
        }
        return hist;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Auto-dismiss Smart Voice execution toast
  useEffect(() => {
    if (!voiceExecutionToast) return;
    const timer = window.setTimeout(() => {
      setVoiceExecutionToast(null);
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [voiceExecutionToast]);

  // Monitor Device Telemetry, Always-Online Keep-Alive & Server Reachability without redundant re-renders
  useEffect(() => {
    let active = true;
    const alwaysOnlinePreferred = profile?.alwaysOnline ?? true;
    const pollIntervalMs = ramOverride === 'eco_3_4gb' ? 25000 : 15000;

    const timedHealthFetch = async (): Promise<boolean> => {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 3500);
      try {
        const res = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-store',
          signal: ctrl.signal,
        });
        return res.ok;
      } finally {
        window.clearTimeout(timer);
      }
    };

    const probeHealth = async (): Promise<boolean> => {
      try {
        if (await timedHealthFetch()) return true;
      } catch {
        // Retry once quickly if Always-Online keep-alive is enabled
      }
      if (!alwaysOnlinePreferred || !active) return false;
      try {
        await new Promise((r) => setTimeout(r, 450));
        if (!active) return false;
        return await timedHealthFetch();
      } catch {
        return false;
      }
    };

    const refreshTelemetry = async (force = false) => {
      if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      const physicalOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const reachable = physicalOnline ? await probeHealth() : false;
      if (!active) return;
      const effectiveReachable = alwaysOnlinePreferred && physicalOnline ? true : reachable;
      setServerReachable((prev) => (prev === reachable ? prev : reachable));
      const next = await collectDeviceTelemetry(ramOverride, effectiveReachable, modelLoaded);
      if (active) {
        setTelemetry((prev) => (areTelemetrySnapshotsEqual(prev, next) ? prev : next));
      }
    };

    void refreshTelemetry(true);
    const interval = setInterval(() => void refreshTelemetry(false), pollIntervalMs);
    const onOnline = () => void refreshTelemetry(true);
    const onOffline = () => void refreshTelemetry(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshTelemetry(true);
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ramOverride, modelLoaded, profile?.alwaysOnline]);

  // Keep haptic policy synced with user preference, RAM tier, memory pressure, and battery
  useEffect(() => {
    updateHapticPolicy({
      hapticsEnabled: profile?.hapticsEnabled ?? true,
      activeProfile: telemetry.activeProfile,
      memoryPressure: telemetry.memoryPressure,
      batteryLevelPercent: telemetry.batteryLevelPercent,
      batteryCharging: telemetry.batteryCharging,
    });
  }, [
    profile?.hapticsEnabled,
    telemetry.activeProfile,
    telemetry.memoryPressure,
    telemetry.batteryLevelPercent,
    telemetry.batteryCharging,
  ]);

  const handleChangeRamOverride = useCallback((tier: RamProfileTier | 'auto') => {
    setRamOverride(tier);
    try {
      window.localStorage?.setItem('arora_ram_override', tier);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleFreeUnusedMemory = useCallback(() => {
    releaseVoiceAudioResources();
    clearTelemetryCache();
    setModelLoaded(false);
  }, []);

  const handleUpdateProfile = useCallback((next: StudentProfile) => {
    setProfile(next);
    void saveStudentProfile(next);
  }, []);

  const handleSelectYear = useCallback(
    (year: number) => {
      setSelectedYear(year);
      if (profile) {
        handleUpdateProfile({ ...profile, targetYear: year });
      }
    },
    [profile, handleUpdateProfile],
  );

  const handleAddFutureYear = useCallback((record: AcademicYearRecord) => {
    setAcademicYears((prev) =>
      [...prev.filter((y) => y.year !== record.year), record].sort(
        (a, b) => a.year - b.year,
      ),
    );
    void saveAcademicYear(record);
  }, []);

  const handleAddQuestion = useCallback((q: QuestionItem) => {
    setUserQuestions((prev) => [q, ...prev]);
    void saveUserQuestion(q);
  }, []);

  const handleBulkAddQuestions = useCallback(
    async (questions: QuestionItem[]): Promise<{ addedCount: number; skippedDuplicates: number }> => {
      const result = await bulkSaveUserQuestions(questions);
      if (result.added.length > 0) {
        setUserQuestions((prev) => [...result.added, ...prev]);
      }
      return { addedCount: result.added.length, skippedDuplicates: result.skippedDuplicates };
    },
    [],
  );

  const handleSaveQuestionProgress = useCallback((entry: QuestionPracticeProgress) => {
    setQuestionProgressMap((prev) => ({ ...prev, [entry.questionId]: entry }));
    void saveQuestionProgress(entry);
  }, []);

  const handleSaveMockAttempt = useCallback((attempt: MockTestAttempt) => {
    setMockAttempts((prev) => [attempt, ...prev]);
    void saveMockAttempt(attempt);
  }, []);

  const handleSaveChatSession = useCallback((session: ChatSession) => {
    setChatSessions((prev) => {
      const others = prev.filter((s) => s.id !== session.id);
      return [session, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    void saveChatSession(session);
  }, []);

  const handleDeleteChatSession = useCallback((id: string) => {
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    void deleteChatSession(id);
  }, []);

  const handleSaveClassroomSession = useCallback((session: ClassroomSessionRecord) => {
    setClassroomSessions((prev) => {
      const others = prev.filter((s) => s.id !== session.id);
      return [session, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    void saveClassroomSession(session);
  }, []);

  const handleDeleteClassroomSession = useCallback((id: string) => {
    setClassroomSessions((prev) => prev.filter((s) => s.id !== id));
    void deleteClassroomSession(id);
  }, []);

  const handleToggleTopicComplete = useCallback(
    (topicKey: string) => {
      setProfile((cur) => {
        if (!cur) return cur;
        const exists = cur.completedTopics.includes(topicKey);
        const nextTopics = exists
          ? cur.completedTopics.filter((t) => t !== topicKey)
          : [...cur.completedTopics, topicKey];
        const next = { ...cur, completedTopics: nextTopics };
        void saveStudentProfile(next);
        return next;
      });
    },
    [],
  );

  const handleMarkTopicCompleted = useCallback((topicKey: string) => {
    setProfile((cur) => {
      if (!cur || cur.completedTopics.includes(topicKey)) return cur;
      const next = {
        ...cur,
        completedTopics: [...cur.completedTopics, topicKey],
      };
      void saveStudentProfile(next);
      return next;
    });
  }, []);

  const handleTogglePaperGuide = useCallback((guide: ReferenceBookName) => {
    setSelectedPaperGuides((prev) => {
      if (prev.includes(guide)) {
        return prev.length > 1 ? prev.filter((g) => g !== guide) : prev;
      }
      return [...prev, guide];
    });
  }, []);

  const handleSelectAllPaperGuides = useCallback(() => {
    setSelectedPaperGuides(PAPER_GENERATION_GUIDES.map((g) => g.id));
  }, []);

  const handleLaunchMockPaper = useCallback(
    (opts: {
      subjectId: SubjectId;
      pyqOnly: boolean;
      allowedSources: ReferenceBookName[];
    }) => {
      setMockPresetSubjectId(opts.subjectId);
      setMockPresetChapterId(undefined);
      setMockPresetTopic(undefined);
      setMockPresetTestType(undefined);
      setMockPresetDifficulty(undefined);
      setMockPresetPyqOnly(opts.pyqOnly);
      if (!opts.pyqOnly && opts.allowedSources.length > 0) {
        setSelectedPaperGuides(opts.allowedSources);
      }
      navigateToWorkspace('mock_tests');
    },
    [navigateToWorkspace],
  );

  const handleLaunchMockFromQuestionBank = useCallback(
    (preset: MockTestLaunchPreset) => {
      setMockPresetSubjectId(preset.subjectId);
      setMockPresetChapterId(preset.chapterId);
      setMockPresetTopic(preset.topic);
      setMockPresetTestType(preset.testType);
      setMockPresetDifficulty(preset.difficulty);
      setMockPresetPyqOnly(Boolean(preset.pyqOnly));
      if (preset.totalMarks) setMockPresetMarks(preset.totalMarks);
      if (preset.allowedSources && preset.allowedSources.length > 0) {
        setSelectedPaperGuides(preset.allowedSources);
      }
      navigateToWorkspace('mock_tests');
    },
    [navigateToWorkspace],
  );

  const handleGlobalVoiceNavigate = useCallback(
    (intent: GlobalVoiceNavigationIntent) => {
      if (intent.target === 'curriculum') {
        if (intent.subjectId) setCurriculumPresetSubjectId(intent.subjectId);
        navigateToWorkspace('curriculum');
        return;
      }
      if (intent.target === 'pyq_guides') {
        if (intent.subjectId) setPyqPresetSubjectId(intent.subjectId);
        navigateToWorkspace('pyq_guides');
        return;
      }
      if (intent.target === 'question_bank') {
        if (intent.subjectId) setQuestionBankPresetSubjectId(intent.subjectId);
        navigateToWorkspace('question_bank');
        return;
      }
      if (intent.target === 'mock_tests') {
        if (intent.subjectId) setMockPresetSubjectId(intent.subjectId);
        setMockPresetPyqOnly(Boolean(intent.pyqOnly));
        setMockPresetMarks(intent.totalMarks);
        if (intent.autoStartMockTest) {
          setMockAutoStartToken((n) => n + 1);
        }
        navigateToWorkspace('mock_tests');
        return;
      }
      navigateToWorkspace(intent.target);
    },
    [navigateToWorkspace],
  );

  const executeSmartVoiceAction = useCallback(
    (action: SmartVoiceAction) => {
      triggerHaptic('submit');
      setVoiceExecutionToast(action.spokenConfirmation);

      const speakConfirmation = (langOverride?: StudentProfile['preferredLanguage']) => {
        if (action.kind === 'stop_speech' || action.kind === 'launch_live_chat') return;
        speakAroraText(
          action.spokenConfirmation,
          langOverride || profile?.preferredLanguage || 'indian_english',
          undefined,
          {
            preferNeural: false,
            voicePersona: profile?.voicePersona || 'Zephyr',
          },
        );
      };

      switch (action.kind) {
        case 'navigate':
          handleGlobalVoiceNavigate(action.intent);
          speakConfirmation();
          return;
        case 'draw_diagram':
          setExternalChatPrompt({
            id: `voice-diag-${Date.now()}`,
            text: `Draw a clean precision labelled diagram for: ${action.topic}. Also provide a concise board-ready explanation.`,
            modeOverride: 'Deep Explanation',
          });
          navigateToWorkspace('chatbot');
          speakConfirmation();
          return;
        case 'ask_arora':
          setExternalChatPrompt({
            id: `voice-ask-${Date.now()}`,
            text: action.query,
            modeOverride: action.modeOverride,
          });
          navigateToWorkspace('chatbot');
          speakConfirmation();
          return;
        case 'launch_live_chat':
          navigateToWorkspace('interactive_teacher');
          setExternalLaunchLiveToken((n) => n + 1);
          return;
        case 'set_theme':
          if (profile) {
            const next = { ...profile, theme: action.theme };
            setProfile(next);
            void saveStudentProfile(next);
          }
          speakConfirmation();
          return;
        case 'set_language':
          if (profile) {
            const next = { ...profile, preferredLanguage: action.language };
            setProfile(next);
            void saveStudentProfile(next);
          }
          speakConfirmation(action.language);
          return;
        case 'set_voice_persona':
          setAroraVoicePersona(action.persona);
          if (profile) {
            const next = { ...profile, voicePersona: action.persona };
            setProfile(next);
            void saveStudentProfile(next);
          }
          speakAroraText(
            action.spokenConfirmation,
            profile?.preferredLanguage || 'indian_english',
            undefined,
            { preferNeural: false, voicePersona: action.persona },
          );
          return;
        case 'history_back':
          handleBackWorkspace();
          speakConfirmation();
          return;
        case 'stop_speech':
          stopAroraSpeech();
          return;
      }
    },
    [handleBackWorkspace, handleGlobalVoiceNavigate, navigateToWorkspace, profile],
  );

  const navItems: { id: ActiveWorkspace; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'curriculum', label: 'Curriculum', shortLabel: 'Syllabus', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'pyq_guides', label: 'PYQs & Guides', shortLabel: 'PYQs', icon: <FileArchive className="w-4 h-4" /> },
    { id: 'question_bank', label: 'Question Bank', shortLabel: 'Questions', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'mock_tests', label: 'Mock Tests', shortLabel: 'Tests', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'interactive_teacher', label: 'AI Teacher', shortLabel: 'Teacher', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'chatbot', label: 'Arora Chat', shortLabel: 'Chat', icon: <Bot className="w-4 h-4" /> },
  ];

  const isEco = telemetry.activeProfile === 'eco_3_4gb';

  return (
    <SafeErrorBoundary>
      <div
        className={`min-h-screen flex flex-col bg-[#EBF1FA] text-slate-900 dark:bg-[#050814] dark:text-slate-100 arora-canvas-bg ${
          isEco ? 'ram-eco' : 'ram-standard'
        }`}
      >
        {/* Modern iOS Liquid Glass Top Bar */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-white/65 dark:border-white/[0.10] bg-white/65 dark:bg-[#080D1B]/62 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] holo-blur">
          {/* Zone 1: Brand */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              navigateToWorkspace('interactive_teacher');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-2xl glass-press"
          >
            <AroraBrandIcon size={32} />
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              ARORA AI
            </span>
          </button>

          {/* Zone 2: iOS Frosted Segmented Glass Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 p-1 rounded-2xl border border-white/70 dark:border-white/[0.12] bg-slate-200/45 dark:bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] holo-blur text-[13px] font-medium"
          >
            {navItems.map((item) => {
              const active = workspace === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    navigateToWorkspace(item.id);
                  }}
                  className={`relative px-3.5 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition-colors duration-200 ${
                    active
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={isEco ? undefined : 'desktop-nav-pill'}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-white/90 dark:bg-white/[0.16] border border-white/80 dark:border-white/[0.16] shadow-[0_2px_10px_-3px_rgba(14,165,233,0.22)]"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Always-Online Live Indicator + System & Profile Glass Action */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-subcard text-[11px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
              title="ARORA Cloud Connection Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetry.isOnline && serverReachable
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                    : telemetry.isOnline
                      ? 'bg-sky-500 animate-pulse'
                      : 'bg-amber-500'
                }`}
              />
              {telemetry.isOnline && serverReachable
                ? 'Always Online'
                : telemetry.isOnline
                  ? 'Live Reconnecting'
                  : 'Network Reconnecting'}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                navigateToWorkspace('system');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 glass-press min-h-[38px] border ${
                workspace === 'system'
                  ? 'bg-sky-600 text-white border-sky-400/60 shadow-[0_6px_20px_-6px_rgba(14,165,233,0.55)]'
                  : 'bg-white/70 dark:bg-white/[0.09] text-slate-900 dark:text-sky-200 border-white/80 dark:border-white/[0.14] hover:bg-white/90 dark:hover:bg-white/[0.15] shadow-xs'
              }`}
            >
              System & Profile
            </button>
          </div>
        </header>

        {/* Reconnecting / Weak-Network Frosted Banner */}
        {(!telemetry.isOnline || (!serverReachable && !(profile?.alwaysOnline ?? true)) || telemetry.operatingMode === 'weak_network' || telemetry.operatingMode === 'reconnecting') && (
          <div className="px-4 sm:px-6 py-2 bg-amber-500/12 holo-blur border-b border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              {telemetry.operatingMode === 'reconnecting'
                ? 'Connection Reconnecting — Local study progress & saved CBSE notes remain intact. Reconnecting to ARORA Cloud...'
                : 'Weak Network Guard — Using compressed streaming requests while staying online with ARORA Cloud.'}
            </span>
          </div>
        )}

        {/* Main Workspace Container with Smooth iOS View Transitions */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
          {(workspaceHistory.length > 0 || workspace !== 'interactive_teacher') && (
            <div className="mb-4 flex items-center justify-between gap-2">
              <GlassBackButton
                onClick={handleBackWorkspace}
                label={
                  workspaceHistory.length > 0
                    ? `Back to ${navItems.find((n) => n.id === workspaceHistory[workspaceHistory.length - 1])?.shortLabel || 'Previous'}`
                    : 'Back to AI Teacher'
                }
              />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={workspace}
              initial={isEco ? false : { opacity: 0, y: 8, scale: 0.994 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isEco ? undefined : { opacity: 0, y: -6, scale: 0.996 }}
              transition={
                isEco
                  ? { duration: 0.01 }
                  : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
              }
            >
              {workspace === 'curriculum' && (
                <CurriculumHub
                  academicYears={academicYears}
                  selectedYear={selectedYear}
                  onSelectYear={handleSelectYear}
                  onAddFutureYear={handleAddFutureYear}
                  onAddUserQuestion={handleAddQuestion}
                  completedTopics={profile?.completedTopics || []}
                  onToggleTopicComplete={handleToggleTopicComplete}
                  language={profile?.preferredLanguage || 'indian_english'}
                  presetSubjectId={curriculumPresetSubjectId}
                />
              )}

              {workspace === 'pyq_guides' && (
                <PyqAndGuidesZone
                  selectedYear={selectedYear}
                  userQuestions={userQuestions}
                  selectedPaperGuides={selectedPaperGuides}
                  onTogglePaperGuide={handleTogglePaperGuide}
                  onSelectAllPaperGuides={handleSelectAllPaperGuides}
                  onLaunchMockPaper={handleLaunchMockPaper}
                  presetSubjectId={pyqPresetSubjectId}
                />
              )}

              {workspace === 'question_bank' && (
                <QuestionBankView
                  selectedYear={selectedYear}
                  academicYearRecord={academicYears.find((y) => y.year === selectedYear)}
                  userQuestions={userQuestions}
                  questionProgressMap={questionProgressMap}
                  onAddGeneratedQuestion={handleAddQuestion}
                  onBulkAddQuestions={handleBulkAddQuestions}
                  onSaveQuestionProgress={handleSaveQuestionProgress}
                  onLaunchMockTest={handleLaunchMockFromQuestionBank}
                  operatingMode={telemetry.operatingMode}
                  language={profile?.preferredLanguage || 'indian_english'}
                  presetSubjectId={questionBankPresetSubjectId}
                />
              )}

              {workspace === 'mock_tests' && (
                <MockTestCentre
                  selectedYear={selectedYear}
                  userQuestions={userQuestions}
                  attempts={mockAttempts}
                  onSaveAttempt={handleSaveMockAttempt}
                  selectedPaperGuides={selectedPaperGuides}
                  onTogglePaperGuide={handleTogglePaperGuide}
                  onSelectAllPaperGuides={handleSelectAllPaperGuides}
                  presetSubjectId={mockPresetSubjectId}
                  presetChapterId={mockPresetChapterId}
                  presetTopic={mockPresetTopic}
                  presetTestType={mockPresetTestType}
                  presetDifficulty={mockPresetDifficulty}
                  presetPyqOnly={mockPresetPyqOnly}
                  presetMarks={mockPresetMarks}
                  autoStartToken={mockAutoStartToken}
                />
              )}

              {workspace === 'interactive_teacher' && (
                <InteractiveTeacher
                  appTheme={profile?.theme || 'dark'}
                  language={profile?.preferredLanguage || 'indian_english'}
                  onChangeLanguage={(lang) => {
                    if (profile) handleUpdateProfile({ ...profile, preferredLanguage: lang });
                  }}
                  voicePersona={profile?.voicePersona || 'Zephyr'}
                  onChangeVoicePersona={(vp: VoicePersona) => {
                    setAroraVoicePersona(vp);
                    if (profile) handleUpdateProfile({ ...profile, voicePersona: vp });
                  }}
                  alwaysOnline={profile?.alwaysOnline ?? true}
                  operatingMode={telemetry.operatingMode}
                  animationComplexity={telemetry.animationComplexity}
                  ramSpec={telemetry.localModelSpec}
                  onMarkTopicCompleted={handleMarkTopicCompleted}
                  liveChatSessions={chatSessions.filter((s) => s.sessionType === 'live_voice')}
                  onSaveLiveSession={handleSaveChatSession}
                  classroomSessions={classroomSessions}
                  onSaveClassroomSession={handleSaveClassroomSession}
                  onDeleteClassroomSession={handleDeleteClassroomSession}
                  onOpenArchivedChatSession={(sessionId) => {
                    setExternalChatSessionId(sessionId);
                    navigateToWorkspace('chatbot');
                  }}
                  onNavigateByVoice={handleGlobalVoiceNavigate}
                  onExecuteSmartVoice={executeSmartVoiceAction}
                  externalLaunchLiveToken={externalLaunchLiveToken}
                />
              )}

              {workspace === 'chatbot' && (
                <AroraChatbot
                  sessions={chatSessions}
                  onSaveSession={handleSaveChatSession}
                  onDeleteSession={handleDeleteChatSession}
                  language={profile?.preferredLanguage || 'indian_english'}
                  onChangeLanguage={(lang) => {
                    if (profile) handleUpdateProfile({ ...profile, preferredLanguage: lang });
                  }}
                  telemetry={telemetry}
                  memoryEnabled={profile?.memoryEnabled ?? true}
                  onToggleMemory={(val) => {
                    if (profile) handleUpdateProfile({ ...profile, memoryEnabled: val });
                  }}
                  externalSelectedSessionId={externalChatSessionId}
                  onConsumedExternalSession={() => setExternalChatSessionId(null)}
                  externalPromptRequest={externalChatPrompt}
                  onConsumedExternalPrompt={() => setExternalChatPrompt(null)}
                />
              )}

              {workspace === 'system' && profile && (
                <SystemConsole
                  profile={profile}
                  onUpdateProfile={handleUpdateProfile}
                  telemetry={telemetry}
                  onChangeRamOverride={handleChangeRamOverride}
                  onToggleModelLoaded={() => setModelLoaded((m) => !m)}
                  onFreeUnusedMemory={handleFreeUnusedMemory}
                  checkpoints={checkpoints}
                  onAddCheckpoint={(cp) => setCheckpoints((prev) => [cp, ...prev])}
                  onRefreshData={loadAllLocalData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating iOS Frosted Glass Bottom Dock (Mobile) */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-2.5 left-3 right-3 z-40 px-1.5 py-1 pb-safe rounded-[26px] bg-white/75 dark:bg-[#0B1222]/78 border border-white/75 dark:border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_38px_-10px_rgba(15,23,42,0.45)] holo-blur grid grid-cols-6 items-center"
        >
          {navItems.map((item) => {
            const active = workspace === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  navigateToWorkspace(item.id);
                }}
                className={`relative flex flex-col items-center justify-center min-h-[44px] rounded-2xl text-[10px] font-medium transition-colors duration-200 ${
                  active
                    ? 'text-sky-600 dark:text-sky-300 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={isEco ? undefined : 'mobile-dock-pill'}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0.5 rounded-2xl bg-sky-500/12 dark:bg-white/[0.12] border border-sky-400/25 dark:border-white/[0.12]"
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10 mt-0.5 truncate max-w-[54px]">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
        {/* Smart Voice Command Execution Toast */}
        <AnimatePresence>
          {voiceExecutionToast && (
            <motion.div
              key="voice-toast"
              initial={isEco ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isEco ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-20 md:bottom-6 right-4 z-40 max-w-sm holo-panel-elevated px-4 py-3 flex items-center gap-3 shadow-[0_18px_45px_-12px_rgba(14,165,233,0.42)]"
            >
              <AudioLines className="w-4 h-4 text-cyan-500 shrink-0" />
              <p className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug flex-1">
                {voiceExecutionToast}
              </p>
              <button
                type="button"
                onClick={() => setVoiceExecutionToast(null)}
                aria-label="Dismiss voice notification"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </SafeErrorBoundary>
  );
}
