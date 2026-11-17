import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FlaskConical,
  Globe,
  Loader2,
  Lock,
  PenTool,
  Plus,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from '../data/curriculum';
import { createAcademicYearRecord } from '../data/academicYears';
import type {
  AcademicYearRecord,
  ChapterContent,
  GeneratedDiagramSpec,
  LanguageMode,
  QuestionItem,
  SubjectId,
} from '../types/arora';
import { triggerHaptic } from '../engines/hapticsEngine';
import { speakAroraText } from '../engines/voiceEngine';
import { GeneratedDiagramCard } from './GeneratedDiagramCard';
import { GlassBackButton } from './GlassBackButton';
import { RichMessageRenderer } from './RichMessageRenderer';
import { ScientificDiagram } from './ScientificDiagram';

interface CurriculumHubProps {
  academicYears: AcademicYearRecord[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
  onAddFutureYear: (record: AcademicYearRecord) => void;
  onAddUserQuestion: (q: QuestionItem) => void;
  completedTopics: string[];
  onToggleTopicComplete: (topicKey: string) => void;
  language: LanguageMode;
  presetSubjectId?: SubjectId;
}

export const CurriculumHub: React.FC<CurriculumHubProps> = ({
  academicYears,
  selectedYear,
  onSelectYear,
  onAddFutureYear,
  onAddUserQuestion,
  completedTopics,
  onToggleTopicComplete,
  language,
  presetSubjectId,
}) => {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'year_library' | 'add_material'>('syllabus');
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>(presetSubjectId || 'physics');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(() => {
    const initialSub = getSubjectById(presetSubjectId || 'physics');
    return initialSub.chapters[0]?.id || 'phy-ch1';
  });
  const [chapterSearch, setChapterSearch] = useState('');
  const [customYearInput, setCustomYearInput] = useState('2033');
  const [showSubjectBlueprint, setShowSubjectBlueprint] = useState(true);
  const [onlineEnrichCache, setOnlineEnrichCache] = useState<
    Record<
      string,
      {
        content: string;
        sources: { title: string; uri: string }[];
        enrichedAt: string;
      }
    >
  >({});
  const [onlineLoadingKey, setOnlineLoadingKey] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [chapterDiagrams, setChapterDiagrams] = useState<Record<string, GeneratedDiagramSpec>>({});
  const [diagramTopicInput, setDiagramTopicInput] = useState('');
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState<string | null>(null);

  // User-Provided Material form
  const [userQuestionText, setUserQuestionText] = useState('');
  const [userAnswerText, setUserAnswerText] = useState('');
  const [userExplanation, setUserExplanation] = useState('');
  const [userMarks, setUserMarks] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [userSaveStatus, setUserSaveStatus] = useState<string | null>(null);

  const subject = useMemo(() => getSubjectById(selectedSubjectId), [selectedSubjectId]);

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return subject.chapters;
    return subject.chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.topics.some((t) => t.toLowerCase().includes(q)) ||
        c.unit.toLowerCase().includes(q),
    );
  }, [subject, chapterSearch]);

  const activeChapter: ChapterContent = useMemo(() => {
    return (
      subject.chapters.find((c) => c.id === selectedChapterId) || subject.chapters[0]
    );
  }, [subject, selectedChapterId]);

  const activeYearRecord = useMemo(
    () => academicYears.find((y) => y.year === selectedYear) || academicYears[0],
    [academicYears, selectedYear],
  );

  const handleSelectSubject = (id: SubjectId) => {
    setSelectedSubjectId(id);
    const sub = getSubjectById(id);
    setSelectedChapterId(sub.chapters[0].id);
    setOnlineError(null);
  };

  useEffect(() => {
    if (!presetSubjectId) return;
    setActiveTab('syllabus');
    setSelectedSubjectId(presetSubjectId);
    const sub = getSubjectById(presetSubjectId);
    setSelectedChapterId(sub.chapters[0].id);
    setOnlineError(null);
  }, [presetSubjectId]);

  const subjectCacheKey = `${selectedSubjectId}:subject:${selectedYear}`;
  const chapterCacheKey = `${selectedSubjectId}:${activeChapter.id}:${selectedYear}`;
  const activeSubjectEnrichment = onlineEnrichCache[subjectCacheKey];
  const activeChapterEnrichment = onlineEnrichCache[chapterCacheKey];

  const handleFetchOnlinePortion = async (scope: 'subject' | 'chapter') => {
    const key = scope === 'subject' ? subjectCacheKey : chapterCacheKey;
    triggerHaptic('tap');
    setOnlineError(null);
    setOnlineLoadingKey(key);
    try {
      const res = await fetch('/api/ai/syllabus-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subject.name,
          subjectCode: subject.code,
          year: selectedYear,
          chapterTitle: scope === 'chapter' ? activeChapter.title : undefined,
          unit: scope === 'chapter' ? activeChapter.unit : undefined,
          language,
        }),
      });
      const data = (await res.json()) as {
        content?: string;
        sources?: { title: string; uri: string }[];
        enrichedAt?: string;
        error?: string;
      };
      if (!res.ok || !data.content) {
        throw new Error(data.error || 'Unable to fetch online syllabus right now.');
      }
      setOnlineEnrichCache((prev) => ({
        ...prev,
        [key]: {
          content: data.content!,
          sources: Array.isArray(data.sources) ? data.sources : [],
          enrichedAt: data.enrichedAt || new Date().toISOString(),
        },
      }));
      triggerHaptic('success');
    } catch (err) {
      setOnlineError(
        err instanceof Error
          ? err.message
          : 'Online syllabus lookup is temporarily unavailable.',
      );
    } finally {
      setOnlineLoadingKey((prev) => (prev === key ? null : prev));
    }
  };

  const activeChapterDiagram = chapterDiagrams[chapterCacheKey];

  const handleGenerateChapterDiagram = async (topicOverride?: string) => {
    const chosenTopic = (
      topicOverride ||
      diagramTopicInput.trim() ||
      activeChapter.topics[0] ||
      activeChapter.title
    ).slice(0, 180);
    if (!chosenTopic || diagramLoading) return;
    triggerHaptic('tap');
    setDiagramError(null);
    setDiagramLoading(true);
    try {
      const res = await fetch('/api/ai/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: chosenTopic,
          subjectHint: `${subject.name} · Ch ${activeChapter.number}: ${activeChapter.title}`,
          additionalContext: `Chapter topics: ${activeChapter.topics.slice(0, 6).join(', ')}`,
          language,
        }),
      });
      const data = (await res.json()) as GeneratedDiagramSpec & { error?: string };
      if (!res.ok || !data.svgMarkup) {
        throw new Error(data.error || 'Could not generate diagram for this topic.');
      }
      setChapterDiagrams((prev) => ({
        ...prev,
        [chapterCacheKey]: data,
      }));
      triggerHaptic('success');
    } catch (err) {
      setDiagramError(
        err instanceof Error
          ? err.message
          : 'Diagram synthesizer is temporarily unavailable.',
      );
    } finally {
      setDiagramLoading(false);
    }
  };

  const handleGenerateFutureYear = () => {
    const parsed = Number(customYearInput);
    if (!Number.isInteger(parsed) || parsed < 2026 || parsed > 2050) return;
    if (academicYears.some((y) => y.year === parsed)) {
      onSelectYear(parsed);
      return;
    }
    const created = createAcademicYearRecord(parsed);
    onAddFutureYear(created);
    onSelectYear(parsed);
  };

  const handleSaveUserMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestionText.trim() || !userAnswerText.trim()) return;
    const item: QuestionItem = {
      id: `usr-${Date.now()}`,
      year: selectedYear,
      subjectId: selectedSubjectId,
      chapterId: activeChapter.id,
      chapterTitle: activeChapter.title,
      topic: activeChapter.topics[0] || activeChapter.title,
      marks: userMarks,
      difficulty: 'Moderate',
      type: userMarks === 1 ? '1-Mark' : userMarks === 4 ? '4-Mark Case Study' : (`${userMarks}-Mark` as QuestionItem['type']),
      sourceBook: 'User-Provided',
      sourceCategory: 'User-Provided',
      isPreviousYear: false,
      questionText: userQuestionText.trim(),
      correctAnswer: userAnswerText.trim(),
      explanation:
        userExplanation.trim() ||
        'Added by student to personal local study library.',
    };
    onAddUserQuestion(item);
    triggerHaptic('success');
    setUserQuestionText('');
    setUserAnswerText('');
    setUserExplanation('');
    setUserSaveStatus('Saved locally into your Question Bank under "User-Provided".');
    setTimeout(() => setUserSaveStatus(null), 4000);
  };

  return (
    <section className="space-y-6">
      {/* Section Header & Workspace Mode Switch */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
            CBSE Class 12 Curriculum · Academic Session {activeYearRecord.sessionLabel}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
            Curriculum & Year-Wise Academic Library
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== 'syllabus' && (
            <GlassBackButton
              label="Back to Syllabus"
              onClick={() => setActiveTab('syllabus')}
            />
          )}
          <div className="apple-segmented">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('syllabus');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl glass-press whitespace-nowrap min-h-[40px] ${
                activeTab === 'syllabus'
                  ? 'bg-white/95 dark:bg-white/[0.16] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              NCERT Class 12 Syllabus
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('year_library');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl glass-press whitespace-nowrap min-h-[40px] ${
                activeTab === 'year_library'
                  ? 'bg-white/95 dark:bg-white/[0.16] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Year Library (2027–2032+)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('add_material');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl glass-press whitespace-nowrap min-h-[40px] ${
                activeTab === 'add_material'
                  ? 'bg-white/95 dark:bg-white/[0.16] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Add User Material
            </button>
          </div>
        </div>
      </div>

      {/* Year Selector Strip */}
      <div className="holo-panel p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 mr-1">
            Academic Year:
          </span>
          {academicYears.map((yr) => (
            <button
              key={yr.year}
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onSelectYear(yr.year);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium tabular-nums glass-press min-h-[36px] whitespace-nowrap border ${
                yr.year === selectedYear
                  ? 'bg-sky-600 text-white border-sky-400/50 shadow-sm dark:bg-sky-500/80 dark:text-white font-semibold'
                  : 'bg-white/55 dark:bg-white/[0.06] border-white/70 dark:border-white/[0.10] text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/[0.12]'
              }`}
            >
              {yr.year}
              {yr.detectedAutomatically ? ' (Active)' : yr.isImmutableArchive ? ' (Archive)' : ''}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min={2026}
            max={2050}
            value={customYearInput}
            onChange={(e) => setCustomYearInput(e.target.value)}
            aria-label="Future academic year"
            className="w-20 px-2.5 py-1.5 text-xs font-mono glass-input text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleGenerateFutureYear}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 glass-press whitespace-nowrap min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Future Year
          </button>
        </div>
      </div>

      {/* TAB 1: NCERT SYLLABUS EXPLORER */}
      {activeTab === 'syllabus' && (
        <div className="space-y-5">
          {/* 6 Subject Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {CBSE_CLASS_12_CURRICULUM.map((sub) => {
              const active = sub.id === selectedSubjectId;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    handleSelectSubject(sub.id);
                  }}
                  className={`text-left p-3.5 rounded-2xl border glass-press min-h-[72px] ${
                    active
                      ? 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-400/60 text-slate-900 dark:text-white shadow-[0_8px_24px_-12px_rgba(14,165,233,0.4)]'
                      : 'glass-subcard text-slate-700 dark:text-slate-300 hover:border-sky-400/40'
                  }`}
                >
                  <div className="text-sm font-semibold truncate">{sub.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Code {sub.code} · {sub.chapters.length} Ch · {sub.theoryMarks}M
                  </div>
                </button>
              );
            })}
          </div>

          {/* 100% Subject Portion Overview, Weightage Blueprint, Practicals & Trusted Online Websites */}
          <div className="holo-panel p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-sky-600 dark:text-sky-400">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    100% Full Subject Portion · {subject.name} (Code {subject.code}) · {subject.theoryMarks}M Theory + {subject.practicalMarks}M Practical/IA
                  </span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {subject.fullSyllabusOverview || subject.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFetchOnlinePortion('subject')}
                  disabled={onlineLoadingKey === subjectCacheKey}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white glass-press min-h-[40px] whitespace-nowrap"
                >
                  {onlineLoadingKey === subjectCacheKey ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {onlineLoadingKey === subjectCacheKey
                    ? 'Syncing Multi-Site Portion...'
                    : 'Sync 100% Online Portion'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubjectBlueprint((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium glass-subcard text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-300 glass-press min-h-[40px] whitespace-nowrap"
                >
                  {showSubjectBlueprint ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Blueprint & Sites
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show Blueprint & Sites
                    </>
                  )}
                </button>
              </div>
            </div>

            {onlineError && (
              <div className="p-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
                {onlineError}
              </div>
            )}

            {showSubjectBlueprint && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 pt-2 border-t border-slate-900/10 dark:border-white/10">
                {/* Unit-wise Marks Weightage & Practicals */}
                <div className="xl:col-span-7 space-y-4">
                  {subject.unitWiseWeightage && subject.unitWiseWeightage.length > 0 && (
                    <div className="p-4 glass-subcard space-y-2.5">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        Official Unit-Wise Marks Blueprint ({subject.theoryMarks} Marks Theory)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-900/10 dark:border-white/10 text-slate-500 dark:text-slate-400">
                              <th className="py-2 pr-3 font-medium">Unit / Section</th>
                              <th className="py-2 px-3 font-medium">Included Chapters & Topics</th>
                              <th className="py-2 pl-3 font-medium text-right">Marks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/5 dark:divide-white/[0.06]">
                            {subject.unitWiseWeightage.map((u) => (
                              <tr key={u.unit}>
                                <td className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {u.unit}
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                  {u.chapters}
                                </td>
                                <td className="py-2 pl-3 text-right font-semibold tabular-nums text-sky-600 dark:text-sky-400">
                                  {u.marks}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {subject.practicals.length > 0 && (
                    <div className="p-4 glass-subcard space-y-2">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        <FlaskConical className="w-4 h-4 text-sky-500" />
                        <span>
                          Complete Practical / Internal Assessment Portion ({subject.practicalMarks} Marks)
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {subject.practicals.map((p, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {idx + 1}. {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Verified Multi-Website Study Portals */}
                {subject.trustedWebResources && subject.trustedWebResources.length > 0 && (
                  <div className="xl:col-span-5 p-4 glass-subcard space-y-3">
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        Explore Official & Educational Websites
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Direct verified study portals for complete PDFs, NCERT solutions, and interactive lessons.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {subject.trustedWebResources.map((site) => (
                        <a
                          key={site.url + site.title}
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-2xl border border-white/60 dark:border-white/[0.08] bg-white/45 dark:bg-white/[0.04] hover:border-sky-400/60 hover:bg-white/75 dark:hover:bg-white/[0.09] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {site.title}
                              </div>
                              <div className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                {site.domain} · {site.focus}
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                            {site.summary}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Online Subject Guide Output (from /api/ai/syllabus-enrich) */}
            {activeSubjectEnrichment && (
              <div className="p-4 rounded-2xl border border-sky-400/35 bg-sky-500/[0.07] dark:bg-sky-950/25 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <Globe className="w-4 h-4" />
                    <span>
                      Live Multi-Website Online Syllabus Synthesis · {subject.name} ({selectedYear})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Synced live
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  <RichMessageRenderer
                    content={activeSubjectEnrichment.content}
                    msgId={`sub-enrich-${subjectCacheKey}`}
                  />
                </div>
                {activeSubjectEnrichment.sources.length > 0 && (
                  <div className="pt-2.5 border-t border-sky-500/20 flex flex-wrap gap-2">
                    {activeSubjectEnrichment.sources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs glass-subcard text-sky-700 dark:text-sky-300 hover:border-sky-400/60"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[220px]">{src.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2-Column Split: Chapter List + Deep Chapter Reader */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Chapter Navigation */}
            <aside className="lg:col-span-4 holo-panel p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder={`Search ${subject.name} chapters or topics...`}
                  className="w-full pl-9 pr-3 py-2 text-xs glass-input text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
                {filteredChapters.map((ch) => {
                  const isSelected = ch.id === activeChapter.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setSelectedChapterId(ch.id);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border glass-press flex items-start justify-between gap-2 min-h-[52px] ${
                        isSelected
                          ? 'bg-sky-500/14 dark:bg-sky-500/18 border-sky-400/50 text-slate-900 dark:text-white'
                          : 'border-transparent hover:bg-white/55 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          Chapter {ch.number} · {ch.weightageMarks} Marks
                        </div>
                        <div className="text-sm font-medium leading-snug mt-0.5">
                          {ch.title}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 mt-1 text-slate-400" />
                    </button>
                  );
                })}
              </div>

              {subject.deletedChapters.length > 0 && (
                <div className="pt-3 border-t border-slate-900/10 dark:border-white/10">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                    Excluded / Deleted Chapters ({selectedYear})
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {subject.deletedChapters.map((d) => (
                      <li key={d.title}>
                        <span className="line-through text-slate-500">{d.title}</span> — {d.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            {/* Chapter Content Reader */}
            <div className="lg:col-span-8 holo-panel p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-900/10 dark:border-white/10">
                <div>
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                    {subject.name} · {activeChapter.unit} · {activeChapter.weightageMarks} Marks
                  </div>
                  <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                    Chapter {activeChapter.number}: {activeChapter.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Reference Coverage: {activeChapter.referenceCoverage.join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFetchOnlinePortion('chapter')}
                    disabled={onlineLoadingKey === chapterCacheKey}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white glass-press whitespace-nowrap min-h-[40px]"
                  >
                    {onlineLoadingKey === chapterCacheKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    {onlineLoadingKey === chapterCacheKey
                      ? 'Fetching Web Notes...'
                      : 'Fetch Web Chapter Guide'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      speakAroraText(
                        `${subject.name}, Chapter ${activeChapter.number}: ${activeChapter.title}. ${activeChapter.concepts.join(' ')}`,
                        language,
                        undefined,
                        { preferNeural: true },
                      )
                    }
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium glass-subcard text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-300 glass-press whitespace-nowrap min-h-[40px]"
                  >
                    <Volume2 className="w-4 h-4" />
                    Listen Summary
                  </button>
                </div>
              </div>

              {/* Current Topics vs Deleted Topics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 glass-subcard">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                    Current Verified Topics (Tap to Track Mastery)
                  </h3>
                  <ul className="space-y-2">
                    {activeChapter.topics.map((topic) => {
                      const key = `${activeChapter.id}:${topic}`;
                      const done = completedTopics.includes(key);
                      return (
                        <li key={topic}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={done}
                            onClick={() => {
                              triggerHaptic(done ? 'tap' : 'checkbox');
                              onToggleTopicComplete(key);
                            }}
                            className="w-full text-left flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:text-cyan-500 transition-colors py-1"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                done ? 'text-emerald-500' : 'text-slate-400'
                              }`}
                            />
                            <span className={done ? 'line-through text-slate-400' : ''}>{topic}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {activeChapter.subtopics.length > 0 && (
                    <p className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      Subtopics: {activeChapter.subtopics.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-400/35 dark:border-amber-500/25 holo-blur">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                    Deleted / Excluded Topics ({selectedYear})
                  </h3>
                  <ul className="space-y-1.5 text-xs text-amber-900/85 dark:text-amber-200/85">
                    {activeChapter.deletedTopics.map((dt) => (
                      <li key={dt} className="flex items-start gap-2">
                        <span className="font-mono text-amber-600 dark:text-amber-400">×</span>
                        <span>{dt}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-3 border-t border-amber-500/25">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Learning Outcomes
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {activeChapter.learningOutcomes.map((lo) => (
                        <li key={lo}>• {lo}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Complete Chapter Notes & Board Exam Strategy */}
              {((activeChapter.detailedNotes && activeChapter.detailedNotes.length > 0) ||
                (activeChapter.boardExamTips && activeChapter.boardExamTips.length > 0) ||
                activeChapter.concepts.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 glass-subcard space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Core Concepts & Full Portion Notes
                    </h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeChapter.concepts.map((c, idx) => (
                        <li key={`concept-${idx}`}>• {c}</li>
                      ))}
                      {(activeChapter.detailedNotes ?? []).map((note, idx) => (
                        <li key={`note-${idx}`}>• {note}</li>
                      ))}
                    </ul>
                  </div>

                  {activeChapter.boardExamTips && activeChapter.boardExamTips.length > 0 && (
                    <div className="p-4 glass-subcard space-y-2 border-emerald-400/30">
                      <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        CBSE Board Exam Scoring Tips
                      </h3>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeChapter.boardExamTips.map((tip, idx) => (
                          <li key={`tip-${idx}`}>✓ {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Live Online Multi-Website Chapter Deep Study Guide */}
              {activeChapterEnrichment && (
                <div className="p-4 rounded-2xl border border-sky-400/35 bg-sky-500/[0.07] dark:bg-sky-950/25 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
                      <Globe className="w-4 h-4" />
                      <span>
                        Live Online Multi-Website Guide · {activeChapter.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Web Grounded
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    <RichMessageRenderer
                      content={activeChapterEnrichment.content}
                      msgId={`ch-enrich-${chapterCacheKey}`}
                    />
                  </div>
                  {activeChapterEnrichment.sources.length > 0 && (
                    <div className="pt-2.5 border-t border-sky-500/20 flex flex-wrap gap-2">
                      {activeChapterEnrichment.sources.map((src) => (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs glass-subcard text-sky-700 dark:text-sky-300 hover:border-sky-400/60"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[220px]">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Scientific Diagram (when applicable) */}
              {activeChapter.diagramId && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Interactive Concept Visualization
                  </h3>
                  <ScientificDiagram
                    diagramId={activeChapter.diagramId}
                    caption={activeChapter.diagramCaption}
                  />
                </div>
              )}

              {/* Precision AI Topic Diagram Generator */}
              <div className="p-4 glass-subcard space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-cyan-500" />
                      AI Topic Diagram Generator ({activeChapter.title})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Generate a crystal-clear, NCERT-labelled vector diagram for any topic in this chapter.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleGenerateChapterDiagram();
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    value={diagramTopicInput}
                    onChange={(e) => setDiagramTopicInput(e.target.value)}
                    placeholder={`Topic to draw (default: ${activeChapter.topics[0] || activeChapter.title})`}
                    className="flex-1 px-3 py-2 text-xs glass-input text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={diagramLoading}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-55 text-white glass-press whitespace-nowrap"
                  >
                    {diagramLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PenTool className="w-3.5 h-3.5" />
                    )}
                    {diagramLoading ? 'Drawing Diagram...' : 'Generate Diagram'}
                  </button>
                </form>

                {activeChapter.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeChapter.topics.slice(0, 6).map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={diagramLoading}
                        onClick={() => {
                          setDiagramTopicInput(t);
                          void handleGenerateChapterDiagram(t);
                        }}
                        className="px-2.5 py-1 rounded-xl text-[11px] glass-subcard text-slate-700 dark:text-slate-200 hover:border-cyan-400/60 hover:text-cyan-600 dark:hover:text-cyan-300 glass-press disabled:opacity-50"
                      >
                        Draw: {t}
                      </button>
                    ))}
                  </div>
                )}

                {diagramError && (
                  <div className="p-2.5 rounded-xl bg-amber-500/12 border border-amber-400/35 text-xs text-amber-800 dark:text-amber-200">
                    {diagramError}
                  </div>
                )}

                {activeChapterDiagram && (
                  <GeneratedDiagramCard
                    diagram={activeChapterDiagram}
                    onRegenerate={() =>
                      void handleGenerateChapterDiagram(activeChapterDiagram.topic)
                    }
                    isRegenerating={diagramLoading}
                  />
                )}
              </div>

              {/* Definitions & Formulas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChapter.definitions.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Definitions & Principles
                    </h3>
                    {activeChapter.definitions.map((d) => (
                      <div key={d.term} className="p-3.5 glass-subcard">
                        <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                          {d.term}
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {d.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeChapter.formulas.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Verified Formulas & Relations
                    </h3>
                    {activeChapter.formulas.map((f) => (
                      <div key={f.name} className="p-3.5 glass-subcard">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{f.name}</span>
                          {f.units && <span className="font-mono">{f.units}</span>}
                        </div>
                        <div className="mt-1 font-mono text-sm text-violet-700 dark:text-violet-300">
                          {f.expression}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Derivations */}
              {activeChapter.derivations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Step-by-Step Board Derivations
                  </h3>
                  {activeChapter.derivations.map((der) => (
                    <div key={der.title} className="p-4 glass-subcard">
                      <div className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                        {der.title}
                      </div>
                      <ol className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                        {der.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}

              {/* Solved Examples & Exercises */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChapter.solvedExamples.length > 0 && (
                  <div className="p-4 glass-subcard space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Solved NCERT Example
                    </h3>
                    {activeChapter.solvedExamples.map((ex, i) => (
                      <div key={i} className="space-y-2 text-xs sm:text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{ex.problem}</p>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                          {ex.solutionSteps.map((s, j) => (
                            <li key={j}>• {s}</li>
                          ))}
                        </ul>
                        <div className="font-mono text-xs text-emerald-700 dark:text-emerald-300">
                          Final Answer: {ex.finalAnswer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 glass-subcard space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Practice Exercises & Practicals
                  </h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    {activeChapter.exercises.map((ex, i) => (
                      <li key={i}>{i + 1}. {ex}</li>
                    ))}
                  </ul>
                  {activeChapter.practicalMaterial && (
                    <div className="mt-3 pt-2.5 border-t border-slate-900/10 dark:border-white/10 flex items-start gap-2 text-xs text-sky-700 dark:text-sky-300">
                      <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Practical Link: {activeChapter.practicalMaterial}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: YEAR-WISE ACADEMIC LIBRARY */}
      {activeTab === 'year_library' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 holo-panel p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  {activeYearRecord.isImmutableArchive ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Immutable Historical Archive · Session {activeYearRecord.sessionLabel}</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" />
                      <span>Academic Session {activeYearRecord.sessionLabel}</span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                  CBSE Board Examination Blueprint {activeYearRecord.year}
                </h2>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {activeYearRecord.status === 'current_verified'
                  ? 'Verified Current'
                  : activeYearRecord.status === 'archived_verified'
                    ? 'Verified Archive'
                    : activeYearRecord.status === 'future_provisional'
                      ? 'Provisional'
                      : 'Pending CBSE Publication'}
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {activeYearRecord.officialSourceNote}
            </p>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                Subject-Wise Marks Distribution ({activeYearRecord.year})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-medium">Subject</th>
                      <th className="py-2 px-3 font-medium text-right">Theory</th>
                      <th className="py-2 px-3 font-medium text-right">Practical / IA</th>
                      <th className="py-2 pl-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 tabular-nums">
                    {activeYearRecord.marksDistribution.map((row) => (
                      <tr key={row.subjectId}>
                        <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">
                          {row.subjectName}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                          {row.theoryMarks}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                          {row.practicalOrInternalMarks}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                          {row.totalMarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                Standard Question Paper Section Pattern (70M Blueprint)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-medium">Section</th>
                      <th className="py-2 px-3 font-medium">Question Types</th>
                      <th className="py-2 px-3 font-medium text-right">Qs</th>
                      <th className="py-2 pl-3 font-medium text-right">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 tabular-nums">
                    {activeYearRecord.examPattern.map((sec) => (
                      <tr key={sec.section}>
                        <td className="py-2 pr-3 font-medium text-slate-900 dark:text-white">
                          {sec.section}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {sec.questionTypes}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                          {sec.count} × {sec.marksEach}
                        </td>
                        <td className="py-2 pl-3 text-right font-semibold text-violet-600 dark:text-violet-400">
                          {sec.totalMarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="holo-panel p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Sample Papers, Marking Scheme & PYQ Archive
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeYearRecord.samplePaperSummary}
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Marking Scheme Highlights
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {activeYearRecord.markingSchemeHighlights.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Previous-Year Materials
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {activeYearRecord.previousYearMaterialsNote}
                </p>
              </div>
            </div>

            <div className="holo-panel p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Newly Emphasized vs Deleted Topics ({activeYearRecord.year})
              </h3>
              <div className="space-y-2.5 text-xs">
                {activeYearRecord.newlyIntroducedTopics.map((item) => (
                  <div key={item.subjectId}>
                    <span className="font-semibold capitalize text-cyan-700 dark:text-cyan-300">
                      {item.subjectId.replace('_', ' ')}:
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.items.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER-PROVIDED EDUCATIONAL MATERIAL */}
      {activeTab === 'add_material' && (
        <div className="holo-panel p-5 sm:p-6 max-w-3xl space-y-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Your Own Notes or Reference Book Questions
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Store questions from your personal licensed textbooks (S.L. Arora, R.D. Sharma, Oswaal, Xam Idea, MTG, Together With, All in One, R.S. Aggarwal) locally in IndexedDB. Items are transparently tagged as &ldquo;User-Provided&rdquo;.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUserMaterial} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Subject
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSelectSubject(e.target.value as SubjectId)}
                  className="px-3 py-2 glass-input text-xs"
                >
                  {CBSE_CLASS_12_CURRICULUM.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Chapter
                <select
                  value={activeChapter.id}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="px-3 py-2 glass-input text-xs"
                >
                  {subject.chapters.map((c) => (
                    <option key={c.id} value={c.id}>Ch {c.number}: {c.title}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Marks
                <select
                  value={userMarks}
                  onChange={(e) => setUserMarks(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="px-3 py-2 glass-input text-xs"
                >
                  {[1, 2, 3, 4, 5].map((m) => (
                    <option key={m} value={m}>{m} Mark{m > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Question or Concept Prompt
              <textarea
                required
                rows={3}
                value={userQuestionText}
                onChange={(e) => setUserQuestionText(e.target.value)}
                placeholder="Enter your question or problem statement..."
                className="px-3 py-2 glass-input text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Verified Answer
              <input
                required
                type="text"
                value={userAnswerText}
                onChange={(e) => setUserAnswerText(e.target.value)}
                placeholder="Final answer or value points..."
                className="px-3 py-2 glass-input text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Step-by-Step Explanation (Optional)
              <textarea
                rows={2}
                value={userExplanation}
                onChange={(e) => setUserExplanation(e.target.value)}
                placeholder="Formula, working steps, or textbook reference..."
                className="px-3 py-2 glass-input text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white glass-press min-h-[42px]"
              >
                Save to Local Question Bank
              </button>
              {userSaveStatus && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {userSaveStatus}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
