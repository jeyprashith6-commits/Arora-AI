export type SubjectId =
  | 'physics'
  | 'chemistry'
  | 'mathematics'
  | 'biology'
  | 'english'
  | 'computer_science';

export type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'processing'
  | 'speaking'
  | 'generating'
  | 'error';

export type LanguageMode = 'indian_english' | 'tamil' | 'tanglish';

export type NetworkOperatingMode = 'online' | 'weak_network' | 'reconnecting';

export type RamProfileTier = 'eco_3_4gb' | 'balanced_6gb' | 'ultra_8gb_plus';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Hard' | 'Expert';

export type TeachingStyle =
  | 'Conceptual learning'
  | 'Question-and-answer'
  | 'Problem solving'
  | 'Board preparation'
  | 'Numerical practice';

export type ChatbotMode =
  | 'Auto (Smart)'
  | 'Quick Answer'
  | 'Deep Explanation'
  | 'Research'
  | 'Study'
  | 'Problem Solving'
  | 'Board Exam'
  | 'Coding'
  | 'Creative';

export type AdaptiveResponseStyle =
  | 'auto'
  | 'quick_answer'
  | 'simple_explanation'
  | 'detailed_explanation'
  | 'deep_conceptual'
  | 'step_by_step'
  | 'board_exam'
  | 'real_world_application'
  | 'interactive_questioning';

export type IntelligenceThinkingDepth = 'LOW' | 'MEDIUM' | 'HIGH' | 'XHIGH';

export type ReferenceBookName =
  | 'NCERT'
  | 'NCERT Exemplar'
  | 'MTG'
  | 'Together With'
  | 'All in One'
  | 'S.L. Arora'
  | 'Xam Idea'
  | 'Oswaal'
  | 'R.D. Sharma'
  | 'R.S. Aggarwal'
  | 'CBSE Official'
  | 'User-Provided';

export type QuestionSourceCategory =
  | 'Official CBSE'
  | 'Official CBSE Sample Paper'
  | 'NCERT / Exemplar'
  | 'Licensed Reference'
  | 'User-Provided'
  | 'AI-Generated Practice';

export type ProvenanceDisplayLabel =
  | 'Official CBSE PYQ'
  | 'Official CBSE Sample Paper'
  | 'NCERT'
  | 'Licensed Reference Material'
  | 'Student Uploaded Material'
  | 'AI Generated';

export type QuestionType =
  | 'MCQ'
  | 'MSQ'
  | 'Assertion-Reason'
  | 'Very Short Answer'
  | '1-Mark'
  | '2-Mark'
  | '3-Mark'
  | '4-Mark Case Study'
  | '5-Mark'
  | 'Competency-Based'
  | 'HOTS'
  | 'Application-Based'
  | 'Numerical'
  | 'Derivation'
  | 'Diagram-Based'
  | 'Practical-Based'
  | 'Previous-Year';

export type DiagramId =
  | 'gauss_electric_field'
  | 'lcr_resonance'
  | 'prism_refraction'
  | 'bohr_hydrogen_levels'
  | 'electrochemical_cell'
  | 'calculus_derivative_tangent'
  | 'dna_replication_fork'
  | 'logic_gates_sql_schema'
  | 'pn_junction_diode';

export interface SolvedExample {
  problem: string;
  solutionSteps: string[];
  finalAnswer: string;
}

export interface SubjectUnitWeightage {
  unit: string;
  chapters: string;
  marks: number;
}

export interface TrustedWebResource {
  title: string;
  domain: string;
  url: string;
  summary: string;
  focus: string;
}

export interface ChapterContent {
  id: string;
  number: number;
  title: string;
  unit: string;
  weightageMarks: number;
  topics: string[];
  subtopics: string[];
  deletedTopics: string[];
  definitions: { term: string; definition: string }[];
  concepts: string[];
  detailedNotes?: string[];
  boardExamTips?: string[];
  formulas: { name: string; expression: string; units?: string }[];
  derivations: { title: string; steps: string[] }[];
  diagramId?: DiagramId;
  diagramCaption?: string;
  solvedExamples: SolvedExample[];
  exercises: string[];
  practicalMaterial?: string;
  learningOutcomes: string[];
  referenceCoverage: ReferenceBookName[];
}

export interface SubjectCurriculum {
  id: SubjectId;
  name: string;
  code: string;
  theoryMarks: number;
  practicalMarks: number;
  description: string;
  fullSyllabusOverview?: string;
  unitWiseWeightage?: SubjectUnitWeightage[];
  trustedWebResources?: TrustedWebResource[];
  chapters: ChapterContent[];
  deletedChapters: { title: string; reason: string }[];
  practicals: string[];
}

