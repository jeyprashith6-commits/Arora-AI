import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Database,
  Download,
  FileUp,
  Filter,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from '../data/curriculum';
import { getAllQuestions } from '../data/questionBank';
import { triggerHaptic } from '../engines/hapticsEngine';
import {
  exportFullBackupJson,
  saveOfflineQuestionPack,
} from '../engines/localDb';
import {
  buildQuestionBankAuditReport,
  computeQuestionContentHash,
  detectSparseChapters,
  evaluatePracticeResponseLocal,
  filterAndSortQuestions,
  getDisplaySourceCategory,
  paginateQuestions,
  parseUploadedStudyQuestions,
  type ChapterCoverageGap,
  type LocalPracticeEvaluation,
} from '../engines/questionBankEngine';
import type {
  AcademicYearRecord,
  DifficultyLevel,
  LanguageMode,
  MockTestLaunchPreset,
  NetworkOperatingMode,
  ProvenanceDisplayLabel,
  QuestionBankSortOption,
  QuestionItem,
  QuestionPracticeProgress,
  QuestionType,
  ReferenceBookName,
  SubjectId,
} from '../types/arora';
import { ScientificDiagram } from './ScientificDiagram';

interface QuestionBankViewProps {
  selectedYear: number;
  academicYearRecord?: AcademicYearRecord;
  userQuestions: QuestionItem[];
  questionProgressMap: Record<string, QuestionPracticeProgress>;
  onAddGeneratedQuestion: (q: QuestionItem) => void;
  onBulkAddQuestions: (
    questions: QuestionItem[],
  ) => Promise<{ addedCount: number; skippedDuplicates: number }>;
  onSaveQuestionProgress: (entry: QuestionPracticeProgress) => void;
  onLaunchMockTest: (preset: MockTestLaunchPreset) => void;
  operatingMode: NetworkOperatingMode;
  language: LanguageMode;
  presetSubjectId?: SubjectId;
}

type BankSubTab = 'browse' | 'practice' | 'import_ai' | 'audit';

const ALL_TYPE_OPTIONS: ('All' | QuestionType | 'Sample-Paper')[] = [
  'All',
  'MCQ',
  'MSQ',
  'Assertion-Reason',
  'Very Short Answer',
  '1-Mark',
  '2-Mark',
  '3-Mark',
  '4-Mark Case Study',
  '5-Mark',
  'Competency-Based',
  'HOTS',
  'Application-Based',
  'Numerical',
  'Derivation',
  'Diagram-Based',
  'Practical-Based',
  'Sample-Paper',
  'Previous-Year',
];

const REFERENCE_SOURCES: ('All' | ReferenceBookName)[] = [
  'All',
  'CBSE Official',
  'NCERT',
  'NCERT Exemplar',
  'MTG',
  'Together With',
  'All in One',
  'S.L. Arora',
  'Xam Idea',
  'Oswaal',
  'R.D. Sharma',
  'R.S. Aggarwal',
  'User-Provided',
];

const PROVENANCE_LABELS: ('All' | ProvenanceDisplayLabel)[] = [
  'All',
  'Official CBSE PYQ',
  'Official CBSE Sample Paper',
  'NCERT',
  'Licensed Reference Material',
  'Student Uploaded Material',
  'AI Generated',
];

const SORT_OPTIONS: { value: QuestionBankSortOption; label: string }[] = [
  { value: 'relevance', label: 'Sort: Relevance & Verified First' },
  { value: 'marks_asc', label: 'Sort: Marks Low → High' },
  { value: 'marks_desc', label: 'Sort: Marks High → Low' },
  { value: 'difficulty', label: 'Sort: Difficulty (Easy → Expert)' },
  { value: 'newest_pyq', label: 'Sort: Newest CBSE PYQ Year' },
  { value: 'bookmarked_retry', label: 'Sort: Bookmarked & Retry First' },
];

