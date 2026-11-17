import type {
  BoardCueEvent,
  ChapterContent,
  ClassroomQuestionLogItem,
  DigitalBoardBlock,
  SubjectId,
  TeachingSpeed,
} from '../types/arora';

const MAX_BOARD_BLOCKS = 60;

export function teachingSpeedToRateMultiplier(speed: TeachingSpeed): number {
  if (speed === 'slow') return 0.84;
  if (speed === 'fast') return 1.15;
  return 1.0;
}

export function createBoardBlockId(prefix = 'blk'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function applyBoardCues(
  prevBlocks: DigitalBoardBlock[],
  cues: BoardCueEvent[],
): { blocks: DigitalBoardBlock[]; activeBlockId: string | null } {
  let next = [...prevBlocks];
  let activeBlockId: string | null = null;

  for (const cue of cues) {
    if (cue.op === 'clear') {
      next = [];
      activeBlockId = null;
      continue;
    }

    if (cue.op === 'erase_block') {
      const targetId = cue.blockId || next[next.length - 1]?.id;
      if (targetId) {
        next = next.filter((b) => b.id !== targetId);
      }
      continue;
    }

    if (cue.op === 'highlight') {
      const targetId = cue.blockId || cue.block?.id || next[next.length - 1]?.id;
      if (targetId) {
        next = next.map((b) =>
          b.id === targetId
            ? {
                ...b,
                isHighlighted: true,
                highlightTerms: cue.block?.highlightTerms || b.highlightTerms,
              }
            : b,
        );
        activeBlockId = targetId;
      } else if (cue.block) {
        const appended: DigitalBoardBlock = {
          ...cue.block,
          id: cue.block.id || createBoardBlockId(),
          isHighlighted: true,
          createdAt: cue.block.createdAt || new Date().toISOString(),
        };
        next.push(appended);
        activeBlockId = appended.id;
      }
      continue;
    }

    if (cue.op === 'replace' && cue.block) {
      const targetId = cue.blockId || cue.block.id || next[next.length - 1]?.id;
      const existing = targetId ? next.find((b) => b.id === targetId) : undefined;
      const replacement: DigitalBoardBlock = {
        ...cue.block,
        id: targetId || createBoardBlockId(),
        isCorrected: true,
        replacesText: cue.block.replacesText || existing?.content,
        createdAt: cue.block.createdAt || new Date().toISOString(),
      };
      if (existing) {
        next = next.map((b) => (b.id === existing.id ? replacement : b));
      } else {
        next.push(replacement);
      }
      activeBlockId = replacement.id;
      continue;
    }

    if (cue.op === 'append' && cue.block) {
      const appended: DigitalBoardBlock = {
        ...cue.block,
        id: cue.block.id || createBoardBlockId(),
        createdAt: cue.block.createdAt || new Date().toISOString(),
      };
      next.push(appended);
      activeBlockId = appended.id;
    }
  }

  if (next.length > MAX_BOARD_BLOCKS) {
    next = next.slice(next.length - MAX_BOARD_BLOCKS);
  }

  return { blocks: next, activeBlockId };
}

export interface BoardCueScheduler {
  updateProgress: (fraction: number) => void;
  flushRemaining: () => void;
  cancel: () => void;
  getRemainingCount: () => number;
}

export function createBoardCueScheduler(
  cues: BoardCueEvent[],
  onDispatch: (dispatchedCues: BoardCueEvent[]) => void,
): BoardCueScheduler {
  const sorted = [...cues]
    .map((c, idx) => ({
      ...c,
      delayRatio: Number.isFinite(c.delayRatio)
        ? Math.min(0.95, Math.max(0, c.delayRatio))
        : idx * 0.25,
    }))
    .sort((a, b) => a.delayRatio - b.delayRatio);

  const dispatched = new Set<string>();
  let cancelled = false;

  const updateProgress = (fraction: number) => {
    if (cancelled) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    const ready: BoardCueEvent[] = [];
    for (const cue of sorted) {
      if (!dispatched.has(cue.id) && clamped >= cue.delayRatio) {
        dispatched.add(cue.id);
        ready.push(cue);
      }
    }
    if (ready.length > 0) {
      onDispatch(ready);
    }
  };

  const flushRemaining = () => {
    if (cancelled) return;
    const remaining: BoardCueEvent[] = [];
    for (const cue of sorted) {
      if (!dispatched.has(cue.id)) {
        dispatched.add(cue.id);
        remaining.push(cue);
      }
    }
    if (remaining.length > 0) {
      onDispatch(remaining);
    }
  };

  const cancel = () => {
    cancelled = true;
  };

  const getRemainingCount = () => {
    if (cancelled) return 0;
    return sorted.filter((c) => !dispatched.has(c.id)).length;
  };

  return {
    updateProgress,
    flushRemaining,
    cancel,
    getRemainingCount,
  };
}

export function getSubjectBoardTitle(subjectId: SubjectId): string {
  switch (subjectId) {
    case 'physics':
      return 'Physics Board · Derivations, Vectors & Ray/Circuit Diagrams';
    case 'chemistry':
      return 'Chemistry Board · Reactions, Equations & Mechanisms';
    case 'mathematics':
      return 'Mathematics Board · Step-by-Step Calculus, Matrices & Graphs';
    case 'biology':
      return 'Biology Board · Processes, Pathways & Labelled Diagrams';
    case 'computer_science':
      return 'Computer Science Board · Code Editor, SQL & Algorithms';
    case 'english':
      return 'English Board · Grammar, Literary Annotations & Formats';
  }
}

export function buildSubjectLaunchCues(
  subjectId: SubjectId,
  chapter: ChapterContent,
  topic: string,
  firstQuestion: string,
): BoardCueEvent[] {
  const nowIso = new Date().toISOString();
  const concept = chapter.concepts[0] || chapter.detailedNotes?.[0] || chapter.title;
  const formula = chapter.formulas[0];
  const def = chapter.definitions[0];

  const cues: BoardCueEvent[] = [
    {
      id: createBoardBlockId('cue-clear'),
      op: 'clear',
      delayRatio: 0,
    },
    {
      id: createBoardBlockId('cue-topic'),
      op: 'append',
      delayRatio: 0.04,
      block: {
        id: createBoardBlockId('exp'),
        kind: subjectId === 'english' ? 'grammar' : 'explanation',
        tone: 'default',
        title: `Topic Focus · ${topic}`,
        content: concept,
        topicTag: topic,
        createdAt: nowIso,
      },
    },
  ];

  if (def) {
    cues.push({
      id: createBoardBlockId('cue-def'),
      op: 'append',
      delayRatio: 0.25,
      block: {
        id: createBoardBlockId('def'),
        kind: 'definition',
        tone: 'important',
        title: `Key Definition · ${def.term}`,
        content: def.definition,
        highlightTerms: [def.term],
        isHighlighted: true,
        topicTag: topic,
        createdAt: nowIso,
      },
    });
  }

  if (subjectId === 'computer_science') {
    const isSql =
      chapter.title.toLowerCase().includes('sql') ||
      topic.toLowerCase().includes('sql') ||
      topic.toLowerCase().includes('database');
    cues.push({
      id: createBoardBlockId('cue-cs'),
      op: 'append',
      delayRatio: 0.45,
      block: {
        id: createBoardBlockId('code'),
        kind: 'code',
        tone: 'code',
        title: isSql ? 'SQL Query Pattern' : 'Python Implementation Snippet',
        codeLanguage: isSql ? 'sql' : 'python',
        content: isSql
          ? `SELECT Dept, COUNT(*) AS Total, AVG(Marks) AS AvgScore\nFROM STUDENTS\nGROUP BY Dept\nHAVING COUNT(*) >= 2;`
          : `# CBSE Class 12 · ${topic}\ndef solve_step(data):\n    """Process items cleanly with clear base condition."""\n    if not data:\n        return []\n    return data`,
        topicTag: topic,
        createdAt: nowIso,
      },
    });
  } else if (subjectId === 'chemistry' && formula) {
    cues.push({
      id: createBoardBlockId('cue-chem'),
      op: 'append',
      delayRatio: 0.45,
      block: {
        id: createBoardBlockId('eq'),
        kind: 'equation',
        tone: 'formula',
        title: formula.name,
        content: formula.expression,
        lines: formula.units ? [`Units / Conditions: ${formula.units}`] : undefined,
        topicTag: topic,
        createdAt: nowIso,
      },
    });
  } else if (formula) {
    cues.push({
      id: createBoardBlockId('cue-fml'),
      op: 'append',
      delayRatio: 0.45,
      block: {
        id: createBoardBlockId('fml'),
        kind: 'formula',
        tone: 'formula',
        title: formula.name,
        content: formula.expression,
        lines: formula.units ? [`SI Units: ${formula.units}`] : undefined,
        topicTag: topic,
        createdAt: nowIso,
      },
    });
  }

  if (chapter.diagramId) {
    cues.push({
      id: createBoardBlockId('cue-diag'),
      op: 'append',
      delayRatio: 0.62,
      block: {
        id: createBoardBlockId('diag'),
        kind: 'diagram',
        tone: 'example',
        title: `Interactive Model · ${chapter.title}`,
        content: chapter.diagramCaption || `Interactive ${topic} visual diagram`,
        diagramId: chapter.diagramId,
        topicTag: topic,
        createdAt: nowIso,
      },
    });
  }

  cues.push({
    id: createBoardBlockId('cue-q'),
    op: 'append',
    delayRatio: 0.82,
    block: {
      id: createBoardBlockId('q'),
      kind: 'question',
      tone: 'question',
      title: 'Check for Understanding (Your Turn)',
      content: firstQuestion,
      topicTag: topic,
      createdAt: nowIso,
    },
  });

  return cues;
}

export function buildStepByStepFallbackCues(
  subjectId: SubjectId,
  chapter: ChapterContent,
  topic: string,
): BoardCueEvent[] {
  const nowIso = new Date().toISOString();
  const solved = chapter.solvedExamples[0];
  const derivation = chapter.derivations[0];

  if (solved) {
    return [
      {
        id: createBoardBlockId('cue-prob'),
        op: 'append',
        delayRatio: 0.05,
        block: {
          id: createBoardBlockId('step-p'),
          kind: 'numerical_step',
          tone: 'example',
          title: `Worked Example · ${topic}`,
          content: solved.problem,
          topicTag: topic,
          createdAt: nowIso,
        },
      },
      ...solved.solutionSteps.slice(0, 4).map((stepLine, idx) => ({
        id: createBoardBlockId(`cue-s-${idx}`),
        op: 'append' as const,
        delayRatio: Math.min(0.82, 0.25 + idx * 0.16),
        block: {
          id: createBoardBlockId(`step-${idx}`),
          kind: 'numerical_step' as const,
          tone: idx === solved.solutionSteps.length - 1 ? ('important' as const) : ('formula' as const),
          title: `Step ${idx + 1}`,
          content: stepLine,
          topicTag: topic,
          createdAt: nowIso,
        },
      })),
      {
        id: createBoardBlockId('cue-ans'),
        op: 'append',
        delayRatio: 0.88,
        block: {
          id: createBoardBlockId('step-ans'),
          kind: 'highlight',
          tone: 'important',
          title: 'Final Result',
          content: solved.finalAnswer,
          isHighlighted: true,
          topicTag: topic,
          createdAt: nowIso,
        },
      },
    ];
  }

  if (derivation) {
    return [
      {
        id: createBoardBlockId('cue-deriv-h'),
        op: 'append',
        delayRatio: 0.06,
        block: {
          id: createBoardBlockId('drv-h'),
          kind: 'derivation_step',
          tone: 'formula',
          title: derivation.title,
          content: `Deriving ${derivation.title} step by step (${subjectId.replace('_', ' ')}):`,
          lines: derivation.steps,
          topicTag: topic,
          createdAt: nowIso,
        },
      },
    ];
  }

  return [];
}

export function exportBoardNotesMarkdown(params: {
  subjectName: string;
  chapterTitle: string;
  topic: string;
  blocks: DigitalBoardBlock[];
  questionLog: ClassroomQuestionLogItem[];
  lessonSummary?: string;
  revisionNotes?: string;
}): string {
  const lines: string[] = [
    `# ARORA AI Virtual Classroom Notes`,
    `**Subject:** ${params.subjectName}`,
    `**Chapter:** ${params.chapterTitle}`,
    `**Focus Topic:** ${params.topic}`,
    `**Exported:** ${new Date().toLocaleString()}`,
    '',
    '---',
    '## Digital Teaching Board Content',
    '',
  ];

  for (const b of params.blocks) {
    const label = b.title ? `### ${b.title}` : `### ${b.kind.replace('_', ' ').toUpperCase()}`;
    lines.push(label);
    if (b.equationParts) {
      lines.push(
        `${b.equationParts.reactants} --[${b.equationParts.conditions || 'reaction'}]--> ${b.equationParts.products}`,
      );
    } else if (b.kind === 'code') {
      lines.push('```' + (b.codeLanguage === 'sql' ? 'sql' : 'python'));
      lines.push(b.content);
      lines.push('```');
    } else {
      lines.push(b.content);
    }
    if (b.lines && b.lines.length > 0) {
      for (const l of b.lines) {
        lines.push(`- ${l}`);
      }
    }
    lines.push('');
  }

  if (params.questionLog.length > 0) {
    lines.push('---', '## Classroom Q&A Check Log', '');
    params.questionLog.forEach((q, idx) => {
      lines.push(
        `${idx + 1}. **Q (${q.topic}):** ${q.question}`,
        `   - **Your Answer:** ${q.studentAnswer} *(${q.status})*`,
        `   - **Teacher Feedback:** ${q.feedback}`,
        '',
      );
    });
  }

  if (params.lessonSummary) {
    lines.push('---', '## Lesson Summary', '', params.lessonSummary, '');
  }

  if (params.revisionNotes) {
    lines.push('---', '## Revision Notes', '', params.revisionNotes, '');
  }

  return lines.join('\n');
}
