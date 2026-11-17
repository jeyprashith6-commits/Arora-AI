import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from '../data/curriculum';
import type {
  DifficultyLevel,
  ProvenanceDisplayLabel,
  QuestionBankSortOption,
  QuestionItem,
  QuestionPracticeProgress,
  QuestionType,
  ReferenceBookName,
  SubjectId,
} from '../types/arora';

export function computeQuestionContentHash(q: {
  subjectId: string;
  chapterId: string;
  questionText: string;
}): string {
  const normalized = `${q.subjectId}|${q.chapterId}|${q.questionText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `qh-${(hash >>> 0).toString(36)}`;
}

export function getDisplaySourceCategory(q: QuestionItem): ProvenanceDisplayLabel {
  if (q.isSamplePaper || q.sourceCategory === 'Official CBSE Sample Paper') {
    return 'Official CBSE Sample Paper';
  }
  if (q.isPreviousYear && q.sourceCategory !== 'AI-Generated Practice') {
    return 'Official CBSE PYQ';
  }
  if (q.sourceCategory === 'Official CBSE') {
    return 'Official CBSE PYQ';
  }
  if (q.sourceCategory === 'NCERT / Exemplar') {
    return 'NCERT';
  }
  if (q.sourceCategory === 'Licensed Reference') {
    return 'Licensed Reference Material';
  }
  if (q.sourceCategory === 'User-Provided') {
    return 'Student Uploaded Material';
  }
  return 'AI Generated';
}

export function deduplicateQuestions(items: QuestionItem[]): {
  unique: QuestionItem[];
  duplicateIdsRemoved: number;
  duplicateHashesRemoved: number;
} {
  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  const unique: QuestionItem[] = [];
  let duplicateIdsRemoved = 0;
  let duplicateHashesRemoved = 0;

  for (const item of items) {
    if (seenIds.has(item.id)) {
      duplicateIdsRemoved++;
      continue;
    }
    const hash = item.contentHash || computeQuestionContentHash(item);
    if (seenHashes.has(hash)) {
      duplicateHashesRemoved++;
      continue;
    }
    seenIds.add(item.id);
    seenHashes.add(hash);
    unique.push(item.contentHash ? item : { ...item, contentHash: hash });
  }

  return { unique, duplicateIdsRemoved, duplicateHashesRemoved };
}

export interface QuestionBankFilterCriteria {
  subjectId: 'all' | SubjectId;
  chapterId: string;
  topicQuery: string;
  marks: 'all' | number;
  difficulty: 'all' | DifficultyLevel;
  type: 'All' | QuestionType | 'Sample-Paper';
  sourceBook: 'All' | ReferenceBookName;
  provenance: 'All' | ProvenanceDisplayLabel;
  practiceStatus: 'all' | 'bookmarked' | 'incorrect' | 'completed' | 'unattempted';
  searchQuery: string;
  sortBy: QuestionBankSortOption;
}

const DIFFICULTY_RANK: Record<DifficultyLevel, number> = {
  Easy: 1,
  Moderate: 2,
  Hard: 3,
  Expert: 4,
};

export function filterAndSortQuestions(
  allQuestions: QuestionItem[],
  filters: QuestionBankFilterCriteria,
  progressMap: Record<string, QuestionPracticeProgress> = {},
): QuestionItem[] {
  const qLower = filters.searchQuery.trim().toLowerCase();
  const topicLower = filters.topicQuery.trim().toLowerCase();

  const filtered = allQuestions.filter((item) => {
    if (filters.subjectId !== 'all' && item.subjectId !== filters.subjectId) return false;
    if (filters.chapterId !== 'all' && item.chapterId !== filters.chapterId) return false;
    if (topicLower) {
      const inTopic = item.topic.toLowerCase().includes(topicLower);
      const inSubtopic = (item.subtopic || '').toLowerCase().includes(topicLower);
      if (!inTopic && !inSubtopic) return false;
    }
    if (filters.marks !== 'all' && item.marks !== filters.marks) return false;
    if (filters.difficulty !== 'all' && item.difficulty !== filters.difficulty) return false;

    if (filters.type !== 'All') {
      if (filters.type === 'Previous-Year') {
        if (!item.isPreviousYear) return false;
      } else if (filters.type === 'Sample-Paper') {
        if (!item.isSamplePaper && item.sourceCategory !== 'Official CBSE Sample Paper') return false;
      } else if (item.type !== filters.type) {
        return false;
      }
    }

    if (filters.sourceBook !== 'All' && item.sourceBook !== filters.sourceBook) return false;
    if (filters.provenance !== 'All' && getDisplaySourceCategory(item) !== filters.provenance) {
      return false;
    }

    if (filters.practiceStatus !== 'all') {
      const prog = progressMap[item.id];
      if (filters.practiceStatus === 'bookmarked' && !prog?.bookmarked) return false;
      if (filters.practiceStatus === 'incorrect' && !(prog && prog.attempts > 0 && prog.lastCorrect === false)) {
        return false;
      }
      if (filters.practiceStatus === 'completed' && !prog?.completed) return false;
      if (filters.practiceStatus === 'unattempted' && prog && prog.attempts > 0) return false;
    }

    if (qLower) {
      const haystack = `${item.questionText} ${item.topic} ${item.subtopic || ''} ${item.chapterTitle} ${item.sourceBook} ${item.formulaRef || ''}`.toLowerCase();
      if (!haystack.includes(qLower)) return false;
    }

    return true;
  });

  const priorityScore = (item: QuestionItem): number => {
    let score = 0;
    if (item.sourceCategory === 'User-Provided') score += 50;
    if (item.sourceCategory === 'AI-Generated Practice') score += 45;
    if (item.isPreviousYear) score += 40;
    if (item.isSamplePaper) score += 35;
    if (!item.id.startsWith('syn-')) score += 25;
    if (qLower && item.questionText.toLowerCase().includes(qLower)) score += 15;
    if (qLower && item.topic.toLowerCase().includes(qLower)) score += 10;
    return score;
  };

  return [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'marks_asc':
        return a.marks - b.marks || priorityScore(b) - priorityScore(a);
      case 'marks_desc':
        return b.marks - a.marks || priorityScore(b) - priorityScore(a);
      case 'difficulty':
        return DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
      case 'newest_pyq':
        return (b.pyqYear || b.samplePaperYear || 0) - (a.pyqYear || a.samplePaperYear || 0) || priorityScore(b) - priorityScore(a);
      case 'bookmarked_retry': {
        const pA = progressMap[a.id];
        const pB = progressMap[b.id];
        const wA = (pA?.lastCorrect === false ? 4 : 0) + (pA?.bookmarked ? 2 : 0);
        const wB = (pB?.lastCorrect === false ? 4 : 0) + (pB?.bookmarked ? 2 : 0);
        return wB - wA || priorityScore(b) - priorityScore(a);
      }
      case 'relevance':
      default:
        return priorityScore(b) - priorityScore(a);
    }
  });
}

export interface PaginatedSlice<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function paginateQuestions<T>(
  items: T[],
  requestedPage: number,
  pageSize = 20,
): PaginatedSlice<T> {
  const safeSize = Math.max(1, pageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (page - 1) * safeSize;
  const endIndex = Math.min(totalItems, startIndex + safeSize);
  return {
    items: items.slice(startIndex, endIndex),
    page,
    pageSize: safeSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

export interface ChapterCoverageGap {
  subjectId: SubjectId;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  currentCount: number;
  curatedCount: number;
  missingTypes: QuestionType[];
  suggestedTopic: string;
  suggestedSubtopic: string;
  suggestedSource: ReferenceBookName;
}

const KEY_CBSE_TYPES: QuestionType[] = [
  'MCQ',
  'Assertion-Reason',
  'Very Short Answer',
  '2-Mark',
  '3-Mark',
  '4-Mark Case Study',
  '5-Mark',
  'Competency-Based',
];

export function detectSparseChapters(
  allQuestions: QuestionItem[],
  minTotalThreshold = 10,
): ChapterCoverageGap[] {
  const byChapter = new Map<string, QuestionItem[]>();
  for (const q of allQuestions) {
    const arr = byChapter.get(q.chapterId);
    if (arr) arr.push(q);
    else byChapter.set(q.chapterId, [q]);
  }

  const gaps: ChapterCoverageGap[] = [];
  for (const sub of CBSE_CLASS_12_CURRICULUM) {
    for (const ch of sub.chapters) {
      const qs = byChapter.get(ch.id) || [];
      const curatedCount = qs.filter((q) => !q.id.startsWith('syn-')).length;
      const presentTypes = new Set(qs.map((q) => q.type));
      const missingTypes = KEY_CBSE_TYPES.filter((t) => !presentTypes.has(t));
      if (qs.length < minTotalThreshold || curatedCount === 0 || missingTypes.length >= 4) {
        gaps.push({
          subjectId: sub.id,
          subjectName: sub.name,
          chapterId: ch.id,
          chapterTitle: ch.title,
          currentCount: qs.length,
          curatedCount,
          missingTypes: missingTypes.slice(0, 4),
          suggestedTopic: ch.topics[0] || ch.title,
          suggestedSubtopic: ch.subtopics[0] || ch.topics[0] || ch.title,
          suggestedSource: ch.referenceCoverage[0] || 'NCERT',
        });
      }
    }
  }

  return gaps.sort(
    (a, b) => a.curatedCount - b.curatedCount || a.currentCount - b.currentCount,
  );
}

export interface LocalPracticeEvaluation {
  status: 'correct' | 'partial' | 'incorrect';
  isCorrect: boolean;
  scoreAwarded: number;
  feedback: string;
  mistakeExplanation: string;
  nextStepHint: string;
}

export function evaluatePracticeResponseLocal(
  q: QuestionItem,
  submittedAnswer: string,
  selectedIndices: number[] = [],
): LocalPracticeEvaluation {
  if (q.type === 'MSQ' && q.correctOptionIndices && q.correctOptionIndices.length > 0) {
    const expected = [...new Set(q.correctOptionIndices)].sort((a, b) => a - b);
    const chosen = [...new Set(selectedIndices)].sort((a, b) => a - b);
    if (chosen.length === 0) {
      return {
        status: 'incorrect',
        isCorrect: false,
        scoreAwarded: 0,
        feedback: 'Please select at least one option before submitting.',
        mistakeExplanation: 'No choices were selected.',
        nextStepHint: q.hint || 'Re-read the conditions for each statement carefully.',
      };
    }
    const exactMatch =
      chosen.length === expected.length && chosen.every((v, idx) => v === expected[idx]);
    if (exactMatch) {
      return {
        status: 'correct',
        isCorrect: true,
        scoreAwarded: q.marks,
        feedback: 'Exact match! All correct statements selected.',
        mistakeExplanation: 'You accurately identified every valid option.',
        nextStepHint: 'Try explaining why the distractor options fail.',
      };
    }
    const trueHits = chosen.filter((c) => expected.includes(c)).length;
    const falsePicks = chosen.filter((c) => !expected.includes(c)).length;
    if (trueHits > 0 && falsePicks === 0) {
      return {
        status: 'partial',
        isCorrect: false,
        scoreAwarded: Number((q.marks * (trueHits / expected.length)).toFixed(1)),
        feedback: `Partially right (${trueHits} of ${expected.length} correct choices picked), with no wrong selections.`,
        mistakeExplanation: 'One or more valid statements remain unselected.',
        nextStepHint: q.hint || 'Verify the remaining options independently against the core principle.',
      };
    }
    return {
      status: 'incorrect',
      isCorrect: false,
      scoreAwarded: 0,
      feedback: 'Incorrect selection for this Multiple-Select question.',
      mistakeExplanation:
        falsePicks > 0
          ? 'At least one chosen statement contradicts NCERT principles.'
          : 'Missing valid choices.',
      nextStepHint: q.hint || 'Check boundary cases for each statement.',
    };
  }

  if (q.options && q.options.length > 0 && typeof q.correctOptionIndex === 'number') {
    const expected = q.options[q.correctOptionIndex];
    const isCorrect =
      submittedAnswer.trim() === expected.trim() ||
      (selectedIndices.length === 1 && selectedIndices[0] === q.correctOptionIndex);
    return isCorrect
      ? {
          status: 'correct',
          isCorrect: true,
          scoreAwarded: q.marks,
          feedback: 'Correct choice!',
          mistakeExplanation: 'Your answer matches the verified CBSE key.',
          nextStepHint: 'Review the solution rationale to lock in the concept.',
        }
      : {
          status: 'incorrect',
          isCorrect: false,
          scoreAwarded: 0,
          feedback: 'Not quite right.',
          mistakeExplanation: `You selected "${submittedAnswer || 'an alternate option'}", which misses the key condition tested here.`,
          nextStepHint: q.hint || 'Re-check the core relation or formula before retrying.',
        };
  }

  // Numerical & key-concept heuristic evaluation for offline / fast subjective check
  const trimmed = submittedAnswer.trim();
  if (!trimmed) {
    return {
      status: 'incorrect',
      isCorrect: false,
      scoreAwarded: 0,
      feedback: 'Please enter your answer or calculation steps first.',
      mistakeExplanation: 'Blank response submitted.',
      nextStepHint: q.hint || 'Start by writing the relevant formula or theorem.',
    };
  }

  const keyTokens = `${q.correctAnswer} ${q.formulaRef || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  const ansLower = trimmed.toLowerCase();
  const uniqueTokens = Array.from(new Set(keyTokens));
  const matched = uniqueTokens.filter((t) => ansLower.includes(t));
  const denom = Math.max(1, Math.min(5, uniqueTokens.length));
  const ratio = matched.length / denom;

  if (ratio >= 0.65) {
    return {
      status: 'correct',
      isCorrect: true,
      scoreAwarded: q.marks,
      feedback: 'Strong response covering key CBSE marking points.',
      mistakeExplanation: 'Core terms/numerical values match the expected solution.',
      nextStepHint: 'Compare your steps with the model marking scheme for SI units & presentation.',
    };
  }
  if (ratio >= 0.3 || trimmed.length >= 40) {
    return {
      status: 'partial',
      isCorrect: false,
      scoreAwarded: Math.max(0.5, Number((q.marks * 0.5).toFixed(1))),
      feedback: 'Partially accurate — good direction, but missing a key value point or unit.',
      mistakeExplanation:
        'Some key derivations, final numerical substitutions, or Board keywords from the marking scheme are missing.',
      nextStepHint: q.hint || 'Include the governing formula, substitution, and final unit/conclusion.',
    };
  }
  return {
    status: 'incorrect',
    isCorrect: false,
    scoreAwarded: 0,
    feedback: 'Incomplete or off-target response.',
    mistakeExplanation: 'Key concepts/values expected by the CBSE marking scheme were not detected.',
    nextStepHint: q.hint || 'Use "Show Hint" or request AI feedback for step-by-step guidance.',
  };
}

export function parseUploadedStudyQuestions(
  rawText: string,
  defaults: {
    subjectId: SubjectId;
    chapterId?: string;
    year: number;
    sourcePublication?: string;
  },
  existingHashes: Set<string>,
): {
  imported: QuestionItem[];
  skippedDuplicates: number;
  errors: string[];
} {
  const trimmed = rawText.trim();
  const imported: QuestionItem[] = [];
  const errors: string[] = [];
  let skippedDuplicates = 0;

  if (!trimmed) {
    return { imported, skippedDuplicates, errors: ['Input is empty.'] };
  }

  const defaultSubject = getSubjectById(defaults.subjectId);
  const defaultChapter =
    defaultSubject.chapters.find((c) => c.id === defaults.chapterId) ||
    defaultSubject.chapters[0];

  const normalizeRecord = (rec: Record<string, unknown>, idx: number) => {
    const qText = String(rec.questionText || rec.question || '').trim();
    const ans = String(rec.correctAnswer || rec.answer || '').trim();
    if (!qText || !ans) {
      errors.push(`Item #${idx + 1}: missing question text or correct answer.`);
      return;
    }

    const rawSub = String(rec.subjectId || rec.subject || defaults.subjectId)
      .toLowerCase()
      .replace(/\s+/g, '_');
    const validSubjects: SubjectId[] = [
      'physics',
      'chemistry',
      'mathematics',
      'biology',
      'english',
      'computer_science',
    ];
    const subjectId: SubjectId = validSubjects.includes(rawSub as SubjectId)
      ? (rawSub as SubjectId)
      : defaults.subjectId;
    const sub = getSubjectById(subjectId);
    const matchedChapter =
      sub.chapters.find(
        (c) =>
          c.id === rec.chapterId ||
          c.title.toLowerCase() === String(rec.chapterTitle || '').toLowerCase(),
      ) ||
      (subjectId === defaultSubject.id ? defaultChapter : sub.chapters[0]);

    const rawMarks = Number(rec.marks);
    const marks: 1 | 2 | 3 | 4 | 5 =
      rawMarks === 1 || rawMarks === 2 || rawMarks === 3 || rawMarks === 4 || rawMarks === 5
        ? rawMarks
        : 2;

    const rawDiff = String(rec.difficulty || 'Moderate');
    const difficulty: DifficultyLevel =
      rawDiff === 'Easy' || rawDiff === 'Moderate' || rawDiff === 'Hard' || rawDiff === 'Expert'
        ? rawDiff
        : 'Moderate';

    const options = Array.isArray(rec.options)
      ? rec.options.map((o) => String(o).trim()).filter(Boolean)
      : typeof rec.options === 'string' && rec.options.includes('|')
        ? rec.options
            .split('|')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    const hash = computeQuestionContentHash({
      subjectId,
      chapterId: matchedChapter.id,
      questionText: qText,
    });
    if (existingHashes.has(hash)) {
      skippedDuplicates++;
      return;
    }
    existingHashes.add(hash);

    const isMcq = Boolean(options && options.length >= 2);
    const qType = (rec.type as QuestionType) || (isMcq ? 'MCQ' : `${marks}-Mark` as QuestionType);
    const correctIdx =
      typeof rec.correctOptionIndex === 'number'
        ? rec.correctOptionIndex
        : options
          ? Math.max(
              0,
              options.findIndex((o) => o.toLowerCase() === ans.toLowerCase()),
            )
          : undefined;

    imported.push({
      id: `usr-${Date.now()}-${idx}-${hash.slice(3)}`,
      year: Number(rec.year) || defaults.year,
      subjectId,
      chapterId: matchedChapter.id,
      chapterTitle: matchedChapter.title,
      topic: String(rec.topic || matchedChapter.topics[0] || matchedChapter.title),
      subtopic: rec.subtopic ? String(rec.subtopic) : matchedChapter.subtopics[0],
      marks,
      difficulty,
      type: qType,
      sourceBook: 'User-Provided',
      sourceCategory: 'User-Provided',
      sourcePublication:
        String(rec.sourcePublication || defaults.sourcePublication || 'Student Uploaded Study Pack'),
      isPreviousYear: false,
      questionText: qText,
      options,
      correctOptionIndex: correctIdx,
      correctAnswer: ans,
      hint: rec.hint ? String(rec.hint) : undefined,
      formulaRef: rec.formulaRef ? String(rec.formulaRef) : undefined,
      explanation: String(
        rec.explanation || `Uploaded student study answer: ${ans}`,
      ),
      stepByStepSolution: Array.isArray(rec.stepByStepSolution)
        ? rec.stepByStepSolution.map((s) => String(s))
        : undefined,
      contentHash: hash,
    });
  };

  // 1. JSON array or object
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { questions?: unknown[] }).questions)
          ? (parsed as { questions: unknown[] }).questions
          : [parsed];
      list.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          normalizeRecord(item as Record<string, unknown>, idx);
        }
      });
      return { imported, skippedDuplicates, errors };
    } catch {
      errors.push('Invalid JSON syntax.');
      return { imported, skippedDuplicates, errors };
    }
  }

  // 2. CSV lines (header optional: questionText,correctAnswer,marks,topic,explanation)
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase().includes('question') && lines[0]?.includes(',')) {
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]
        .match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
        ?.map((c) => c.trim().replace(/^"|"$/g, '')) || lines[i].split(',').map((c) => c.trim());
      const obj: Record<string, unknown> = {};
      headers.forEach((h, hIdx) => {
        obj[h] = cols[hIdx] ?? '';
      });
      normalizeRecord(obj, i - 1);
    }
    return { imported, skippedDuplicates, errors };
  }

  // 3. Structured Q:/A: blocks
  const blocks = trimmed.split(/(?=^Q\s*:)/im).filter((b) => b.trim());
  if (blocks.some((b) => /^Q\s*:/i.test(b.trim()))) {
    blocks.forEach((block, idx) => {
      const qMatch = block.match(/Q\s*:\s*([\s\S]*?)(?=\n(?:A|Answer)\s*:|$)/i);
      const aMatch = block.match(/(?:A|Answer)\s*:\s*([\s\S]*?)(?=\n(?:Hint|Explanation)\s*:|$)/i);
      const expMatch = block.match(/Explanation\s*:\s*([\s\S]*)$/i);
      const hintMatch = block.match(/Hint\s*:\s*([^\n]+)/i);
      normalizeRecord(
        {
          questionText: qMatch?.[1]?.trim() || '',
          correctAnswer: aMatch?.[1]?.trim() || '',
          explanation: expMatch?.[1]?.trim() || '',
          hint: hintMatch?.[1]?.trim() || undefined,
        },
        idx,
      );
    });
    return { imported, skippedDuplicates, errors };
  }

  errors.push('Unrecognized format. Provide JSON array, CSV with headers, or "Q: ... / A: ..." blocks.');
  return { imported, skippedDuplicates, errors };
}