const PAGE_SIZE = 20;

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  selectedYear,
  academicYearRecord,
  userQuestions,
  questionProgressMap,
  onAddGeneratedQuestion,
  onBulkAddQuestions,
  onSaveQuestionProgress,
  onLaunchMockTest,
  operatingMode,
  language,
  presetSubjectId,
}) => {
  const [activeTab, setActiveTab] = useState<BankSubTab>('browse');

  // Filter & Sort state
  const [subjectFilter, setSubjectFilter] = useState<'all' | SubjectId>(
    presetSubjectId || 'all',
  );
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [marksFilter, setMarksFilter] = useState<'all' | number>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'All' | QuestionType | 'Sample-Paper'>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | ReferenceBookName>('All');
  const [provenanceFilter, setProvenanceFilter] = useState<'All' | ProvenanceDisplayLabel>('All');
  const [practiceStatusFilter, setPracticeStatusFilter] = useState<
    'all' | 'bookmarked' | 'incorrect' | 'completed' | 'unattempted'
  >('all');
  const [sortBy, setSortBy] = useState<QuestionBankSortOption>('relevance');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Browse card UI state
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [hintOpenIds, setHintOpenIds] = useState<Record<string, boolean>>({});

  // AI Question Generator state
  const [genSourceStyle, setGenSourceStyle] = useState<ReferenceBookName>('NCERT Exemplar');
  const [genMarks, setGenMarks] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [genType, setGenType] = useState<QuestionType>('Competency-Based');
  const [genDifficulty, setGenDifficulty] = useState<DifficultyLevel>('Moderate');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccessMsg, setGenSuccessMsg] = useState<string | null>(null);

  // Student Upload / Import state
  const [uploadSubject, setUploadSubject] = useState<SubjectId>(presetSubjectId || 'physics');
  const [uploadChapterId, setUploadChapterId] = useState<string>(
    getSubjectById(presetSubjectId || 'physics').chapters[0].id,
  );
  const [uploadPublication, setUploadPublication] = useState('Personal Class Notes / Practice Set');
  const [uploadRawText, setUploadRawText] = useState('');
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Offline pack / backup status
  const [storageStatusMsg, setStorageStatusMsg] = useState<string | null>(null);

  // Practice mode state (1 question at a time)
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceTextAns, setPracticeTextAns] = useState('');
  const [practiceSelectedIndices, setPracticeSelectedIndices] = useState<number[]>([]);
  const [practiceShowHint, setPracticeShowHint] = useState(false);
  const [practiceShowSolution, setPracticeShowSolution] = useState(false);
  const [practiceEvaluation, setPracticeEvaluation] = useState<LocalPracticeEvaluation | null>(null);
  const [aiEvaluating, setAiEvaluating] = useState(false);

  useEffect(() => {
    if (!presetSubjectId) return;
    setSubjectFilter(presetSubjectId);
    setChapterFilter('all');
    setUploadSubject(presetSubjectId);
    setUploadChapterId(getSubjectById(presetSubjectId).chapters[0].id);
  }, [presetSubjectId]);

  const allQuestions = useMemo(
    () => getAllQuestions(selectedYear, userQuestions),
    [selectedYear, userQuestions],
  );

  const chapterOptions = useMemo(() => {
    if (subjectFilter === 'all') return [];
    return getSubjectById(subjectFilter).chapters;
  }, [subjectFilter]);

  const topicSuggestions = useMemo(() => {
    if (chapterFilter !== 'all' && subjectFilter !== 'all') {
      const ch = getSubjectById(subjectFilter).chapters.find((c) => c.id === chapterFilter);
      if (ch) return Array.from(new Set([...ch.topics, ...ch.subtopics]));
    }
    if (subjectFilter !== 'all') {
      return Array.from(
        new Set(getSubjectById(subjectFilter).chapters.flatMap((c) => c.topics)),
      ).slice(0, 30);
    }
    return [];
  }, [subjectFilter, chapterFilter]);

  const filteredQuestions = useMemo(
    () =>
      filterAndSortQuestions(
        allQuestions,
        {
          subjectId: subjectFilter,
          chapterId: chapterFilter,
          topicQuery: topicFilter,
          marks: marksFilter,
          difficulty: difficultyFilter,
          type: typeFilter,
          sourceBook: sourceFilter,
          provenance: provenanceFilter,
          practiceStatus: practiceStatusFilter,
          searchQuery,
          sortBy,
        },
        questionProgressMap,
      ),
    [
      allQuestions,
      subjectFilter,
      chapterFilter,
      topicFilter,
      marksFilter,
      difficultyFilter,
      typeFilter,
      sourceFilter,
      provenanceFilter,
      practiceStatusFilter,
      searchQuery,
      sortBy,
      questionProgressMap,
    ],
  );

  // Reset pagination & practice index safely when filter results shrink
  useEffect(() => {
    setPage(1);
    setPracticeIndex(0);
    setPracticeTextAns('');
    setPracticeSelectedIndices([]);
    setPracticeEvaluation(null);
    setPracticeShowHint(false);
    setPracticeShowSolution(false);
  }, [
    subjectFilter,
    chapterFilter,
    topicFilter,
    marksFilter,
    difficultyFilter,
    typeFilter,
    sourceFilter,
    provenanceFilter,
    practiceStatusFilter,
    searchQuery,
    sortBy,
  ]);

  const paginated = useMemo(
    () => paginateQuestions(filteredQuestions, page, PAGE_SIZE),
    [filteredQuestions, page],
  );

  const progressSummary = useMemo(() => {
    const entries = Object.values(questionProgressMap);
    return {
      bookmarked: entries.filter((e) => e.bookmarked).length,
      incorrect: entries.filter((e) => e.attempts > 0 && e.lastCorrect === false).length,
      completed: entries.filter((e) => e.completed).length,
    };
  }, [questionProgressMap]);

  const sparseChapters = useMemo(
    () => detectSparseChapters(allQuestions, 10),
    [allQuestions],
  );

  const auditReport = useMemo(
    () => buildQuestionBankAuditReport(allQuestions, selectedYear),
    [allQuestions, selectedYear],
  );

  const currentPracticeQuestion = filteredQuestions[practiceIndex] || null;

  const toggleBookmark = (q: QuestionItem) => {
    triggerHaptic('tap');
    const existing = questionProgressMap[q.id];
    onSaveQuestionProgress({
      questionId: q.id,
      bookmarked: !existing?.bookmarked,
      completed: existing?.completed ?? false,
      lastCorrect: existing?.lastCorrect,
      attempts: existing?.attempts ?? 0,
      lastSubmittedAnswer: existing?.lastSubmittedAnswer,
      lastFeedback: existing?.lastFeedback,
      updatedAt: new Date().toISOString(),
    });
  };

  const resetPracticeInputs = (nextIdx: number) => {
    setPracticeIndex(nextIdx);
    const nextQ = filteredQuestions[nextIdx];
    const saved = nextQ ? questionProgressMap[nextQ.id] : undefined;
    setPracticeTextAns(saved?.lastSubmittedAnswer && !nextQ?.options?.length ? saved.lastSubmittedAnswer : '');
    setPracticeSelectedIndices([]);
    setPracticeEvaluation(null);
    setPracticeShowHint(false);
    setPracticeShowSolution(false);
  };

  const handleSubmitPracticeLocal = () => {
    if (!currentPracticeQuestion) return;
    triggerHaptic('submit');
    const selectedText =
      currentPracticeQuestion.options && practiceSelectedIndices.length > 0
        ? practiceSelectedIndices
            .map((i) => currentPracticeQuestion.options![i])
            .filter(Boolean)
            .join(' || ')
        : practiceTextAns;

    const evalRes = evaluatePracticeResponseLocal(
      currentPracticeQuestion,
      selectedText,
      practiceSelectedIndices,
    );
    setPracticeEvaluation(evalRes);
    const existing = questionProgressMap[currentPracticeQuestion.id];
    onSaveQuestionProgress({
      questionId: currentPracticeQuestion.id,
      bookmarked: existing?.bookmarked ?? false,
      completed: evalRes.isCorrect ? true : (existing?.completed ?? false),
      lastCorrect: evalRes.isCorrect,
      attempts: (existing?.attempts ?? 0) + 1,
      lastSubmittedAnswer: selectedText.slice(0, 1000),
      lastFeedback: evalRes.feedback,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleEvaluateWithAroraAi = async () => {
    if (!currentPracticeQuestion) return;
    if (operatingMode === 'reconnecting') {
      handleSubmitPracticeLocal();
      return;
    }
    const answerToVerify =
      currentPracticeQuestion.options && practiceSelectedIndices.length > 0
        ? practiceSelectedIndices
            .map((i) => currentPracticeQuestion.options![i])
            .filter(Boolean)
            .join(', ')
        : practiceTextAns.trim();
    if (!answerToVerify) {
      handleSubmitPracticeLocal();
      return;
    }

    setAiEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate-practice-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: currentPracticeQuestion.questionText,
          correctAnswer: currentPracticeQuestion.correctAnswer,
          explanation: currentPracticeQuestion.explanation,
          stepByStepSolution:
            currentPracticeQuestion.stepByStepSolution ||
            currentPracticeQuestion.markingSchemeSteps,
          marks: currentPracticeQuestion.marks,
          questionType: currentPracticeQuestion.type,
          studentAnswer: answerToVerify,
          language,
        }),
      });
      if (!res.ok) throw new Error('Evaluation fallback');
      const data = (await res.json()) as LocalPracticeEvaluation & { scoreAwarded: number };
      setPracticeEvaluation(data);
      const existing = questionProgressMap[currentPracticeQuestion.id];
      onSaveQuestionProgress({
        questionId: currentPracticeQuestion.id,
        bookmarked: existing?.bookmarked ?? false,
        completed: data.isCorrect ? true : (existing?.completed ?? false),
        lastCorrect: data.isCorrect,
        attempts: (existing?.attempts ?? 0) + 1,
        lastSubmittedAnswer: answerToVerify.slice(0, 1000),
        lastFeedback: data.feedback,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      handleSubmitPracticeLocal();
    } finally {
      setAiEvaluating(false);
    }
  };

  const handleGenerateOriginalPractice = async (gapTarget?: ChapterCoverageGap) => {
    if (operatingMode === 'reconnecting') {
      setGenError('Network connection is reconnecting. Please wait a moment and try again.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    setGenSuccessMsg(null);

    const targetSubId = gapTarget?.subjectId || (subjectFilter === 'all' ? 'physics' : subjectFilter);
    const sub = getSubjectById(targetSubId);
    const ch =
      gapTarget
        ? sub.chapters.find((c) => c.id === gapTarget.chapterId) || sub.chapters[0]
        : chapterFilter !== 'all'
          ? sub.chapters.find((c) => c.id === chapterFilter) || sub.chapters[0]
          : sub.chapters[0];

    const reqMarks = gapTarget
      ? (gapTarget.missingTypes.includes('5-Mark')
          ? 5
          : gapTarget.missingTypes.includes('4-Mark Case Study')
            ? 4
            : gapTarget.missingTypes.includes('MCQ')
              ? 1
              : 3)
      : genMarks;

    const reqType = gapTarget
      ? gapTarget.missingTypes[0] || genType
      : genType;

    const reqDiff = difficultyFilter === 'all' ? genDifficulty : difficultyFilter;
    const targetTopic = topicFilter.trim() || gapTarget?.suggestedTopic || ch.topics[0];
    const targetSubtopic = gapTarget?.suggestedSubtopic || ch.subtopics[0] || targetTopic;
    const styleBook = gapTarget?.suggestedSource || genSourceStyle;

    const existingSnippets = allQuestions
      .filter((q) => q.chapterId === ch.id)
      .slice(0, 8)
      .map((q) => q.questionText);

    try {
      const res = await fetch('/api/ai/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: sub.name,
          chapterTitle: ch.title,
          topic: targetTopic,
          subtopic: targetSubtopic,
          marks: reqMarks,
          difficulty: reqDiff,
          questionType: reqType,
          sourceStyle: styleBook,
          year: selectedYear,
          existingQuestionSnippets: existingSnippets,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        questionText: string;
        assertionText?: string;
        reasonText?: string;
        options: string[];
        correctOptionIndex: number;
        correctOptionIndices?: number[];
        correctAnswer: string;
        hint?: string;
        formulaRef?: string;
        stepByStepSolution?: string[];
        explanation: string;
      };

      const hash = computeQuestionContentHash({
        subjectId: sub.id,
        chapterId: ch.id,
        questionText: data.questionText,
      });

      const isDup = allQuestions.some((q) => (q.contentHash || computeQuestionContentHash(q)) === hash);
      if (isDup) {
        throw new Error('Generated item closely matched an existing question. Please try again for a fresh variation.');
      }

      const newQ: QuestionItem = {
        id: `ai-gen-${Date.now()}`,
        year: selectedYear,
        subjectId: sub.id,
        chapterId: ch.id,
        chapterTitle: ch.title,
        topic: targetTopic,
        subtopic: targetSubtopic,
        marks: reqMarks,
        difficulty: reqDiff,
        type: reqType,
        sourceBook: styleBook === 'User-Provided' ? 'NCERT' : styleBook,
        sourceCategory: 'AI-Generated Practice',
        sourcePublication: `ARORA AI (${styleBook} Pattern)`,
        isPreviousYear: false,
        questionText: data.questionText,
        assertionText: data.assertionText || undefined,
        reasonText: data.reasonText || undefined,
        options: data.options && data.options.length > 0 ? data.options : undefined,
        correctOptionIndex: data.correctOptionIndex >= 0 ? data.correctOptionIndex : undefined,
        correctOptionIndices:
          data.correctOptionIndices && data.correctOptionIndices.length > 0
            ? data.correctOptionIndices
            : undefined,
        correctAnswer: data.correctAnswer,
        hint: data.hint || undefined,
        formulaRef: data.formulaRef || undefined,
        stepByStepSolution:
          data.stepByStepSolution && data.stepByStepSolution.length > 0
            ? data.stepByStepSolution
            : undefined,
        explanation: data.explanation,
        contentHash: hash,
      };
      onAddGeneratedQuestion(newQ);
      setExpandedIds((prev) => ({ ...prev, [newQ.id]: true }));
      setGenSuccessMsg(
        `Added verified original ${reqMarks}-mark ${reqType} question for "${ch.title}" (${styleBook} style).`,
      );
      triggerHaptic('success');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Unable to generate question right now.');
    } finally {
      setGenerating(false);
    }
  };

  const handleImportSubmit = async () => {
    setUploadStatusMsg(null);
    const existingHashes = new Set(
      allQuestions.map((q) => q.contentHash || computeQuestionContentHash(q)),
    );
    const parsed = parseUploadedStudyQuestions(
      uploadRawText,
      {
        subjectId: uploadSubject,
        chapterId: uploadChapterId,
        year: selectedYear,
        sourcePublication: uploadPublication,
      },
      existingHashes,
    );
    if (parsed.imported.length === 0) {
      setUploadStatusMsg(
        parsed.errors[0] ||
          (parsed.skippedDuplicates > 0
            ? `Skipped ${parsed.skippedDuplicates} duplicate questions already in your bank.`
            : 'No valid questions found to import.'),
      );
      return;
    }
    const dbRes = await onBulkAddQuestions(parsed.imported);
    const totalSkipped = parsed.skippedDuplicates + dbRes.skippedDuplicates;
    setUploadStatusMsg(
      `Imported ${dbRes.addedCount} question(s) under Student Uploaded Material.${totalSkipped > 0 ? ` Skipped ${totalSkipped} duplicate(s).` : ''}${parsed.errors.length > 0 ? ` Note: ${parsed.errors[0]}` : ''}`,
    );
    setUploadRawText('');
    triggerHaptic('success');
  };

  const handleUploadFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadRawText(text);
    setUploadPublication(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleSaveOfflineSubjectPack = async () => {
    const targetSubject: SubjectId = subjectFilter === 'all' ? 'physics' : subjectFilter;
    const subQuestions = allQuestions.filter((q) => q.subjectId === targetSubject);
    const pack = await saveOfflineQuestionPack(targetSubject, selectedYear, subQuestions);
    setStorageStatusMsg(
      `Saved ${pack.questionCount} ${getSubjectById(targetSubject).name} questions (${pack.sizeKb} KB) for offline study in IndexedDB.`,
    );
    triggerHaptic('success');
  };

  const handleDownloadBackup = async () => {
    const json = await exportFullBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arora-question-bank-backup-${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStorageStatusMsg('Exported full IndexedDB Question Bank & Student Progress JSON backup.');
  };

  const handleLaunchMockFromCurrentFilter = () => {
    triggerHaptic('submit');
    const targetSub: SubjectId = subjectFilter === 'all' ? 'physics' : subjectFilter;
    onLaunchMockTest({
      subjectId: targetSub,
      chapterId: chapterFilter !== 'all' ? chapterFilter : undefined,
      topic: topicFilter.trim() || undefined,
      pyqOnly: typeFilter === 'Previous-Year' || provenanceFilter === 'Official CBSE PYQ',
      allowedSources:
        sourceFilter !== 'All' ? [sourceFilter] : undefined,
      totalMarks: chapterFilter !== 'all' ? 30 : 40,
      testType: topicFilter.trim()
        ? 'Topic-wise'
        : chapterFilter !== 'all'
          ? 'Chapter-wise'
          : 'Board-Pattern',
      difficulty: difficultyFilter === 'all' ? 'Mixed' : difficultyFilter,
    });
  };

  const yearVerificationText =
    academicYearRecord?.status === 'archived_verified'
      ? `Verified Board Archive (${academicYearRecord.sessionLabel})`
      : academicYearRecord?.status === 'current_verified'
        ? `Verified Active CBSE Session (${academicYearRecord.sessionLabel})`
        : academicYearRecord?.status === 'future_provisional'
          ? `Future Provisional Blueprint (${selectedYear - 1}–${String(selectedYear).slice(-2)} · No official PYQs released yet)`
          : `Pending Official CBSE Circular (${selectedYear - 1}–${String(selectedYear).slice(-2)} · Baseline NCERT syllabus)`;

  const resetAllFilters = () => {
    setSubjectFilter('all');
    setChapterFilter('all');
    setTopicFilter('');
    setMarksFilter('all');
    setDifficultyFilter('all');
    setTypeFilter('All');
    setSourceFilter('All');
    setProvenanceFilter('All');
    setPracticeStatusFilter('all');
    setSortBy('relevance');
    setSearchQuery('');
  };

  return (
    <section className="space-y-5">
      {/* Header Zone */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
            {yearVerificationText}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            CBSE Class 12 Question Bank
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Searchable, paginated collection across NCERT, Reference Guides, Official PYQs &amp; Sample Papers with strict provenance labels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLaunchMockFromCurrentFilter}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white glass-press min-h-[42px] whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Mock Test from Filter
          </button>
          <button
            type="button"
            onClick={handleSaveOfflineSubjectPack}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold glass-subcard text-slate-800 dark:text-slate-100 hover:border-sky-400/50 glass-press min-h-[42px] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-500" />
            Save Offline Pack
          </button>
        </div>
      </div>

      {/* Mode Switcher + Year-Wise Pattern Strip */}
      <div className="holo-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="apple-segmented">
            {(
              [
                { id: 'browse', label: 'Browse Bank' },
                { id: 'practice', label: 'Interactive Practice' },
                { id: 'import_ai', label: 'Upload & AI Gap Fill' },
                { id: 'audit', label: 'Coverage Audit' },
              ] as { id: BankSubTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setActiveTab(tab.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Practice Progress Filters */}
          <div className="flex flex-wrap items-center gap-1.5 tabular-nums text-xs">
            {(
              [
                { id: 'all', label: `All (${allQuestions.length})` },
                { id: 'bookmarked', label: `Bookmarked (${progressSummary.bookmarked})` },
                { id: 'incorrect', label: `Retry Queue (${progressSummary.incorrect})` },
                { id: 'completed', label: `Completed (${progressSummary.completed})` },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setPracticeStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  practiceStatusFilter === st.id
                    ? 'bg-sky-600/12 dark:bg-sky-500/20 border-sky-500/50 text-sky-700 dark:text-sky-300'
                    : 'glass-subcard text-slate-600 dark:text-slate-300 hover:border-sky-400/40'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {academicYearRecord && (
          <div className="pt-2 border-t border-slate-900/10 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <span>{academicYearRecord.samplePaperSummary}</span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              {academicYearRecord.previousYearMaterialsNote}
            </span>
          </div>
        )}
      </div>

      {storageStatusMsg && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
          <span>{storageStatusMsg}</span>
          <button
            type="button"
            onClick={() => setStorageStatusMsg(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Multi-Faceted Search, Topic, Provenance & Sort Bar (Shown on Browse & Practice) */}
      {(activeTab === 'browse' || activeTab === 'practice') && (
        <div className="holo-panel p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-500" />
              Search, Topic &amp; Source Filters
            </span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {filteredQuestions.length} matching questions · {auditReport.sparseChapterCount} chapters eligible for deeper AI practice
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question, formula, or keyword..."
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            />

            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value as 'all' | SubjectId);
                setChapterFilter('all');
                setTopicFilter('');
              }}
              aria-label="Filter by subject"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              <option value="all">All 6 Subjects</option>
              {CBSE_CLASS_12_CURRICULUM.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={chapterFilter}
              onChange={(e) => {
                setChapterFilter(e.target.value);
                setTopicFilter('');
              }}
              disabled={subjectFilter === 'all'}
              aria-label="Filter by chapter"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 disabled:opacity-50 min-h-[40px]"
            >
              <option value="all">All Chapters</option>
              {chapterOptions.map((c) => (
                <option key={c.id} value={c.id}>Ch {c.number}: {c.title}</option>
              ))}
            </select>

            <div className="relative">
              <input
                type="text"
                list="arora-topic-suggestions"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                placeholder="Topic or subtopic filter..."
                aria-label="Filter by topic or subtopic"
                className="w-full px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
              />
              <datalist id="arora-topic-suggestions">
                {topicSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'All' | QuestionType | 'Sample-Paper')
              }
              aria-label="Filter by question type"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              {ALL_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Question Types' : t === 'Sample-Paper' ? 'Official Sample Paper' : t}
                </option>
              ))}
            </select>

            <select
              value={marksFilter}
              onChange={(e) => setMarksFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              aria-label="Filter by marks"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              <option value="all">All Marks (1–5M)</option>
              {[1, 2, 3, 4, 5].map((m) => (
                <option key={m} value={m}>{m} Mark{m > 1 ? 's' : ''}</option>
              ))}
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as 'all' | DifficultyLevel)}
              aria-label="Filter by difficulty"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              <option value="all">All Difficulty Levels</option>
              {(['Easy', 'Moderate', 'Hard', 'Expert'] as DifficultyLevel[]).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'All' | ReferenceBookName)}
              aria-label="Filter by reference source"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              {REFERENCE_SOURCES.map((src) => (
                <option key={src} value={src}>{src === 'All' ? 'All 12 Reference Sources' : src}</option>
              ))}
            </select>

            <select
              value={provenanceFilter}
              onChange={(e) => setProvenanceFilter(e.target.value as 'All' | ProvenanceDisplayLabel)}
              aria-label="Filter by provenance label"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              {PROVENANCE_LABELS.map((p) => (
                <option key={p} value={p}>{p === 'All' ? 'All Provenance Labels' : p}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as QuestionBankSortOption)}
              aria-label="Sort questions"
              className="px-3 py-2 glass-input text-xs text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-2 glass-subcard text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-sky-400/50 glass-press min-h-[40px] whitespace-nowrap"
            >
              Reset All Filters
            </button>

            <button
              type="button"
              onClick={() => handleGenerateOriginalPractice()}
              disabled={generating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white transition-colors min-h-[40px] whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Synthesizing...' : 'AI Practice Item'}
            </button>
          </div>
        </div>
      )}

      {genError && (
        <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/25 text-xs text-amber-800 dark:text-amber-300">
          {genError}
        </div>
      )}
      {genSuccessMsg && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-200">
          {genSuccessMsg}
        </div>
      )}

      {/* TAB 1: PAGINATED BROWSE BANK */}
      {activeTab === 'browse' && (
        <div className="space-y-3">
          {paginated.totalItems > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums px-1">
              <span>
                Showing {paginated.startIndex + 1}–{paginated.endIndex} of {paginated.totalItems} matching questions (Page {paginated.page} of {paginated.totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginated.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl glass-subcard text-xs font-medium disabled:opacity-40 min-h-[36px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={paginated.page >= paginated.totalPages}
                  onClick={() => setPage((p) => Math.min(paginated.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl glass-subcard text-xs font-medium disabled:opacity-40 min-h-[36px]"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {paginated.items.map((q) => {
            const isOpen = Boolean(expandedIds[q.id]);
            const isHintOpen = Boolean(hintOpenIds[q.id]);
            const prog = questionProgressMap[q.id];
            const provenance = getDisplaySourceCategory(q);

            return (
              <article key={q.id} className="holo-panel p-4 sm:p-5 space-y-3">
                {/* Clean Unboxed Typographic Metadata Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sky-600 dark:text-sky-400 capitalize">
                      {q.subjectId.replace('_', ' ')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.chapterTitle}</span>
                    {q.subtopic && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{q.subtopic}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
                      {q.marks} Mark{q.marks > 1 ? 's' : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.difficulty}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-medium text-violet-700 dark:text-violet-300">
                      {provenance}
                      {q.isPreviousYear && q.pyqYear
                        ? ` (${q.pyqYear}${q.pyqPaperCode ? ` · ${q.pyqPaperCode}` : ''})`
                        : q.isSamplePaper && q.samplePaperYear
                          ? ` (${q.samplePaperYear})`
                          : q.sourcePublication
                            ? ` · ${q.sourcePublication}`
                            : ` · ${q.sourceBook}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(q)}
                      aria-label={prog?.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium min-h-[34px] ${
                        prog?.bookmarked
                          ? 'bg-amber-500/15 border-amber-400/50 text-amber-700 dark:text-amber-300'
                          : 'glass-subcard text-slate-600 dark:text-slate-300 hover:border-sky-400/40'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      {prog?.bookmarked ? 'Saved' : 'Bookmark'}
                    </button>
                  </div>
                </div>

                <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                  {q.questionText}
                </div>

                {q.assertionText && q.reasonText && (
                  <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 glass-subcard p-3">
                    <p>{q.assertionText}</p>
                    <p>{q.reasonText}</p>
                  </div>
                )}

                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className="px-3.5 py-2.5 glass-subcard text-slate-700 dark:text-slate-200"
                      >
                        <span className="font-mono text-sky-600 dark:text-sky-400 mr-2">
                          {q.type === 'MSQ' ? `[${String.fromCharCode(65 + idx)}]` : `(${String.fromCharCode(65 + idx)})`}
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {isHintOpen && (
                  <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/35 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-sky-700 dark:text-sky-300">Hint: </span>
                    {q.hint || `Identify the governing principle of ${q.topic} before substituting values.`}
                    {q.formulaRef && (
                      <div className="mt-1 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                        Key Expression: {q.formulaRef}
                      </div>
                    )}
                  </div>
                )}

                {isOpen && q.diagramId && <ScientificDiagram diagramId={q.diagramId} />}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900/10 dark:border-white/10">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    <span>Topic: {q.topic}</span>
                    {prog?.completed && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    )}
                    {!prog?.completed && prog && prog.attempts > 0 && prog.lastCorrect === false && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Needs Retry
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setHintOpenIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline min-h-[36px]"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {isHintOpen ? 'Hide Hint' : 'Hint'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const globalIdx = filteredQuestions.findIndex((fq) => fq.id === q.id);
                        if (globalIdx >= 0) {
                          resetPracticeInputs(globalIdx);
                          setActiveTab('practice');
                        }
                      }}
                      className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline min-h-[36px]"
                    >
                      Practice Now
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline min-h-[36px]"
                    >
                      {isOpen ? 'Hide Solution' : 'Answer & Stepwise Solution'}
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-400/35 dark:border-emerald-500/25 holo-blur space-y-2 text-xs sm:text-sm">
                    <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Verified Answer: {q.correctAnswer}
                    </div>
                    {q.formulaRef && (
                      <div className="font-mono text-xs text-cyan-800 dark:text-cyan-300">
                        Formula / Rule: {q.formulaRef}
                      </div>
                    )}
                    {((q.stepByStepSolution && q.stepByStepSolution.length > 0) ||
                      (q.markingSchemeSteps && q.markingSchemeSteps.length > 0)) && (
                      <ol className="list-decimal list-inside space-y-1 text-slate-800 dark:text-slate-200">
                        {(q.stepByStepSolution || q.markingSchemeSteps || []).map((st, idx) => (
                          <li key={idx}>{st}</li>
                        ))}
                      </ol>
                    )}
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </article>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div className="holo-panel p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No questions match this exact filter combination.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reset filters or click &ldquo;AI Practice Item&rdquo; to generate an original NCERT-aligned CBSE question.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE 1-AT-A-TIME PRACTICE MODE */}
      {activeTab === 'practice' && (
        <div className="space-y-4">
          {!currentPracticeQuestion ? (
            <div className="holo-panel p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No questions match your current practice filter.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold min-h-[40px]"
              >
                Show All Practice Questions
              </button>
            </div>
          ) : (
            <div className="holo-panel p-5 sm:p-6 space-y-5">
              {/* Practice Progress Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-900/10 dark:border-white/10">
                <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Question {practiceIndex + 1} of {filteredQuestions.length}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span className="capitalize">{currentPracticeQuestion.subjectId.replace('_', ' ')}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{currentPracticeQuestion.chapterTitle}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{currentPracticeQuestion.marks} Marks ({currentPracticeQuestion.type})</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleBookmark(currentPracticeQuestion)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium min-h-[38px] ${
                      questionProgressMap[currentPracticeQuestion.id]?.bookmarked
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-700 dark:text-amber-300'
                        : 'glass-subcard text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {questionProgressMap[currentPracticeQuestion.id]?.bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPracticeShowHint((h) => !h)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-subcard text-xs font-medium text-amber-700 dark:text-amber-300 min-h-[38px]"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {practiceShowHint ? 'Hide Hint' : 'Show Hint'}
                  </button>
                </div>
              </div>

              {/* Question Prompt & Provenance */}
              <div className="space-y-3">
                <div className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                  {getDisplaySourceCategory(currentPracticeQuestion)} · Topic: {currentPracticeQuestion.topic}
                  {currentPracticeQuestion.subtopic ? ` (${currentPracticeQuestion.subtopic})` : ''}
                </div>
                <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed">
                  {currentPracticeQuestion.questionText}
                </p>

                {currentPracticeQuestion.assertionText && currentPracticeQuestion.reasonText && (
                  <div className="p-3.5 glass-subcard text-xs sm:text-sm space-y-1 text-slate-700 dark:text-slate-200">
                    <p>{currentPracticeQuestion.assertionText}</p>
                    <p>{currentPracticeQuestion.reasonText}</p>
                  </div>
                )}

                {practiceShowHint && (
                  <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/35 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-1">
                    <div>
                      <span className="font-semibold text-sky-700 dark:text-sky-300">Hint: </span>
                      {currentPracticeQuestion.hint ||
                        `Start by identifying the core CBSE formula or definition in ${currentPracticeQuestion.topic}.`}
                    </div>
                    {currentPracticeQuestion.formulaRef && (
                      <div className="font-mono text-xs text-cyan-700 dark:text-cyan-300">
                        Reference: {currentPracticeQuestion.formulaRef}
                      </div>
                    )}
                  </div>
                )}

                {currentPracticeQuestion.diagramId && practiceShowSolution && (
                  <ScientificDiagram diagramId={currentPracticeQuestion.diagramId} />
                )}

                {/* Answer Input Area */}
                {currentPracticeQuestion.options && currentPracticeQuestion.options.length > 0 ? (
                  <div className="space-y-2">
                    {currentPracticeQuestion.options.map((opt, idx) => {
                      const isMsq = currentPracticeQuestion.type === 'MSQ';
                      const chosen = practiceSelectedIndices.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap');
                            if (isMsq) {
                              setPracticeSelectedIndices((prev) =>
                                prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
                              );
                            } else {
                              setPracticeSelectedIndices([idx]);
                            }
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl border text-sm min-h-[46px] transition-colors ${
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
                    value={practiceTextAns}
                    onChange={(e) => setPracticeTextAns(e.target.value)}
                    placeholder="Write your answer, step-by-step derivation, numerical substitution with units, or SQL/Python code..."
                    className="w-full p-3.5 glass-input text-sm text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitPracticeLocal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold min-h-[42px] whitespace-nowrap"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Submit Answer
                  </button>

                  {(!currentPracticeQuestion.options || currentPracticeQuestion.options.length === 0) && (
                    <button
                      type="button"
                      disabled={aiEvaluating}
                      onClick={handleEvaluateWithAroraAi}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-semibold min-h-[42px] whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4" />
                      {aiEvaluating ? 'Evaluating Stepwise...' : 'Evaluate with ARORA AI'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPracticeShowSolution((s) => !s)}
                    className="px-4 py-2.5 rounded-2xl glass-subcard text-xs font-semibold text-slate-800 dark:text-slate-100 min-h-[42px] whitespace-nowrap"
                  >
                    {practiceShowSolution ? 'Hide Solution' : 'Reveal Full Solution'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPracticeTextAns('');
                      setPracticeSelectedIndices([]);
                      setPracticeEvaluation(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl glass-subcard text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[42px] whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={practiceIndex <= 0}
                    onClick={() => resetPracticeInputs(Math.max(0, practiceIndex - 1))}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl glass-subcard text-xs font-medium disabled:opacity-40 min-h-[40px]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={practiceIndex >= filteredQuestions.length - 1}
                    onClick={() =>
                      resetPracticeInputs(Math.min(filteredQuestions.length - 1, practiceIndex + 1))
                    }
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white/15 text-white text-xs font-semibold disabled:opacity-40 min-h-[40px]"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Practice Feedback Banner */}
              {practiceEvaluation && (
                <div
                  className={`p-4 rounded-2xl border space-y-1.5 text-xs sm:text-sm ${
                    practiceEvaluation.status === 'correct'
                      ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-900 dark:text-emerald-200'
                      : practiceEvaluation.status === 'partial'
                        ? 'bg-amber-500/10 border-amber-400/40 text-amber-900 dark:text-amber-200'
                        : 'bg-rose-500/10 border-rose-400/40 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      {practiceEvaluation.status === 'correct' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      {practiceEvaluation.status === 'correct'
                        ? 'Correct Response'
                        : practiceEvaluation.status === 'partial'
                          ? 'Partial Credit'
                          : 'Needs Revision'}
                    </span>
                    <span className="tabular-nums font-mono">
                      Score: {practiceEvaluation.scoreAwarded} / {currentPracticeQuestion.marks}
                    </span>
                  </div>
                  <p>{practiceEvaluation.feedback}</p>
                  <p className="text-xs opacity-90">
                    Analysis: {practiceEvaluation.mistakeExplanation}
                  </p>
                  <p className="text-xs font-medium">
                    Next Step: {practiceEvaluation.nextStepHint}
                  </p>
                </div>
              )}

              {/* Revealed Full Step-by-Step Solution */}
              {practiceShowSolution && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-400/35 space-y-2 text-xs sm:text-sm">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Verified Answer: {currentPracticeQuestion.correctAnswer}
                  </div>
                  {currentPracticeQuestion.formulaRef && (
                    <div className="font-mono text-xs text-cyan-800 dark:text-cyan-300">
                      Formula / Theorem: {currentPracticeQuestion.formulaRef}
                    </div>
                  )}
                  {((currentPracticeQuestion.stepByStepSolution &&
                    currentPracticeQuestion.stepByStepSolution.length > 0) ||
                    (currentPracticeQuestion.markingSchemeSteps &&
                      currentPracticeQuestion.markingSchemeSteps.length > 0)) && (
                    <ol className="list-decimal list-inside space-y-1 text-slate-800 dark:text-slate-200">
                      {(
                        currentPracticeQuestion.stepByStepSolution ||
                        currentPracticeQuestion.markingSchemeSteps ||
                        []
                      ).map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                  <p className="text-slate-700 dark:text-slate-300">
                    {currentPracticeQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UPLOAD AUTHORIZED MATERIAL & AI SPARSE-CHAPTER GAP FILLER */}
      {activeTab === 'import_ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* AI Gap Detection & Style Generator */}
          <div className="lg:col-span-6 holo-panel p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                AI Style-Matched Generator &amp; Gap Detector
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Detect chapters with fewer curated items and generate duplicate-free original NCERT-aligned practice questions modeled after your chosen CBSE reference source.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Reference Book Style
                <select
                  value={genSourceStyle}
                  onChange={(e) => setGenSourceStyle(e.target.value as ReferenceBookName)}
                  className="px-3 py-2 glass-input text-xs min-h-[40px]"
                >
                  {REFERENCE_SOURCES.filter((s) => s !== 'All' && s !== 'User-Provided').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Question Type
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as QuestionType)}
                  className="px-3 py-2 glass-input text-xs min-h-[40px]"
                >
                  {ALL_TYPE_OPTIONS.filter(
                    (t) => t !== 'All' && t !== 'Previous-Year' && t !== 'Sample-Paper',
                  ).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Marks
                <select
                  value={genMarks}
                  onChange={(e) => setGenMarks(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="px-3 py-2 glass-input text-xs min-h-[40px]"
                >
                  {[1, 2, 3, 4, 5].map((m) => (
                    <option key={m} value={m}>{m} Mark{m > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Difficulty
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value as DifficultyLevel)}
                  className="px-3 py-2 glass-input text-xs min-h-[40px]"
                >
                  {(['Easy', 'Moderate', 'Hard', 'Expert'] as DifficultyLevel[]).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => handleGenerateOriginalPractice()}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white min-h-[42px]"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Synthesizing Verified Question...' : `Generate Original ${genSourceStyle}-Style Question`}
            </button>

            <div className="pt-2 border-t border-slate-900/10 dark:border-white/10 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                Chapters Needing Deeper Curated Practice ({sparseChapters.length} detected)
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sparseChapters.slice(0, 8).map((gap) => (
                  <div
                    key={gap.chapterId}
                    className="p-3 glass-subcard flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {gap.subjectName} · {gap.chapterTitle}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        Total {gap.currentCount} ({gap.curatedCount} curated) · Suggested: {gap.missingTypes[0] || 'Competency-Based'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => handleGenerateOriginalPractice(gap)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap shrink-0 min-h-[36px]"
                    >
                      Fill Gap with AI
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Authorized Material Upload & Importer */}
          <div className="lg:col-span-6 holo-panel p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Import Student-Owned Study Material
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Upload or paste authorized JSON, CSV, or plain-text Q&amp;A sets. Stored locally in IndexedDB with content-hash duplicate detection and tagged as Student Uploaded Material.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Default Subject
                <select
                  value={uploadSubject}
                  onChange={(e) => {
                    const nextSub = e.target.value as SubjectId;
                    setUploadSubject(nextSub);
                    setUploadChapterId(getSubjectById(nextSub).chapters[0].id);
                  }}
                  className="px-3 py-2 glass-input text-xs min-h-[40px]"
                >
                  {CBSE_CLASS_12_CURRICULUM.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Default Chapter
                <select
                  value={uploadChapterId}
                  onChange={(e) => setUploadChapterId(e.target.value)}
                  className="px-3 py-2 glass-input text-xs min-h-[40px]"
                >
                  {getSubjectById(uploadSubject).chapters.map((c) => (
                    <option key={c.id} value={c.id}>Ch {c.number}: {c.title}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Source Label / Pack Title
              <input
                type="text"
                value={uploadPublication}
                onChange={(e) => setUploadPublication(e.target.value)}
                className="px-3 py-2 glass-input text-xs min-h-[40px]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleUploadFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-subcard text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[38px]"
              >
                <FileUp className="w-3.5 h-3.5 text-sky-500" />
                Choose .JSON / .CSV / .TXT File
              </button>
              <button
                type="button"
                onClick={() =>
                  setUploadRawText(
                    `Q: State Gauss's Law in electrostatics and write its mathematical expression.\nA: Total electric flux through a closed surface equals 1/ε₀ times enclosed net charge q: Φ = q/ε₀.\nHint: Sum charges strictly inside the Gaussian surface.\nExplanation: Exterior charges contribute net zero flux entering and leaving the closed surface.`,
                  )
                }
                className="px-3 py-2 rounded-xl glass-subcard text-xs font-medium text-sky-600 dark:text-sky-400 min-h-[38px]"
              >
                Load Sample Format
              </button>
            </div>

            <textarea
              rows={7}
              value={uploadRawText}
              onChange={(e) => setUploadRawText(e.target.value)}
              placeholder={`Paste JSON array, CSV ("questionText,correctAnswer,marks,topic,explanation"), or Q: / A: / Explanation: blocks...`}
              className="w-full p-3 glass-input text-xs font-mono text-slate-900 dark:text-slate-100"
            />

            <button
              type="button"
              onClick={handleImportSubmit}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white min-h-[42px]"
            >
              <Upload className="w-4 h-4" />
              Validate &amp; Import to Local Question Bank
            </button>

            {uploadStatusMsg && (
              <div className="p-3 rounded-xl glass-subcard text-xs text-slate-800 dark:text-slate-200">
                {uploadStatusMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDITABLE COVERAGE & INTEGRITY REPORT */}
      {activeTab === 'audit' && (
        <div className="space-y-5">
          <div className="holo-panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Question Bank Coverage &amp; Integrity Report (Session {selectedYear})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live counts computed directly from your indexed CBSE collection, PYQ archive, and local IndexedDB database.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl glass-subcard text-xs font-semibold text-slate-800 dark:text-slate-100 min-h-[40px]"
              >
                <Database className="w-3.5 h-3.5 text-sky-500" />
                Export JSON Backup
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
              <div className="p-3.5 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Indexed</div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {auditReport.totalIndexed}
                </div>
              </div>
              <div className="p-3.5 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Official PYQs</div>
                <div className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {auditReport.curatedOfficialPyqCount}
                </div>
              </div>
              <div className="p-3.5 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Sample Papers</div>
                <div className="mt-1 text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {auditReport.officialSamplePaperCount}
                </div>
              </div>
              <div className="p-3.5 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Curated Guides</div>
                <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {auditReport.curatedReferenceCount}
                </div>
              </div>
              <div className="p-3.5 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">NCERT-Aligned</div>
                <div className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {auditReport.curriculumAlignedGeneratedCount + auditReport.aiGeneratedUserCount}
                </div>
              </div>
              <div className="p-3.5 glass-subcard">
                <div className="text-xs text-slate-500 dark:text-slate-400">Student Uploaded</div>
                <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {auditReport.studentUploadedCount}
                </div>
              </div>
            </div>

            {/* Integrity Check Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs tabular-nums">
              <div className="p-3 glass-subcard">
                <span className="text-slate-500 dark:text-slate-400">Duplicate Check: </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Passed ({auditReport.duplicateHashesFound} duplicates blocked)
                </span>
              </div>
              <div className="p-3 glass-subcard">
                <span className="text-slate-500 dark:text-slate-400">Answer Key Integrity: </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {auditReport.answerIntegrityIssues === 0
                    ? '100% Verified Solutions'
                    : `${auditReport.answerIntegrityIssues} issue(s) flagged`}
                </span>
              </div>
              <div className="p-3 glass-subcard">
                <span className="text-slate-500 dark:text-slate-400">AI Provenance Guard: </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {auditReport.aiMarkedAsPyqViolations === 0
                    ? 'Verified (0 mislabeled)'
                    : `${auditReport.aiMarkedAsPyqViolations} violation(s)`}
                </span>
              </div>
              <div className="p-3 glass-subcard">
                <span className="text-slate-500 dark:text-slate-400">Sparse Chapters (&lt;10): </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {auditReport.sparseChapterCount} chapters
                </span>
              </div>
            </div>

            {/* Subject-Wise Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums border-collapse">
                <thead>
                  <tr className="border-b border-slate-900/10 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Subject</th>
                    <th className="py-2 px-3 font-medium">Chapters Covered</th>
                    <th className="py-2 px-3 font-medium">Total</th>
                    <th className="py-2 px-3 font-medium">PYQs</th>
                    <th className="py-2 px-3 font-medium">Sample Papers</th>
                    <th className="py-2 px-3 font-medium">Curated</th>
                    <th className="py-2 pl-3 font-medium">Original Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {auditReport.subjectBreakdown.map((row) => (
                    <tr
                      key={row.subjectId}
                      className="border-b border-slate-900/5 dark:border-white/5 text-slate-800 dark:text-slate-200"
                    >
                      <td className="py-2 pr-3 font-semibold">{row.subjectName}</td>
                      <td className="py-2 px-3">{row.chaptersCovered} / {row.chaptersTotal}</td>
                      <td className="py-2 px-3 font-semibold">{row.total}</td>
                      <td className="py-2 px-3">{row.pyqCount}</td>
                      <td className="py-2 px-3">{row.samplePaperCount}</td>
                      <td className="py-2 px-3">{row.curatedCount}</td>
                      <td className="py-2 pl-3">{row.generatedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Source-Wise Distribution */}
            <div>
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Source-Wise Breakdown (All 12 Reference Publishers &amp; Uploads)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs tabular-nums">
                {auditReport.sourceBreakdown.map((src) => (
                  <div
                    key={src.source}
                    className="p-2.5 glass-subcard flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-200">{src.source}</span>
                    <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {src.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing / Provisional Materials Disclosure */}
            <div className="p-4 rounded-2xl glass-subcard space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white">
                Copyright Compliance &amp; Unavailable Future Materials Notice
              </div>
              {auditReport.missingMaterialsNote.map((note, idx) => (
                <p key={idx}>• {note}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
