import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Play, RotateCcw, XCircle } from 'lucide-react';
import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from '../data/curriculum';
import { buildMockTestQuestions } from '../data/questionBank';
import { PAPER_GENERATION_GUIDES } from '../data/pyqAndGuides';
import { triggerHaptic } from '../engines/hapticsEngine';
import type {
  DifficultyLevel,
  MockTestAttempt,
  MockTestConfig,
  MockTestType,
  QuestionItem,
  ReferenceBookName,
  SubjectId,
} from '../types/arora';
import { GlassBackButton } from './GlassBackButton';

interface MockTestCentreProps {
  selectedYear: number;
  userQuestions: QuestionItem[];
  attempts: MockTestAttempt[];
  onSaveAttempt: (attempt: MockTestAttempt) => void;
  selectedPaperGuides: ReferenceBookName[];
  onTogglePaperGuide: (guide: ReferenceBookName) => void;
  onSelectAllPaperGuides: () => void;
  presetSubjectId?: SubjectId;
  presetChapterId?: string;
  presetTopic?: string;
  presetTestType?: MockTestType;
  presetDifficulty?: DifficultyLevel | 'Mixed';
  presetPyqOnly?: boolean;
  presetMarks?: 20 | 30 | 40 | 70 | 80;
  autoStartToken?: number;
}

const TEST_TYPES: MockTestType[] = [
  'Full Syllabus',
  'Chapter-wise',
  'Topic-wise',
  'Unit Test',
  'Half-Yearly',
  'Pre-Board',
  'Board-Pattern',
  'Competency-Based',
  'Custom Examination',
];

const MARK_OPTIONS: (20 | 30 | 40 | 70 | 80)[] = [20, 30, 40, 70, 80];