export interface AcademicYearRecord {
  year: number;
  sessionLabel: string;
  status: 'archived_verified' | 'current_verified' | 'future_provisional' | 'pending_verification';
  isImmutableArchive: boolean;
  detectedAutomatically: boolean;
  officialSourceNote: string;
  lastCheckedAt: string;
  marksDistribution: {
    subjectId: SubjectId;
    subjectName: string;
    theoryMarks: number;
    practicalOrInternalMarks: number;
    totalMarks: number;
  }[];
  examPattern: {
    section: string;
    questionTypes: string;
    count: number;
    marksEach: number;
    totalMarks: number;
  }[];
  deletedTopicsSummary: { subjectId: SubjectId; items: string[] }[];
  newlyIntroducedTopics: { subjectId: SubjectId; items: string[] }[];
  samplePaperSummary: string;
  markingSchemeHighlights: string[];
  practicalRequirements: string[];
  previousYearMaterialsNote: string;
}

export interface QuestionItem {
  id: string;
  year: number;
  subjectId: SubjectId;
  chapterId: string;
  chapterTitle: string;
  topic: string;
  subtopic?: string;
  marks: 1 | 2 | 3 | 4 | 5;
  difficulty: DifficultyLevel;
  type: QuestionType;
  sourceBook: ReferenceBookName;
  sourceCategory: QuestionSourceCategory;
  sourcePublication?: string;
  isPreviousYear: boolean;
  pyqYear?: number;
  pyqPaperCode?: string;
  isSamplePaper?: boolean;
  samplePaperYear?: number;
  questionText: string;
  assertionText?: string;
  reasonText?: string;
  options?: string[];
  correctOptionIndex?: number;
  correctOptionIndices?: number[];
  correctAnswer: string;
  hint?: string;
  formulaRef?: string;
  explanation: string;
  stepByStepSolution?: string[];
  markingSchemeSteps?: string[];
  diagramId?: DiagramId;
  contentHash?: string;
}

export interface QuestionPracticeProgress {
  questionId: string;
  bookmarked: boolean;
  completed: boolean;
  lastCorrect?: boolean;
  attempts: number;
  lastSubmittedAnswer?: string;
  lastFeedback?: string;
  updatedAt: string;
}

export type QuestionBankSortOption =
  | 'relevance'
  | 'marks_asc'
  | 'marks_desc'
  | 'difficulty'
  | 'newest_pyq'
  | 'bookmarked_retry';

export interface MockTestLaunchPreset {
  subjectId: SubjectId;
  chapterId?: string;
  topic?: string;
  pyqOnly?: boolean;
  allowedSources?: ReferenceBookName[];
  totalMarks?: 20 | 30 | 40 | 70 | 80;
  testType?: MockTestType;
  difficulty?: DifficultyLevel | 'Mixed';
}

export type MockTestType =
  | 'Full Syllabus'
  | 'Chapter-wise'
  | 'Topic-wise'
  | 'Unit Test'
  | 'Half-Yearly'
  | 'Pre-Board'
  | 'Board-Pattern'
  | 'Competency-Based'
  | 'Custom Examination';

export interface MockTestConfig {
  id: string;
  title: string;
  testType: MockTestType;
  academicYear: number;
  subjectId: SubjectId;
  chapterId?: string;
  topic?: string;
  totalMarks: 20 | 30 | 40 | 70 | 80;
  durationMinutes: number;
  difficulty: DifficultyLevel | 'Mixed';
  allowedSources?: ReferenceBookName[];
  pyqOnly?: boolean;
}