export interface QuestionBankAuditReport {
  academicYear: number;
  totalIndexed: number;
  curatedOfficialPyqCount: number;
  officialSamplePaperCount: number;
  curatedReferenceCount: number;
  curriculumAlignedGeneratedCount: number;
  studentUploadedCount: number;
  aiGeneratedUserCount: number;
  duplicateIdsFound: number;
  duplicateHashesFound: number;
  aiMarkedAsPyqViolations: number;
  answerIntegrityIssues: number;
  sparseChapterCount: number;
  subjectBreakdown: {
    subjectId: SubjectId;
    subjectName: string;
    total: number;
    chaptersTotal: number;
    chaptersCovered: number;
    pyqCount: number;
    samplePaperCount: number;
    curatedCount: number;
    generatedCount: number;
  }[];
  sourceBreakdown: { source: ReferenceBookName; count: number }[];
  typeBreakdown: { type: QuestionType; count: number }[];
  missingMaterialsNote: string[];
}

export function buildQuestionBankAuditReport(
  rawPool: QuestionItem[],
  academicYear: number,
): QuestionBankAuditReport {
  const deduped = deduplicateQuestions(rawPool);
  const questions = deduped.unique;

  let curatedOfficialPyqCount = 0;
  let officialSamplePaperCount = 0;
  let curatedReferenceCount = 0;
  let curriculumAlignedGeneratedCount = 0;
  let studentUploadedCount = 0;
  let aiGeneratedUserCount = 0;
  let aiMarkedAsPyqViolations = 0;
  let answerIntegrityIssues = 0;

  const sourceCounts = new Map<ReferenceBookName, number>();
  const typeCounts = new Map<QuestionType, number>();

  for (const q of questions) {
    sourceCounts.set(q.sourceBook, (sourceCounts.get(q.sourceBook) || 0) + 1);
    typeCounts.set(q.type, (typeCounts.get(q.type) || 0) + 1);

    if (
      (q.sourceCategory === 'AI-Generated Practice' || q.id.startsWith('syn-')) &&
      q.isPreviousYear
    ) {
      aiMarkedAsPyqViolations++;
    }

    if (!q.correctAnswer || !q.correctAnswer.trim() || !q.explanation || !q.explanation.trim()) {
      answerIntegrityIssues++;
    } else if (
      q.options &&
      q.options.length > 0 &&
      q.type !== 'MSQ' &&
      (typeof q.correctOptionIndex !== 'number' ||
        q.correctOptionIndex < 0 ||
        q.correctOptionIndex >= q.options.length)
    ) {
      answerIntegrityIssues++;
    }

    if (q.isSamplePaper || q.sourceCategory === 'Official CBSE Sample Paper') {
      officialSamplePaperCount++;
    } else if (q.isPreviousYear) {
      curatedOfficialPyqCount++;
    } else if (q.sourceCategory === 'User-Provided') {
      studentUploadedCount++;
    } else if (q.sourceCategory === 'AI-Generated Practice') {
      aiGeneratedUserCount++;
    } else if (q.id.startsWith('syn-')) {
      curriculumAlignedGeneratedCount++;
    } else {
      curatedReferenceCount++;
    }
  }

  const subjectBreakdown = CBSE_CLASS_12_CURRICULUM.map((sub) => {
    const sq = questions.filter((q) => q.subjectId === sub.id);
    const coveredSet = new Set(sq.map((q) => q.chapterId));
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      total: sq.length,
      chaptersTotal: sub.chapters.length,
      chaptersCovered: sub.chapters.filter((c) => coveredSet.has(c.id)).length,
      pyqCount: sq.filter((q) => q.isPreviousYear).length,
      samplePaperCount: sq.filter((q) => q.isSamplePaper || q.sourceCategory === 'Official CBSE Sample Paper').length,
      curatedCount: sq.filter(
        (q) =>
          !q.id.startsWith('syn-') &&
          !q.isPreviousYear &&
          !q.isSamplePaper &&
          q.sourceCategory !== 'AI-Generated Practice',
      ).length,
      generatedCount: sq.filter((q) => q.id.startsWith('syn-') || q.sourceCategory === 'AI-Generated Practice').length,
    };
  });

  const sparse = detectSparseChapters(questions, 10);

  const missingMaterialsNote: string[] = [
    'Future official CBSE Board papers and Sample Question Papers for 2028–2032+ are not yet published by CBSE and are never invented; provisional sessions use verified NCERT Class 12 patterns.',
    'Full copyrighted pages from commercial reference books (MTG, S.L. Arora, R.D. Sharma, R.S. Aggarwal, Oswaal, Xam Idea, Together With, All in One) are excluded to honor copyright; ARORA provides curated style-matched summaries, original NCERT-aligned practice items, and local student import for legally owned materials.',
  ];

  if (academicYear > 2027) {
    missingMaterialsNote.unshift(
      `Session ${academicYear} is currently marked Provisional/Pending official CBSE circular; official ${academicYear} CBSE PYQs do not exist yet.`,
    );
  }

  return {
    academicYear,
    totalIndexed: questions.length,
    curatedOfficialPyqCount,
    officialSamplePaperCount,
    curatedReferenceCount,
    curriculumAlignedGeneratedCount,
    studentUploadedCount,
    aiGeneratedUserCount,
    duplicateIdsFound: deduped.duplicateIdsRemoved,
    duplicateHashesFound: deduped.duplicateHashesRemoved,
    aiMarkedAsPyqViolations,
    answerIntegrityIssues,
    sparseChapterCount: sparse.length,
    subjectBreakdown,
    sourceBreakdown: Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    typeBreakdown: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    missingMaterialsNote,
  };
}