export const MockTestCentre: React.FC<MockTestCentreProps> = ({
  selectedYear,
  userQuestions,
  attempts,
  onSaveAttempt,
  selectedPaperGuides,
  onTogglePaperGuide,
  onSelectAllPaperGuides,
  presetSubjectId,
  presetChapterId,
  presetTopic,
  presetTestType,
  presetDifficulty,
  presetPyqOnly = false,
  presetMarks,
  autoStartToken = 0,
}) => {
  const [testType, setTestType] = useState<MockTestType>(presetTestType || 'Board-Pattern');
  const [subjectId, setSubjectId] = useState<SubjectId>(presetSubjectId || 'physics');
  const [chapterId, setChapterId] = useState<string>(presetChapterId || '');
  const [topicFilter, setTopicFilter] = useState<string>(presetTopic || '');
  const [totalMarks, setTotalMarks] = useState<20 | 30 | 40 | 70 | 80>(presetMarks || 40);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'Mixed'>(presetDifficulty || 'Mixed');
  const [pyqOnlyMode, setPyqOnlyMode] = useState<boolean>(presetPyqOnly);

  // Active exam state
  const [activeConfig, setActiveConfig] = useState<MockTestConfig | null>(null);
  const [examQuestions, setExamQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startedAt, setStartedAt] = useState('');
  const [latestResult, setLatestResult] = useState<MockTestAttempt | null>(null);
  const lastHandledAutoStartRef = React.useRef(0);

  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);

  useEffect(() => {
    if (presetSubjectId) {
      setSubjectId(presetSubjectId);
      setChapterId(presetChapterId || '');
    }
  }, [presetSubjectId, presetChapterId]);

  useEffect(() => {
    if (presetTopic !== undefined) {
      setTopicFilter(presetTopic);
    }
  }, [presetTopic]);

  useEffect(() => {
    if (presetTestType) {
      setTestType(presetTestType);
    }
  }, [presetTestType]);

  useEffect(() => {
    if (presetDifficulty) {
      setDifficulty(presetDifficulty);
    }
  }, [presetDifficulty]);

  useEffect(() => {
    if (presetMarks) {
      setTotalMarks(presetMarks);
    }
  }, [presetMarks]);

  useEffect(() => {
    setPyqOnlyMode(presetPyqOnly);
  }, [presetPyqOnly]);

  useEffect(() => {
    if (!autoStartToken || autoStartToken === lastHandledAutoStartRef.current) return;
    lastHandledAutoStartRef.current = autoStartToken;

    const targetSubjectId = presetSubjectId || subjectId;
    const targetSubject = getSubjectById(targetSubjectId);
    const targetTestType = presetTestType || testType;
    const targetDifficulty = presetDifficulty || difficulty;
    const targetChapterId =
      presetChapterId ||
      (targetTestType === 'Chapter-wise' || targetTestType === 'Topic-wise'
        ? chapterId || targetSubject.chapters[0]?.id
        : undefined);
    const targetTopic =
      presetTopic !== undefined ? presetTopic || undefined : topicFilter || undefined;
    const targetMarks = presetMarks || totalMarks;
    const durationMinutes =
      targetMarks === 20 ? 35 : targetMarks === 30 ? 55 : targetMarks === 40 ? 75 : 180;

    const config: MockTestConfig = {
      id: `mock-${Date.now()}`,
      title: `${targetSubject.name} ${presetPyqOnly ? 'Last 6-Yr PYQ' : targetTestType} (${targetMarks} Marks)`,
      testType: targetTestType,
      academicYear: selectedYear,
      subjectId: targetSubjectId,
      chapterId:
        targetTestType === 'Chapter-wise' || targetTestType === 'Topic-wise'
          ? targetChapterId
          : undefined,
      topic: targetTestType === 'Topic-wise' ? targetTopic : undefined,
      totalMarks: targetMarks,
      durationMinutes,
      difficulty: targetDifficulty,
      pyqOnly: presetPyqOnly,
      allowedSources: presetPyqOnly ? ['CBSE Official'] : selectedPaperGuides,
    };

    const questions = buildMockTestQuestions(config, userQuestions);
    triggerHaptic('submit');
    setActiveConfig(config);
    setExamQuestions(questions);
    setCurrentIndex(0);
    setAnswers({});
    setSecondsLeft(durationMinutes * 60);
    setStartedAt(new Date().toISOString());
    setLatestResult(null);
  }, [
    autoStartToken,
    presetSubjectId,
    presetChapterId,
    presetTopic,
    presetTestType,
    presetDifficulty,
    presetPyqOnly,
    presetMarks,
    subjectId,
    chapterId,
    topicFilter,
    totalMarks,
    testType,
    selectedYear,
    difficulty,
    selectedPaperGuides,
    userQuestions,
  ]);

  useEffect(() => {
    if (!activeConfig || latestResult) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeConfig, latestResult]);

  const startMockTest = () => {
    const durationMinutes =
      totalMarks === 20 ? 35 : totalMarks === 30 ? 55 : totalMarks === 40 ? 75 : totalMarks === 70 ? 180 : 180;

    const config: MockTestConfig = {
      id: `mock-${Date.now()}`,
      title: `${subject.name} ${pyqOnlyMode ? 'Last 6-Yr PYQ' : testType} (${totalMarks} Marks)`,
      testType,
      academicYear: selectedYear,
      subjectId,
      chapterId:
        testType === 'Chapter-wise' || testType === 'Topic-wise'
          ? chapterId || subject.chapters[0].id
          : undefined,
      topic: testType === 'Topic-wise' ? topicFilter || undefined : undefined,
      totalMarks,
      durationMinutes,
      difficulty,
      pyqOnly: pyqOnlyMode,
      allowedSources: pyqOnlyMode ? ['CBSE Official'] : selectedPaperGuides,
    };

    const questions = buildMockTestQuestions(config, userQuestions);
    triggerHaptic('submit');
    setActiveConfig(config);
    setExamQuestions(questions);
    setCurrentIndex(0);
    setAnswers({});
    setSecondsLeft(durationMinutes * 60);
    setStartedAt(new Date().toISOString());
    setLatestResult(null);
  };

  const evaluateTest = () => {
    if (!activeConfig) return;
    triggerHaptic('success');
    let scoredMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const chapterPerf: Record<string, { earned: number; possible: number }> = {};

    const questionResults = examQuestions.map((q) => {
      const studentAnswer = (answers[q.id] || '').trim();
      let isCorrect = false;
      let awardedMarks = 0;

      if (!studentAnswer) {
        unansweredCount++;
      } else if (q.type === 'MSQ' && q.options && q.correctOptionIndices && q.correctOptionIndices.length > 0) {
        const expected = [...new Set(q.correctOptionIndices)].sort((a, b) => a - b).join(',');
        const chosenIndices = studentAnswer
          .split('||')
          .map((s) => q.options!.indexOf(s))
          .filter((idx) => idx >= 0)
          .sort((a, b) => a - b)
          .join(',');
        isCorrect = chosenIndices === expected;
        awardedMarks = isCorrect ? q.marks : 0;
      } else if (q.options && typeof q.correctOptionIndex === 'number') {
        const expected = q.options[q.correctOptionIndex];
        isCorrect = studentAnswer === expected;
        awardedMarks = isCorrect ? q.marks : 0;
      } else {
        // Subjective/numerical keyword & value-point evaluator
        const keyTerms = q.correctAnswer
          .toLowerCase()
          .replace(/[^a-z0-9.\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2);
        const ansLower = studentAnswer.toLowerCase();
        const hits = keyTerms.filter((t) => ansLower.includes(t)).length;
        const ratio = keyTerms.length > 0 ? hits / Math.min(4, keyTerms.length) : 0.5;
        if (ratio >= 0.5 || studentAnswer.length >= 35) {
          isCorrect = true;
          awardedMarks = ratio >= 0.75 ? q.marks : Math.max(1, Math.round(q.marks * 0.7));
        } else if (studentAnswer.length >= 12) {
          awardedMarks = Math.max(1, Math.floor(q.marks * 0.4));
        }
      }

      if (studentAnswer) {
        if (isCorrect) correctCount++;
        else incorrectCount++;
      }

      scoredMarks += awardedMarks;
      if (!chapterPerf[q.chapterTitle]) {
        chapterPerf[q.chapterTitle] = { earned: 0, possible: 0 };
      }
      chapterPerf[q.chapterTitle].earned += awardedMarks;
      chapterPerf[q.chapterTitle].possible += q.marks;

      return {
        questionId: q.id,
        questionText: q.questionText,
        chapterTitle: q.chapterTitle,
        marks: q.marks,
        awardedMarks,
        studentAnswer: studentAnswer || 'Not Attempted',
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const strongChapters: string[] = [];
    const weakChapters: string[] = [];
    for (const [chTitle, stats] of Object.entries(chapterPerf)) {
      const pct = stats.possible > 0 ? (stats.earned / stats.possible) * 100 : 0;
      if (pct >= 70) strongChapters.push(chTitle);
      else weakChapters.push(chTitle);
    }

    const totalPossible = examQuestions.reduce((acc, q) => acc + q.marks, 0);
    const percentage = totalPossible > 0 ? Math.round((scoredMarks / totalPossible) * 1000) / 10 : 0;

    const revisionRecommendations =
      weakChapters.length > 0
        ? weakChapters.map(
            (ch) => `Revisit NCERT derivations, solved examples & 3-mark numericals in "${ch}".`,
          )
        : ['Excellent accuracy across tested chapters! Challenge yourself with Expert HOTS or 80-mark Pre-Board papers.'];

    const attempt: MockTestAttempt = {
      id: `attempt-${Date.now()}`,
      config: activeConfig,
      startedAt,
      completedAt: new Date().toISOString(),
      totalMarks: totalPossible,
      scoredMarks,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      strongChapters,
      weakChapters,
      revisionRecommendations,
      questionResults,
    };

    onSaveAttempt(attempt);
    setLatestResult(attempt);
  };

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const rem = sec % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
          CBSE Session {selectedYear} Pattern · Automated Marking & Weak-Chapter Diagnostics
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Mock Test & Examination Centre
        </h1>
      </div>

      {/* CONFIGURATION SCREEN */}
      {!activeConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 holo-panel p-5 sm:p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Configure Examination Paper
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                Examination Mode
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as MockTestType)}
                  className="px-3 py-2.5 glass-input text-xs"
                >
                  {TEST_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                Subject
                <select
                  value={subjectId}
                  onChange={(e) => {
                    const nextId = e.target.value as SubjectId;
                    setSubjectId(nextId);
                    setChapterId(getSubjectById(nextId).chapters[0].id);
                  }}
                  className="px-3 py-2.5 glass-input text-xs"
                >
                  {CBSE_CLASS_12_CURRICULUM.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.theoryMarks}M Board)</option>
                  ))}
                </select>
              </label>

              {(testType === 'Chapter-wise' || testType === 'Topic-wise') && (
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Chapter
                  <select
                    value={chapterId || subject.chapters[0].id}
                    onChange={(e) => setChapterId(e.target.value)}
                    className="px-3 py-2.5 glass-input text-xs"
                  >
                    {subject.chapters.map((c) => (
                      <option key={c.id} value={c.id}>Ch {c.number}: {c.title}</option>
                    ))}
                  </select>
                </label>
              )}

              {testType === 'Topic-wise' && (
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Focus Topic (Optional)
                  <input
                    type="text"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    placeholder="e.g., Gauss Law or Nernst"
                    className="px-3 py-2.5 glass-input text-xs"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                Difficulty Profile
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel | 'Mixed')}
                  className="px-3 py-2.5 glass-input text-xs"
                >
                  <option value="Mixed">Mixed Board Standard</option>
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>
              </label>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Marks Configuration (20 / 30 / 40 / 70 / 80 Marks)
              </div>
              <div className="flex flex-wrap gap-2">
                {MARK_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setTotalMarks(m);
                    }}
                    className={`px-4 py-2 rounded-2xl text-xs font-semibold tabular-nums glass-press min-h-[40px] border ${
                      totalMarks === m
                        ? 'bg-sky-600 text-white border-sky-400/60 shadow-[0_6px_18px_-6px_rgba(14,165,233,0.55)]'
                        : 'glass-subcard text-slate-700 dark:text-slate-300 hover:border-sky-400/40'
                    }`}
                  >
                    {m} Marks
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Guides &amp; PYQ Sources Used for Paper Generation
                </span>
                <div className="apple-segmented">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setPyqOnlyMode(false);
                      onSelectAllPaperGuides();
                    }}
                    className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                      !pyqOnlyMode
                        ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All Guides + 6-Yr PYQs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setPyqOnlyMode(true);
                    }}
                    className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                      pyqOnlyMode
                        ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Last 6 Years PYQs Only
                  </button>
                </div>
              </div>

              {!pyqOnlyMode && (
                <div className="flex flex-wrap gap-1.5">
                  {PAPER_GENERATION_GUIDES.map((guide) => {
                    const active = selectedPaperGuides.includes(guide.id);
                    return (
                      <button
                        key={guide.id}
                        type="button"
                        role="checkbox"
                        aria-checked={active}
                        onClick={() => {
                          triggerHaptic('checkbox');
                          onTogglePaperGuide(guide.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-colors min-h-[34px] ${
                          active
                            ? 'bg-sky-600/12 dark:bg-sky-500/20 border-sky-500/50 text-sky-700 dark:text-sky-300'
                            : 'bg-slate-100/70 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {guide.id}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={startMockTest}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-[0_8px_24px_-8px_rgba(14,165,233,0.55)] glass-press min-h-[46px]"
            >
              <Play className="w-4 h-4" />
              Start {totalMarks}-Mark Examination
            </button>
          </div>

          {/* Past Attempts History */}
          <div className="lg:col-span-5 holo-panel p-5 space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Mock Test Evaluations
            </h2>
            {attempts.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No examinations submitted yet. Launch any 20–80 mark test to track strong and weak chapters in your study profile.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {attempts.slice(0, 8).map((att) => (
                  <div key={att.id} className="p-3.5 glass-subcard space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {att.config.title}
                      </span>
                      <span className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
                        {att.scoredMarks}/{att.totalMarks} ({att.percentage}%)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      Correct {att.correctCount} · Incorrect {att.incorrectCount} · {new Date(att.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE EXAM RUNNER */}
      {activeConfig && !latestResult && examQuestions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 holo-panel p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <GlassBackButton
                  label="Back to Setup"
                  onClick={() => {
                    setActiveConfig(null);
                    setExamQuestions([]);
                  }}
                />
                <div>
                  <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    {activeConfig.title} · Session {activeConfig.academicYear}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    Question {currentIndex + 1} of {examQuestions.length} ({examQuestions[currentIndex].marks} Marks · {examQuestions[currentIndex].type})
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-subcard font-mono text-xs font-semibold text-slate-800 dark:text-sky-300 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {formatTimer(secondsLeft)}
              </div>
            </div>

            {(() => {
              const q = examQuestions[currentIndex];
              const currentAns = answers[q.id] || '';
              return (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {q.chapterTitle} · {q.topic} ·{' '}
                    <span className="font-medium text-sky-600 dark:text-sky-400">
                      {q.isPreviousYear && q.pyqYear ? `CBSE PYQ ${q.pyqYear}` : `${q.sourceBook} (${q.sourceCategory})`}
                    </span>
                  </div>
                  <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                    {q.questionText}
                  </p>
                  {q.assertionText && q.reasonText && (
                    <div className="p-3 glass-subcard text-xs sm:text-sm space-y-1 text-slate-700 dark:text-slate-200">
                      <p>{q.assertionText}</p>
                      <p>{q.reasonText}</p>
                    </div>
                  )}

                  {q.options && q.options.length > 0 ? (
                    <div className="space-y-2.5">
                      {q.options.map((opt, idx) => {
                        const isMsq = q.type === 'MSQ';
                        const selectedList = isMsq ? currentAns.split('||').filter(Boolean) : [];
                        const chosen = isMsq ? selectedList.includes(opt) : currentAns === opt;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              if (isMsq) {
                                const next = chosen
                                  ? selectedList.filter((item) => item !== opt)
                                  : [...selectedList, opt];
                                setAnswers((prev) => ({ ...prev, [q.id]: next.join('||') }));
                              } else {
                                setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                              }
                            }}
                            className={`w-full text-left p-3.5 rounded-2xl border text-sm glass-press min-h-[46px] ${
                              chosen
                                ? 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-400/60 text-slate-900 dark:text-white font-medium'
                                : 'glass-subcard text-slate-700 dark:text-slate-200 hover:border-sky-400/40'
                            }`}
                          >
                            <span className="font-mono text-sky-600 dark:text-sky-400 mr-2">
                              {isMsq ? (chosen ? '[✓]' : '[ ]') : `(${String.fromCharCode(65 + idx)})`}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      rows={5}
                      value={currentAns}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Write your step-by-step answer, formula, or final numerical value here..."
                      className="w-full p-3.5 glass-input text-sm text-slate-900 dark:text-slate-100"
                    />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900/10 dark:border-white/10">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      className="px-4 py-2 rounded-2xl text-xs font-medium glass-subcard disabled:opacity-40 glass-press min-h-[40px]"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {currentIndex < examQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentIndex((i) => i + 1)}
                          className="px-4 py-2 rounded-2xl text-xs font-semibold bg-slate-900 dark:bg-white/15 text-white glass-press min-h-[40px]"
                        >
                          Next Question
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={evaluateTest}
                        className="px-5 py-2 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white glass-press min-h-[40px]"
                      >
                        Submit & Evaluate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Question Palette */}
          <aside className="lg:col-span-4 holo-panel p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Question Palette
            </h3>
            <div className="grid grid-cols-5 gap-2 tabular-nums">
              {examQuestions.map((q, idx) => {
                const answered = Boolean(answers[q.id]?.trim());
                const active = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-semibold border glass-press ${
                      active
                        ? 'border-sky-400 bg-sky-500/20 text-sky-700 dark:text-sky-300'
                        : answered
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'glass-subcard text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveConfig(null);
                setExamQuestions([]);
              }}
              className="w-full py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
            >
              Cancel Examination
            </button>
          </aside>
        </div>
      )}

      {/* EVALUATION REPORT */}
      {latestResult && (
        <div className="space-y-5">
          <div className="holo-panel p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-cyan-500 shrink-0" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Evaluation Complete: {latestResult.config.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated CBSE evaluation saved to your local student profile
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <GlassBackButton
                  label="Back to Setup"
                  onClick={() => {
                    setActiveConfig(null);
                    setLatestResult(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setActiveConfig(null);
                    setLatestResult(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 text-white min-h-[40px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Mock Test
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-4 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
                <div className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {latestResult.scoredMarks} / {latestResult.totalMarks}
                </div>
              </div>
              <div className="p-4 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Percentage</div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {latestResult.percentage}%
                </div>
              </div>
              <div className="p-4 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
                <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {latestResult.correctCount}
                </div>
              </div>
              <div className="p-4 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect / Skipped</div>
                <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {latestResult.incorrectCount + latestResult.unansweredCount}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-400/35 dark:border-emerald-500/25 holo-blur">
                <div className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">
                  Strong Chapters
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  {latestResult.strongChapters.length > 0
                    ? latestResult.strongChapters.join(' · ')
                    : 'Keep practicing to build >70% chapter mastery.'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-400/35 dark:border-amber-500/25 holo-blur">
                <div className="font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
                  Weak Chapters & Revision Recommendations
                </div>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  {latestResult.revisionRecommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Detailed Question Review */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Question-by-Question Answer Key & Explanations
              </h3>
              {latestResult.questionResults.map((res, idx) => (
                <div key={res.questionId} className="p-4 glass-subcard space-y-1.5 text-xs sm:text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">
                      Q{idx + 1}. {res.questionText}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs shrink-0 tabular-nums">
                      {res.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                      {res.awardedMarks}/{res.marks}M
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Your Answer: <span className="text-slate-800 dark:text-slate-200">{res.studentAnswer}</span>
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">
                    Verified Answer: {res.correctAnswer}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{res.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