export interface MockTestAttempt {
  id: string;
  config: MockTestConfig;
  startedAt: string;
  completedAt: string;
  totalMarks: number;
  scoredMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  strongChapters: string[];
  weakChapters: string[];
  revisionRecommendations: string[];
  questionResults: {
    questionId: string;
    questionText: string;
    chapterTitle: string;
    marks: number;
    awardedMarks: number;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface DeviceTelemetry {
  totalRamGb: number;
  estimatedAvailableRamGb: number;
  jsHeapUsedMb: number | null;
  jsHeapLimitMb: number | null;
  memoryPressure: 'low' | 'moderate' | 'high';
  cpuCores: number;
  architecture: string;
  platform: string;
  androidVersion: string | null;
  storageUsedMb: number | null;
  storageQuotaMb: number | null;
  batteryLevelPercent: number | null;
  batteryCharging: boolean | null;
  networkEffectiveType: string;
  networkDownlinkMbps: number | null;
  isOnline: boolean;
  operatingMode: NetworkOperatingMode;
  activeProfile: RamProfileTier;
  manualTierOverride: RamProfileTier | 'auto';
  localModelSpec: string;
  maxContextTurns: number;
  maxCacheEntries: number;
  animationComplexity: 'minimal' | 'balanced' | 'full';
  modelLoadedInMemory: boolean;
}

export type VoicePersona = 'Zephyr' | 'Kore' | 'Puck' | 'device_natural';

export interface StudentProfile {
  anonymousId: string;
  displayAlias: string;
  targetYear: number;
  preferredLanguage: LanguageMode;
  theme: 'dark' | 'light';
  createdAt: string;
  lastActiveAt: string;
  downloadedOfflineSubjects?: SubjectId[];
  memoryEnabled: boolean;
  hapticsEnabled?: boolean;
  alwaysOnline?: boolean;
  voicePersona?: VoicePersona;
  studyStreakDays: number;
  completedTopics: string[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  base64Data: string;
  previewText?: string;
}

export interface GeneratedDiagramSpec {
  title: string;
  topic: string;
  subjectHint?: string;
  caption: string;
  svgMarkup: string;
  keyLabels: { label: string; description: string }[];
  boardDrawingTips: string[];
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: ChatbotMode;
  language?: LanguageMode;
  provider?: string;
  sources?: { title: string; uri: string }[];
  attachments?: { name: string; mimeType: string; sizeBytes: number }[];
  diagram?: GeneratedDiagramSpec;
  isOfflineFallback?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: ChatbotMode;
  messages: ChatMessage[];
  sessionType?: 'chat' | 'live_voice';
  language?: LanguageMode;
  voicePersona?: VoicePersona;
  classroomContext?: string;
}

export interface DiagnosticCheckResult {
  id: string;
  category:
    | 'runtime'
    | 'api'
    | 'memory'
    | 'database'
    | 'curriculum'
    | 'voice'
    | 'navigation';
  name: string;
  status: 'passed' | 'warning' | 'failed';
  detail: string;
  remediation?: string;
  checkedAt: string;
}

export interface VersionCheckpoint {
  id: string;
  label: string;
  createdAt: string;
  integrityHash: string;
  notes: string;
}

export type BoardSurfaceTheme = 'blackboard' | 'whiteboard';

export type TeachingSpeed = 'slow' | 'normal' | 'fast';

export type BoardBlockKind =
  | 'explanation'
  | 'formula'
  | 'derivation_step'
  | 'numerical_step'
  | 'definition'
  | 'equation'
  | 'diagram'
  | 'code'
  | 'grammar'
  | 'question'
  | 'highlight';

export type BoardSemanticTone =
  | 'default'
  | 'formula'
  | 'example'
  | 'important'
  | 'correction'
  | 'question'
  | 'code';

export type BoardActionOp = 'append' | 'replace' | 'highlight' | 'erase_block' | 'clear';

export interface DigitalBoardBlock {
  id: string;
  kind: BoardBlockKind;
  tone: BoardSemanticTone;
  title?: string;
  content: string;
  lines?: string[];
  codeLanguage?: 'python' | 'sql' | 'algorithm';
  equationParts?: {
    reactants: string;
    conditions?: string;
    products: string;
  };
  highlightTerms?: string[];
  diagramId?: DiagramId;
  generatedDiagram?: GeneratedDiagramSpec;
  isHighlighted?: boolean;
  isCorrected?: boolean;
  replacesText?: string;
  topicTag?: string;
  createdAt: string;
}

export interface BoardCueEvent {
  id: string;
  op: BoardActionOp;
  blockId?: string;
  block?: DigitalBoardBlock;
  delayRatio: number;
  spokenCueAnchor?: string;
}

export interface ClassroomQuestionLogItem {
  id: string;
  question: string;
  studentAnswer: string;
  status: 'correct' | 'partial' | 'incorrect' | 'skipped';
  topic: string;
  feedback: string;
  timestamp: string;
}

export interface ClassroomAssessmentItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface ClassroomSessionRecord {
  id: string;
  subjectId: SubjectId;
  chapterId: string;
  chapterTitle: string;
  topicsCovered: string[];
  currentTopicIndex: number;
  difficulty: DifficultyLevel;
  teachingStyle: TeachingStyle;
  teachingSpeed: TeachingSpeed;
  boardTheme: BoardSurfaceTheme;
  boardBlocks: DigitalBoardBlock[];
  turns: {
    id: string;
    speaker: 'arora' | 'student';
    text: string;
    formula?: string;
    provider?: string;
  }[];
  correctCount: number;
  incorrectCount: number;
  questionLog: ClassroomQuestionLogItem[];
  status: 'active' | 'paused' | 'completed';
  currentQuestion: string;
  lessonSummary?: string;
  revisionNotes?: string;
  assessment?: ClassroomAssessmentItem[];
  createdAt: string;
  updatedAt: string;
}

