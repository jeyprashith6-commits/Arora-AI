import React, { useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileText,
  KeyRound,
  Play,
  Search,
  Square,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from '../data/curriculum';
import {
  getGuidesForSubject,
  getGuideQuestionsForSubject,
  LAST_6_YEARS_PYQ_ARCHIVE,
  PAPER_GENERATION_GUIDES,
  PYQ_LAST_6_YEARS,
} from '../data/pyqAndGuides';
import { getAllQuestions } from '../data/questionBank';
import { triggerHaptic } from '../engines/hapticsEngine';
import type {
  DiagramId,
  DifficultyLevel,
  QuestionItem,
  QuestionType,
  ReferenceBookName,
  SubjectId,
} from '../types/arora';
import { GlassBackButton } from './GlassBackButton';
import { ScientificDiagram } from './ScientificDiagram';

export type PyqWindowYear = (typeof PYQ_LAST_6_YEARS)[number];

export interface PyqLinkedSolution {
  solutionId: string;
  questionId: string;
  subjectId: SubjectId;
  year: PyqWindowYear;
  paperCode: string;
  verifiedAnswer: string;
  explanation: string;
  markingSchemeSteps: string[];
  diagramId?: DiagramId;
  sourceLabel: string;
}

export interface PyqPaperQuestionEntry {
  questionId: string;
  subjectId: SubjectId;
  year: PyqWindowYear;
  paperCode: string;
  chapterId: string;
  chapterTitle: string;
  topic: string;
  marks: 1 | 2 | 3 | 4 | 5;
  difficulty: DifficultyLevel;
  type: QuestionType;
  questionText: string;
  assertionText?: string;
  reasonText?: string;
  options?: string[];
  solutionId: string;
}

export interface SubjectYearPaperRecord {
  paperId: string;
  subjectId: SubjectId;
  subjectName: string;
  subjectCode: string;
  year: PyqWindowYear;
  paperCode: string;
  examTitle: string;
  maxMarks: number;
  durationMinutes: number;
  solutionPackRef: string;
  questions: PyqPaperQuestionEntry[];
}

export interface SubjectCategorizedPyqStore {
  papersBySubject: Record<SubjectId, Record<PyqWindowYear, SubjectYearPaperRecord>>;
  solutionsById: Record<string, PyqLinkedSolution>;
  questionToSolutionIndex: Record<string, string>;
}

function isWithinLast6Years(year: number | undefined): year is PyqWindowYear {
  return (
    typeof year === 'number' &&
    (PYQ_LAST_6_YEARS as readonly number[]).includes(year)
  );
}

/**
 * Dedicated normalized 6-year PYQ catalog categorized by subject,
 * keeping Past Year Question Papers and Linked Official Solutions decoupled
 * for dynamic retrieval by questionId or solutionId.
 */
export function buildSubjectPyqPaperStore(
  archiveQuestions: QuestionItem[],
  userQuestions: QuestionItem[] = [],
): SubjectCategorizedPyqStore {
  const solutionsById: Record<string, PyqLinkedSolution> = {};
  const questionToSolutionIndex: Record<string, string> = {};
  const papersBySubject = {} as Record<
    SubjectId,
    Record<PyqWindowYear, SubjectYearPaperRecord>
  >;

  const combinedPyqs = [
    ...archiveQuestions.filter((q) => q.isPreviousYear),
    ...userQuestions.filter((q) => q.isPreviousYear),
  ];

  for (const subject of CBSE_CLASS_12_CURRICULUM) {
    const yearMap = {} as Record<PyqWindowYear, SubjectYearPaperRecord>;

    for (const yr of PYQ_LAST_6_YEARS) {
      const seenQuestionIds = new Set<string>();
      const matchedItems = combinedPyqs.filter((q) => {
        if (q.subjectId !== subject.id) return false;
        const resolvedYr = q.pyqYear ?? q.year;
        if (!isWithinLast6Years(resolvedYr) || resolvedYr !== yr) return false;
        if (seenQuestionIds.has(q.id)) return false;
        seenQuestionIds.add(q.id);
        return true;
      });

      const defaultPaperCode =
        matchedItems[0]?.pyqPaperCode ?? `${subject.code}/1/1 · ${yr}`;
      const entries: PyqPaperQuestionEntry[] = [];

      for (const item of matchedItems) {
        const solutionId = `sol-${subject.id}-${yr}-${item.id}`;
        const paperCode = item.pyqPaperCode ?? defaultPaperCode;

        solutionsById[solutionId] = {
          solutionId,
          questionId: item.id,
          subjectId: subject.id,
          year: yr,
          paperCode,
          verifiedAnswer: item.correctAnswer,
          explanation: item.explanation,
          markingSchemeSteps:
            item.markingSchemeSteps && item.markingSchemeSteps.length > 0
              ? item.markingSchemeSteps
              : [`${item.marks}M: Verified conceptual answer & board value point.`],
          diagramId: item.diagramId,
          sourceLabel:
            item.sourceCategory === 'User-Provided'
              ? 'User-Provided PYQ Solution'
              : 'CBSE Official Marking Scheme',
        };
        questionToSolutionIndex[item.id] = solutionId;

        entries.push({
          questionId: item.id,
          subjectId: subject.id,
          year: yr,
          paperCode,
          chapterId: item.chapterId,
          chapterTitle: item.chapterTitle,
          topic: item.topic,
          marks: item.marks,
          difficulty: item.difficulty,
          type: item.type,
          questionText: item.questionText,
          assertionText: item.assertionText,
          reasonText: item.reasonText,
          options: item.options,
          solutionId,
        });
      }

      yearMap[yr] = {
        paperId: `paper-${subject.id}-${yr}`,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        year: yr,
        paperCode: defaultPaperCode,
        examTitle: `CBSE Class 12 ${subject.name} Board Paper (${yr})`,
        maxMarks: subject.theoryMarks,
        durationMinutes: 180,
        solutionPackRef: `MS-${subject.code}-${yr}`,
        questions: entries,
      };
    }

    papersBySubject[subject.id] = yearMap;
  }

  return {
    papersBySubject,
    solutionsById,
    questionToSolutionIndex,
  };
}

/**
 * Dynamically retrieves a linked PYQ solution record either by explicit solutionId
 * or via questionToSolutionIndex[questionId].
 */
export function retrieveDynamicPyqSolution(
  store: SubjectCategorizedPyqStore,
  key: string,
): PyqLinkedSolution | null {
  if (store.solutionsById[key]) {
    return store.solutionsById[key];
  }
  const mappedSolutionId = store.questionToSolutionIndex[key];
  if (mappedSolutionId && store.solutionsById[mappedSolutionId]) {
    return store.solutionsById[mappedSolutionId];
  }
  return null;
}

interface PyqAndGuidesZoneProps {
  selectedYear: number;
  userQuestions: QuestionItem[];
  selectedPaperGuides: ReferenceBookName[];
  onTogglePaperGuide: (guide: ReferenceBookName) => void;
  onSelectAllPaperGuides: () => void;
  onLaunchMockPaper: (opts: {
    subjectId: SubjectId;
    pyqOnly: boolean;
    allowedSources: ReferenceBookName[];
  }) => void;
  presetSubjectId?: SubjectId;
}

export const PyqAndGuidesZone: React.FC<PyqAndGuidesZoneProps> = ({
  selectedYear,
  userQuestions,
  selectedPaperGuides,
  onTogglePaperGuide,
  onSelectAllPaperGuides,
  onLaunchMockPaper,
  presetSubjectId,
}) => {
  const [subjectId, setSubjectId] = useState<SubjectId>(presetSubjectId || 'physics');
  const [zoneTab, setZoneTab] = useState<'pyq' | 'guides'>('pyq');
  const [pyqYearFilter, setPyqYearFilter] = useState<PyqWindowYear | 'all'>('all');
  const [marksFilter, setMarksFilter] = useState<'all' | number>('all');
  const [selectedGuideFilter, setSelectedGuideFilter] = useState<ReferenceBookName | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [retrievedSolutions, setRetrievedSolutions] = useState<
    Record<string, PyqLinkedSolution>
  >({});

  useEffect(() => {
    if (!presetSubjectId) return;
    setSubjectId(presetSubjectId);
    setZoneTab('pyq');
    setSelectedGuideFilter('all');
  }, [presetSubjectId]);

  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);

  const pyqStore = useMemo(
    () => buildSubjectPyqPaperStore(LAST_6_YEARS_PYQ_ARCHIVE, userQuestions),
    [userQuestions],
  );

  const subjectSixYearPapers = useMemo(() => {
    const byYear = pyqStore.papersBySubject[subjectId];
    return PYQ_LAST_6_YEARS.map((yr) => byYear[yr]);
  }, [pyqStore, subjectId]);

  const visibleYearPapers = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return subjectSixYearPapers
      .filter((paper) => pyqYearFilter === 'all' || paper.year === pyqYearFilter)
      .map((paper) => ({
        ...paper,
        questions: paper.questions.filter((q) => {
          if (marksFilter !== 'all' && q.marks !== marksFilter) return false;
          if (
            qLower &&
            !q.questionText.toLowerCase().includes(qLower) &&
            !q.topic.toLowerCase().includes(qLower) &&
            !q.chapterTitle.toLowerCase().includes(qLower) &&
            !q.paperCode.toLowerCase().includes(qLower)
          ) {
            return false;
          }
          return true;
        }),
      }))
      .filter((paper) => paper.questions.length > 0);
  }, [subjectSixYearPapers, pyqYearFilter, marksFilter, searchQuery]);

  const subjectGuides = useMemo(() => getGuidesForSubject(subjectId), [subjectId]);

  const allBankQuestions = useMemo(
    () => getAllQuestions(selectedYear, userQuestions),
    [selectedYear, userQuestions],
  );

  const guideQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return getGuideQuestionsForSubject(subjectId, selectedGuideFilter, allBankQuestions)
      .filter((q) => !q.id.startsWith('syn-'))
      .filter((q) => {
        if (marksFilter !== 'all' && q.marks !== marksFilter) return false;
        if (
          qLower &&
          !q.questionText.toLowerCase().includes(qLower) &&
          !q.topic.toLowerCase().includes(qLower) &&
          !q.sourceBook.toLowerCase().includes(qLower)
        ) {
          return false;
        }
        return true;
      });
  }, [subjectId, selectedGuideFilter, allBankQuestions, marksFilter, searchQuery]);

  const toggleDynamicPyqSolution = (entry: PyqPaperQuestionEntry) => {
    triggerHaptic('tap');
    const willOpen = !expandedIds[entry.questionId];
    if (willOpen) {
      const resolved = retrieveDynamicPyqSolution(pyqStore, entry.solutionId);
      if (resolved) {
        setRetrievedSolutions((prev) => ({
          ...prev,
          [entry.questionId]: resolved,
        }));
      }
    }
    setExpandedIds((prev) => ({ ...prev, [entry.questionId]: willOpen }));
  };

  const togglePaperAllSolutions = (paper: SubjectYearPaperRecord) => {
    triggerHaptic('tap');
    const allOpen = paper.questions.every((q) => Boolean(expandedIds[q.questionId]));
    if (allOpen) {
      setExpandedIds((prev) => {
        const next = { ...prev };
        for (const q of paper.questions) {
          next[q.questionId] = false;
        }
        return next;
      });
      return;
    }

    const newlyRetrieved: Record<string, PyqLinkedSolution> = {};
    const nextExpanded: Record<string, boolean> = {};
    for (const q of paper.questions) {
      const resolved = retrieveDynamicPyqSolution(pyqStore, q.solutionId);
      if (resolved) {
        newlyRetrieved[q.questionId] = resolved;
      }
      nextExpanded[q.questionId] = true;
    }
    setRetrievedSolutions((prev) => ({ ...prev, ...newlyRetrieved }));
    setExpandedIds((prev) => ({ ...prev, ...nextExpanded }));
  };

  const toggleGuideExpand = (key: string) => {
    triggerHaptic('tap');
    setExpandedIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-sky-600 dark:text-sky-400">
            Last 6 Years CBSE PYQs (2021–2026) · Complete Reference Guides for Paper Generation
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
            Subject PYQ Archive &amp; Paper Guides
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {zoneTab === 'guides' && (
            <GlassBackButton
              label="Back to 6-Yr PYQs"
              onClick={() => setZoneTab('pyq')}
            />
          )}
          {/* Apple Segmented Control: PYQs vs Guides */}
          <div className="apple-segmented">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setZoneTab('pyq');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
                zoneTab === 'pyq'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 6 Years PYQs (2021–2026)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setZoneTab('guides');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
                zoneTab === 'guides'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paper-Generation Guides ({PAPER_GENERATION_GUIDES.length})
            </button>
          </div>
        </div>
      </div>

      {/* Separate Subject Zone Selector */}
      <div className="holo-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white">
            Separate Subject Zone — {subject.name} (Code {subject.code})
          </span>
          <span className="tabular-nums">
            {subject.theoryMarks}M Theory · {subject.practicalMarks}M Practical · {subjectGuides.length} Subject Guides
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {CBSE_CLASS_12_CURRICULUM.map((sub) => {
            const active = sub.id === subjectId;
            const paperMap = pyqStore.papersBySubject[sub.id];
            const totalPyqCount = PYQ_LAST_6_YEARS.reduce(
              (acc, yr) => acc + (paperMap[yr]?.questions.length ?? 0),
              0,
            );
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setSubjectId(sub.id);
                  setSelectedGuideFilter('all');
                }}
                className={`px-3.5 py-2.5 text-left glass-press min-h-[46px] ${
                  active
                    ? 'rounded-2xl bg-sky-600 text-white border border-sky-500 shadow-sm shadow-sky-500/25 dark:bg-sky-500/25 dark:border-sky-400/50 dark:text-white'
                    : 'glass-subcard text-slate-700 dark:text-slate-300 hover:border-sky-400/40'
                }`}
              >
                <div className="text-xs font-semibold truncate">{sub.name}</div>
                <div
                  className={`text-[11px] tabular-nums ${
                    active ? 'text-sky-100 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  6-Yr Papers ({totalPyqCount}) · {getGuidesForSubject(sub.id).length} Guides
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-VIEW 1: LAST 6 YEARS PYQ PAPERS WITH DYNAMICALLY LINKED SOLUTIONS */}
      <AnimatePresence mode="wait" initial={false}>
      {zoneTab === 'pyq' && (
        <motion.div
          key="zone-pyq"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          {/* 6-Year Paper Catalog Index for Selected Subject */}
          <div className="holo-panel p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500" />
                {subject.name} 6-Year Question Paper Registry (Dynamic Solution Links)
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {Object.keys(pyqStore.solutionsById).length} Total Linked Solutions Indexed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {subjectSixYearPapers.map((paper) => {
                const isSelected = pyqYearFilter === paper.year;
                const linkedCount = paper.questions.filter((q) =>
                  Boolean(retrieveDynamicPyqSolution(pyqStore, q.solutionId)),
                ).length;
                return (
                  <button
                    key={paper.paperId}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setPyqYearFilter(isSelected ? 'all' : paper.year);
                    }}
                    className={`p-3 text-left glass-press min-h-[68px] ${
                      isSelected
                        ? 'rounded-2xl bg-sky-500/15 dark:bg-sky-500/22 border border-sky-400/60 shadow-xs text-slate-900 dark:text-white'
                        : 'glass-subcard text-slate-700 dark:text-slate-300 hover:border-sky-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
                      <span className="text-sky-600 dark:text-sky-400">{paper.year} Paper</span>
                      <span>{paper.maxMarks}M</span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {paper.paperCode}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {linkedCount}/{paper.questions.length} MS Linked
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="holo-panel p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {pyqYearFilter !== 'all' && (
                  <GlassBackButton
                    label="Back to All Years"
                    onClick={() => setPyqYearFilter('all')}
                  />
                )}
                <div className="apple-segmented">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setPyqYearFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors min-h-[36px] ${
                    pyqYearFilter === 'all'
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All 6 Years
                </button>
                {PYQ_LAST_6_YEARS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setPyqYearFilter(yr);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold tabular-nums transition-colors min-h-[36px] ${
                      pyqYearFilter === yr
                        ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('submit');
                  onLaunchMockPaper({
                    subjectId,
                    pyqOnly: true,
                    allowedSources: ['CBSE Official'],
                  });
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white glass-press shadow-sm shadow-sky-500/25 whitespace-nowrap min-h-[42px]"
              >
                <Play className="w-3.5 h-3.5" />
                Generate {subject.name} PYQ Mock Paper
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${subject.name} 2021–2026 PYQs by paper code, topic, or keyword...`}
                  className="w-full pl-9 pr-3 py-2.5 glass-input text-xs text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={marksFilter}
                onChange={(e) => setMarksFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                aria-label="Filter PYQs by marks"
                className="px-3 py-2.5 glass-input text-xs text-slate-900 dark:text-white"
              >
                <option value="all">All Marks (1–5M)</option>
                {[1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    {m} Mark{m > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paper Sections Grouped by Year */}
          <div className="space-y-4">
            {visibleYearPapers.map((paper) => {
              const allPaperExpanded = paper.questions.every((q) => Boolean(expandedIds[q.questionId]));
              return (
                <div key={paper.paperId} className="space-y-3">
                  {/* Year Paper Banner */}
                  <div className="holo-panel px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {paper.examTitle}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{paper.paperCode}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{paper.maxMarks} Marks · {paper.durationMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-sky-600 dark:text-sky-400">{paper.solutionPackRef}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePaperAllSolutions(paper)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-semibold border-sky-500/35 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15 whitespace-nowrap min-h-[38px]"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {allPaperExpanded ? 'Hide Paper Solutions' : 'Retrieve Paper Solutions'}
                    </button>
                  </div>

                  {/* Linked Questions inside This Year's Paper */}
                  {paper.questions.map((entry) => {
                    const isOpen = Boolean(expandedIds[entry.questionId]);
                    const linkedSolution = isOpen
                      ? retrievedSolutions[entry.questionId] ??
                        retrieveDynamicPyqSolution(pyqStore, entry.solutionId)
                      : null;

                    return (
                      <article key={entry.questionId} className="holo-panel p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                              CBSE Board {entry.year}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {entry.paperCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {entry.chapterTitle}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                              {entry.marks} Mark{entry.marks > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400">
                            {entry.type} · {entry.difficulty}
                          </span>
                        </div>

                        <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                          {entry.questionText}
                        </p>

                        {entry.assertionText && entry.reasonText && (
                          <div className="p-3.5 glass-subcard text-xs sm:text-sm space-y-1 text-slate-700 dark:text-slate-200">
                            <p>{entry.assertionText}</p>
                            <p>{entry.reasonText}</p>
                          </div>
                        )}

                        {entry.options && entry.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                            {entry.options.map((opt, idx) => (
                              <div
                                key={idx}
                                className="px-3.5 py-2.5 glass-subcard text-slate-800 dark:text-slate-200"
                              >
                                <span className="font-mono text-sky-600 dark:text-sky-400 mr-2">
                                  ({String.fromCharCode(65 + idx)})
                                </span>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        {isOpen && linkedSolution?.diagramId && (
                          <ScientificDiagram diagramId={linkedSolution.diagramId} />
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Topic: {entry.topic} · Link ID:{' '}
                            <span className="font-mono">{entry.solutionId}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleDynamicPyqSolution(entry)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline min-h-[38px]"
                          >
                            {isOpen
                              ? 'Hide Linked Solution'
                              : 'Retrieve Official Solution & Marking Scheme'}
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {isOpen && linkedSolution && (
                          <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-400/35 holo-blur space-y-2.5 text-xs sm:text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                                Verified Answer: {linkedSolution.verifiedAnswer}
                              </span>
                              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                                {linkedSolution.sourceLabel} · {linkedSolution.solutionId}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                              {linkedSolution.explanation}
                            </p>
                            {linkedSolution.markingSchemeSteps.length > 0 && (
                              <div className="pt-2 border-t border-emerald-400/25 space-y-1">
                                <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                                  CBSE Stepwise Marking Scheme:
                                </div>
                                {linkedSolution.markingSchemeSteps.map((step, i) => (
                                  <div
                                    key={i}
                                    className="text-xs text-slate-700 dark:text-slate-300 tabular-nums"
                                  >
                                    • {step}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              );
            })}

            {visibleYearPapers.length === 0 && (
              <div className="holo-panel p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No {subject.name} PYQs match that year/mark filter. Try &ldquo;All 6 Years&rdquo; or reset search.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* SUB-VIEW 2: ALL REFERENCE GUIDES USED FOR PAPER GENERATION */}
      {zoneTab === 'guides' && (
        <motion.div
          key="zone-guides"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          <div className="holo-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-sky-500" />
                  Reference Guides Active for {subject.name} Paper Generation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Toggle which reference books &amp; board sources feed into Mock Test Paper Generation.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onSelectAllPaperGuides();
                  }}
                  className="px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-sky-400/50 min-h-[40px]"
                >
                  Enable All 11 Guides
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('submit');
                    onLaunchMockPaper({
                      subjectId,
                      pyqOnly: false,
                      allowedSources: selectedPaperGuides,
                    });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white glass-press shadow-sm shadow-sky-500/25 min-h-[40px]"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Generate {subject.name} Paper ({selectedPaperGuides.length} Guides)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjectGuides.map((guide) => {
                const included = selectedPaperGuides.includes(guide.id);
                return (
                  <div
                    key={guide.id}
                    className={`p-4 flex flex-col justify-between gap-3 glass-press ${
                      included
                        ? 'rounded-2xl bg-sky-500/12 dark:bg-sky-500/14 border border-sky-400/50 holo-blur shadow-xs'
                        : 'glass-subcard opacity-80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {guide.title}
                        </div>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={included}
                          onClick={() => {
                            triggerHaptic('checkbox');
                            onTogglePaperGuide(guide.id);
                          }}
                          className="p-1 text-sky-600 dark:text-sky-400 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label={`Include ${guide.id} in paper generation`}
                        >
                          {included ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {guide.publisher} · {guide.weightageStrength}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                        {guide.paperRole}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {guide.questionTypesCovered.slice(0, 3).join(' · ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setSelectedGuideFilter(selectedGuideFilter === guide.id ? 'all' : guide.id);
                        }}
                        className="font-semibold text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap"
                      >
                        {selectedGuideFilter === guide.id ? 'Show All' : 'Preview Items'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guide Questions with Solutions inside the Subject Zone */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedGuideFilter !== 'all' && (
                  <GlassBackButton
                    label="Back to All Guides"
                    onClick={() => setSelectedGuideFilter('all')}
                  />
                )}
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Solved Reference Guide Questions — {subject.name}
                  {selectedGuideFilter !== 'all' ? ` (${selectedGuideFilter})` : ''}
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Showing {guideQuestions.length} verified items
              </span>
            </div>

            {guideQuestions.map((q) => {
              const isOpen = Boolean(expandedIds[`g-${q.id}`]);
              return (
                <article key={q.id} className="holo-panel p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-violet-600 dark:text-violet-300">
                        {q.sourceBook}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{q.sourceCategory}</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.chapterTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                        {q.marks} Mark{q.marks > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span>
                      {q.type} · {q.difficulty}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                    {q.questionText}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Topic: {q.topic}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleGuideExpand(`g-${q.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline min-h-[38px]"
                    >
                      {isOpen ? 'Hide Guide Solution' : 'View Solution & Steps'}
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-400/35 holo-blur space-y-2 text-xs sm:text-sm">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Answer: {q.correctAnswer}
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
};
