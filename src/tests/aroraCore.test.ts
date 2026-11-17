import { describe, expect, it } from 'vitest';
import {
  createAcademicYearRecord,
  INITIAL_ACADEMIC_YEARS,
} from '../data/academicYears';
import { CBSE_CLASS_12_CURRICULUM } from '../data/curriculum';
import { buildMockTestQuestions, getAllQuestions } from '../data/questionBank';
import {
  getGuidesForSubject,
  getSubjectPyqs,
  LAST_6_YEARS_PYQ_ARCHIVE,
  PAPER_GENERATION_GUIDES,
  PYQ_LAST_6_YEARS,
} from '../data/pyqAndGuides';
import {
  buildSubjectPyqPaperStore,
  retrieveDynamicPyqSolution,
} from '../components/PyqAndGuidesZone';
import {
  areTelemetrySnapshotsEqual,
  deriveRamProfile,
  determineOperatingMode,
} from '../engines/deviceOptimizer';
import {
  detectDiagramRequest,
  sanitizeSvgMarkup,
} from '../engines/diagramUtils';
import { shouldTriggerHaptics } from '../engines/hapticsEngine';
import { sanitizeAroraOutput } from '../engines/identityGuard';
import {
  AroraLiveAudioClient,
  computeNormalizedAudioEnergy,
  float32ToPcm16Buffer,
  resampleToTargetRate,
} from '../engines/liveAudioClient';
import { buildLiveChatSession } from '../engines/liveSessionArchive';
import {
  createRequestTimeoutGuard,
  createStreamCoalescer,
} from '../engines/streamCoalescer';
import {
  formatSafeCloudError,
  shouldEnableSearchGrounding,
} from '../../server/geminiService';
import { polishHumanChatText } from '../components/RichMessageRenderer';
import { sampleAnalyserFrequencyData } from '../components/VoiceWaveVisualizer';
import {
  applyBoardCues,
  buildSubjectLaunchCues,
  createBoardCueScheduler,
  exportBoardNotesMarkdown,
  teachingSpeedToRateMultiplier,
} from '../engines/classroomSyncEngine';
import { analyzeQueryIntelligence } from '../engines/intelligenceRouter';
import {
  buildQuestionBankAuditReport,
  deduplicateQuestions,
  detectSparseChapters,
  evaluatePracticeResponseLocal,
  filterAndSortQuestions,
  getDisplaySourceCategory,
  paginateQuestions,
  parseUploadedStudyQuestions,
} from '../engines/questionBankEngine';
import {
  detectGlobalNavigationCommand,
  detectSpokenInteractiveCommand,
  formatTextForNaturalSpeech,
  parseSmartVoiceCommand,
} from '../engines/voiceEngine';

describe('ARORA AI Core Educational & Adaptive Engine Tests', () => {
  it('validates 100% full-fledged CBSE Class 12 curriculum, unit marks, and multi-website portals across all 6 subjects', () => {
    expect(CBSE_CLASS_12_CURRICULUM).toHaveLength(6);
    const ids = CBSE_CLASS_12_CURRICULUM.map((s) => s.id);
    expect(ids).toEqual([
      'physics',
      'chemistry',
      'mathematics',
      'biology',
      'english',
      'computer_science',
    ]);

    const expectedCounts: Record<string, number> = {
      physics: 14,
      chemistry: 10,
      mathematics: 13,
      biology: 13,
      english: 21,
      computer_science: 10,
    };

    const allChapterIds = new Set<string>();

    for (const sub of CBSE_CLASS_12_CURRICULUM) {
      expect(sub.chapters.length).toBe(expectedCounts[sub.id]);
      expect(sub.fullSyllabusOverview?.length ?? 0).toBeGreaterThan(40);
      expect(sub.unitWiseWeightage?.length ?? 0).toBeGreaterThanOrEqual(3);
      const unitSum = (sub.unitWiseWeightage ?? []).reduce((acc, u) => acc + u.marks, 0);
      expect(unitSum).toBe(sub.theoryMarks);

      expect(sub.trustedWebResources?.length ?? 0).toBeGreaterThanOrEqual(5);
      for (const site of sub.trustedWebResources ?? []) {
        expect(site.url.startsWith('https://')).toBe(true);
        expect(site.title.length).toBeGreaterThan(3);
      }

      for (const ch of sub.chapters) {
        expect(allChapterIds.has(ch.id)).toBe(false);
        allChapterIds.add(ch.id);
        expect(ch.title.length).toBeGreaterThan(2);
        expect(ch.topics.length).toBeGreaterThan(0);
        expect(ch.concepts.length).toBeGreaterThan(0);
        expect(ch.learningOutcomes.length).toBeGreaterThan(0);
      }
    }

    for (const q of [...getAllQuestions(2027), ...LAST_6_YEARS_PYQ_ARCHIVE]) {
      expect(allChapterIds.has(q.chapterId)).toBe(true);
    }
  });

  it('supports Year-Wise CBSE Academic Library for 2027-2032 and dynamic future years with immutable archives', () => {
    const years = INITIAL_ACADEMIC_YEARS.map((y) => y.year);
    expect(years).toEqual(expect.arrayContaining([2027, 2028, 2029, 2030, 2031, 2032]));

    const past2026 = createAcademicYearRecord(2026);
    expect(past2026.isImmutableArchive).toBe(true);
    expect(past2026.status).toBe('archived_verified');

    const future2035 = createAcademicYearRecord(2035);
    expect(future2035.status).toBe('pending_verification');
    expect(future2035.isImmutableArchive).toBe(false);
  });

  it('assembles non-empty mock tests matching exact 20, 30, 40, 70, and 80 mark targets', () => {
    const markTargets: (20 | 30 | 40 | 70 | 80)[] = [20, 30, 40, 70, 80];
    for (const marks of markTargets) {
      const qs = buildMockTestQuestions({
        id: `test-${marks}`,
        title: `Test ${marks}`,
        testType: 'Board-Pattern',
        academicYear: 2027,
        subjectId: 'physics',
        totalMarks: marks,
        durationMinutes: 90,
        difficulty: 'Mixed',
      });
      expect(qs.length).toBeGreaterThan(0);
      const sum = qs.reduce((acc, q) => acc + q.marks, 0);
      expect(sum).toBe(marks);
    }
    expect(getAllQuestions(2027).length).toBeGreaterThan(100);
  });

  it('never picks ultra profile on 4 GB RAM or high memory pressure', () => {
    const eco = deriveRamProfile(4, 1.8, 'low', 'auto');
    expect(eco.activeProfile).toBe('eco_3_4gb');
    expect(eco.animationComplexity).toBe('minimal');

    const degraded8gb = deriveRamProfile(8, 1.1, 'high', 'auto');
    expect(degraded8gb.activeProfile).toBe('eco_3_4gb');

    expect(determineOperatingMode(false, '4g', 10, false, true)).toBe('reconnecting');
    expect(determineOperatingMode(true, '2g', 0.2, false, true)).toBe('weak_network');
    expect(determineOperatingMode(true, '4g', 12, false, true)).toBe('online');
  });

  it('respects reduced motion, eco memory pressure, low battery, and user preference for haptics', () => {
    expect(
      shouldTriggerHaptics({
        hapticsEnabled: true,
        prefersReducedMotion: true,
        activeProfile: 'ultra_8gb_plus',
        memoryPressure: 'low',
      }),
    ).toBe(false);

    expect(
      shouldTriggerHaptics({
        hapticsEnabled: true,
        prefersReducedMotion: false,
        activeProfile: 'eco_3_4gb',
        memoryPressure: 'high',
      }),
    ).toBe(false);

    expect(
      shouldTriggerHaptics({
        hapticsEnabled: true,
        prefersReducedMotion: false,
        activeProfile: 'balanced_6gb',
        memoryPressure: 'low',
        batteryLevelPercent: 12,
        batteryCharging: false,
      }),
    ).toBe(false);

    expect(
      shouldTriggerHaptics({
        hapticsEnabled: false,
        prefersReducedMotion: false,
        activeProfile: 'ultra_8gb_plus',
      }),
    ).toBe(false);

    expect(
      shouldTriggerHaptics({
        hapticsEnabled: true,
        prefersReducedMotion: false,
        activeProfile: 'eco_3_4gb',
        memoryPressure: 'moderate',
        batteryLevelPercent: 55,
        batteryCharging: false,
      }),
    ).toBe(true);
  });

  it('sanitizes responses and live transcripts to hide Gemini/Google identity while preserving ARORA AI and creator attribution', () => {
    const maskedModel = sanitizeAroraOutput('I am Gemini 2.5 Pro trained by Google DeepMind.');
    expect(maskedModel.toLowerCase()).not.toContain('gemini');
    expect(maskedModel.toLowerCase()).not.toContain('google');
    expect(maskedModel).toContain('ARORA AI');

    const maskedCasual = sanitizeAroraOutput('Google AI powers my neural core.');
    expect(maskedCasual.toLowerCase()).not.toContain('google ai');
    expect(maskedCasual).toContain('ARORA AI');

    const creatorReply = sanitizeAroraOutput('ARORA AI was created by Jey Prashith GK.');
    expect(creatorReply).toContain('ARORA AI');
    expect(creatorReply).toContain('Jey Prashith GK');
  });

  it('computes bounded normalized audio energy from FFT frequency bins for circular wave visualization', () => {
    expect(computeNormalizedAudioEnergy(new Uint8Array(0))).toBe(0);
    expect(computeNormalizedAudioEnergy(new Uint8Array([0, 0, 0, 0]))).toBe(0);
    const moderate = computeNormalizedAudioEnergy(new Uint8Array(64).fill(128));
    expect(moderate).toBeGreaterThan(0.5);
    expect(moderate).toBeLessThanOrEqual(1);
    const peak = computeNormalizedAudioEnergy(new Uint8Array(64).fill(255));
    expect(peak).toBe(1);
  });

  it('parses spoken Interactive Teaching Mode wake/exit phrases and commands accurately', () => {
    expect(detectSpokenInteractiveCommand('Arora, interactive mode on')).toBe('activate');
    expect(detectSpokenInteractiveCommand('Interactive mode on')).toBe('activate');
    expect(detectSpokenInteractiveCommand('Intractive mode on')).toBe('activate');
    expect(detectSpokenInteractiveCommand('Interactive mode off')).toBe('end_class');
    expect(detectSpokenInteractiveCommand('Casual mode')).toBe('end_class');
    expect(detectSpokenInteractiveCommand('Explain again')).toBe('explain_again');
    expect(detectSpokenInteractiveCommand('Repeat the formula')).toBe('repeat_formula');
    expect(detectSpokenInteractiveCommand('Next topic')).toBe('next_topic');
    expect(detectSpokenInteractiveCommand('End class')).toBe('end_class');
    expect(detectSpokenInteractiveCommand('Live mode on')).toBe('live_on');
    expect(detectSpokenInteractiveCommand('Start live chat')).toBe('live_on');
    expect(detectSpokenInteractiveCommand('Live chat')).toBe('live_on');
    expect(detectSpokenInteractiveCommand('Go live')).toBe('live_on');
    expect(detectSpokenInteractiveCommand('Live mode off')).toBe('live_off');
    expect(detectSpokenInteractiveCommand('End live chat')).toBe('live_off');
    expect(detectSpokenInteractiveCommand('Interrupt')).toBe('interrupt');
    expect(detectSpokenInteractiveCommand('Stop speaking')).toBe('interrupt');
  });

  it('sanitizes markdown and physics math symbols into fluent human-spoken text', () => {
    const cleaned = formatTextForNaturalSpeech(
      '**Gauss Law**: ε₀ flux = λ / 2π → 10^2 ```py\nx=1\n```',
    );
    expect(cleaned).not.toContain('**');
    expect(cleaned).toContain('epsilon naught');
    expect(cleaned).toContain('lambda');
    expect(cleaned).toContain('pi');
    expect(cleaned).toContain('leads to');
    expect(cleaned).toContain('10 to the power of 2');
    expect(cleaned).toContain('code example displayed on screen');
  });

  it('provides solved Last 6 Years CBSE PYQs (2021-2026) for every subject and integrates all 11 paper-generation guides', () => {
    const subjects = ['physics', 'chemistry', 'mathematics', 'biology', 'english', 'computer_science'] as const;
    for (const sub of subjects) {
      const pyqs = getSubjectPyqs(sub, 'all');
      for (const yr of PYQ_LAST_6_YEARS) {
        const match = pyqs.find((q) => q.pyqYear === yr);
        expect(match).toBeDefined();
        expect(match?.isPreviousYear).toBe(true);
        expect(match?.correctAnswer.length).toBeGreaterThan(0);
        expect(match?.explanation.length).toBeGreaterThan(10);
      }
      expect(getGuidesForSubject(sub).length).toBeGreaterThanOrEqual(6);
    }

    expect(PAPER_GENERATION_GUIDES).toHaveLength(11);

    const pyqPaper = buildMockTestQuestions({
      id: 'pyq-paper-40',
      title: 'Physics PYQ 40M',
      testType: 'Board-Pattern',
      academicYear: 2026,
      subjectId: 'physics',
      totalMarks: 40,
      durationMinutes: 75,
      difficulty: 'Mixed',
      pyqOnly: true,
      allowedSources: ['CBSE Official'],
    });
    expect(pyqPaper.reduce((acc, q) => acc + q.marks, 0)).toBe(40);
    expect(pyqPaper.some((q) => q.isPreviousYear)).toBe(true);
  });

  it('builds a subject-categorized 6-year PYQ paper store and retrieves linked solutions dynamically', () => {
    const store = buildSubjectPyqPaperStore(LAST_6_YEARS_PYQ_ARCHIVE, [
      {
        id: 'user-pyq-2025-phy',
        year: 2025,
        subjectId: 'physics',
        chapterId: 'phy-ch2',
        chapterTitle: 'Electrostatic Potential and Capacitance',
        topic: 'Equipotential Surfaces',
        marks: 2,
        difficulty: 'Easy',
        type: '2-Mark',
        sourceBook: 'User-Provided',
        sourceCategory: 'User-Provided',
        isPreviousYear: true,
        pyqYear: 2025,
        pyqPaperCode: '55/2/1 · 2025',
        questionText: 'Why are electric field lines always perpendicular to equipotential surfaces?',
        correctAnswer: 'Work done moving a charge along an equipotential surface is zero, so E cosθ = 0 ⇒ θ = 90°.',
        explanation: 'dV = -E · dr = 0 on an equipotential surface, requiring E perpendicular to dr.',
      },
    ]);

    const subjects = ['physics', 'chemistry', 'mathematics', 'biology', 'english', 'computer_science'] as const;
    for (const sub of subjects) {
      for (const yr of PYQ_LAST_6_YEARS) {
        const paper = store.papersBySubject[sub][yr];
        expect(paper).toBeDefined();
        expect(paper.questions.length).toBeGreaterThanOrEqual(1);
        for (const q of paper.questions) {
          const bySolutionId = retrieveDynamicPyqSolution(store, q.solutionId);
          const byQuestionId = retrieveDynamicPyqSolution(store, q.questionId);
          expect(bySolutionId).not.toBeNull();
          expect(byQuestionId).toEqual(bySolutionId);
          expect(bySolutionId?.verifiedAnswer.length).toBeGreaterThan(0);
          expect(bySolutionId?.explanation.length).toBeGreaterThan(10);
          expect(bySolutionId?.markingSchemeSteps.length).toBeGreaterThan(0);
        }
      }
    }

    const userResolved = retrieveDynamicPyqSolution(store, 'user-pyq-2025-phy');
    expect(userResolved?.sourceLabel).toBe('User-Provided PYQ Solution');
    expect(retrieveDynamicPyqSolution(store, 'non-existent-id')).toBeNull();
  });

  it('formats Cloud AI errors safely without leaking external URLs, raw JSON, or underlying provider names', () => {
    const quotaMsg = formatSafeCloudError(
      new Error('429 RESOURCE_EXHAUSTED quota exceeded at https://aistudio.google.com/docs/rate-limits Gemini API'),
    );
    expect(quotaMsg.toLowerCase()).not.toContain('gemini');
    expect(quotaMsg.toLowerCase()).not.toContain('google');
    expect(quotaMsg).not.toContain('http');

    const overloadMsg = formatSafeCloudError(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
      ),
    );
    expect(overloadMsg).not.toContain('{');
    expect(overloadMsg.toLowerCase()).not.toContain('gemini');
    expect(overloadMsg.toLowerCase()).toContain('high live traffic');

    const wrappedJsonMsg = formatSafeCloudError(
      new Error('{"error":{"code":400,"message":"Invalid argument passed to Gemini service"}}'),
    );
    expect(wrappedJsonMsg).not.toContain('{');
    expect(wrappedJsonMsg.toLowerCase()).not.toContain('gemini');
    expect(wrappedJsonMsg).toContain('Invalid argument passed to ARORA AI service');

    const genericMsg = formatSafeCloudError(
      new Error('Gemini model timeout on https://generativelanguage.googleapis.com/v1beta'),
    );
    expect(genericMsg.toLowerCase()).not.toContain('gemini');
    expect(genericMsg.toLowerCase()).not.toContain('google');
    expect(genericMsg).not.toContain('http');
  });

  it('reads frequency spectrum bins and normalized signal strength from Web Audio AnalyserNodes', () => {
    const empty = sampleAnalyserFrequencyData(null);
    expect(empty.energy).toBe(0);
    expect(empty.hasSignal).toBe(false);

    const mockAnalyser = {
      frequencyBinCount: 32,
      getByteFrequencyData: (arr: Uint8Array) => {
        arr.fill(180);
      },
    } as unknown as AnalyserNode;

    const sampled = sampleAnalyserFrequencyData(mockAnalyser);
    expect(sampled.bins).toHaveLength(32);
    expect(sampled.hasSignal).toBe(true);
    expect(sampled.energy).toBeGreaterThan(0.8);
    expect(sampled.energy).toBeLessThanOrEqual(1);
  });

  it('resamples 48 kHz and 44.1 kHz hardware microphone buffers accurately to 16 kHz for WebSocket streaming', () => {
    const src16k = new Float32Array([0.1, -0.2, 0.3, -0.4]);
    expect(resampleToTargetRate(src16k, 16000, 16000)).toBe(src16k);

    const src48k = new Float32Array(480);
    for (let i = 0; i < src48k.length; i += 1) {
      src48k[i] = i / 479;
    }
    const down48 = resampleToTargetRate(src48k, 48000, 16000);
    expect(down48).toHaveLength(160);
    expect(down48[0]).toBeCloseTo(0, 4);
    expect(down48[down48.length - 1]).toBeGreaterThan(0.98);

    const src44k = new Float32Array(441).fill(0.25);
    const down44 = resampleToTargetRate(src44k, 44100, 16000);
    expect(down44).toHaveLength(160);
    expect(down44[80]).toBeCloseTo(0.25, 4);
  });

  it('archives full-duplex Live Chat turns cleanly into ChatSession database records and skips empty sessions', () => {
    const empty = buildLiveChatSession({
      sessionId: 'live-empty',
      createdAt: '2026-11-15T10:00:00.000Z',
      turns: [{ id: '1', speaker: 'student', text: '   ', timestamp: '2026-11-15T10:00:01.000Z' }],
      language: 'indian_english',
      voicePersona: 'Zephyr',
    });
    expect(empty).toBeNull();

    const archived = buildLiveChatSession({
      sessionId: 'live-123',
      createdAt: '2026-11-15T10:00:00.000Z',
      turns: [
        {
          id: 't1',
          speaker: 'student',
          text: 'Explain Faraday first law in two lines',
          timestamp: '2026-11-15T10:00:02.000Z',
        },
        {
          id: 't2',
          speaker: 'arora',
          text: 'I am Gemini helping you: Whenever magnetic flux linked with a coil changes, an EMF is induced.',
          timestamp: '2026-11-15T10:00:05.000Z',
        },
      ],
      language: 'indian_english',
      voicePersona: 'Zephyr',
    });

    expect(archived).not.toBeNull();
    expect(archived?.sessionType).toBe('live_voice');
    expect(archived?.title).toContain('Explain Faraday first law');
    expect(archived?.messages).toHaveLength(2);
    expect(archived?.messages[0].role).toBe('user');
    expect(archived?.messages[1].role).toBe('assistant');
    expect(archived?.messages[1].content.toLowerCase()).not.toContain('gemini');
    expect(archived?.messages[1].content).toContain('ARORA AI');
  });

  it('strips raw LaTeX/computer syntax into natural human-readable notation while preserving explicit code blocks', () => {
    const raw =
      'Flux formula: $$\\Phi = \\frac{q}{\\varepsilon_0} \\times 2 \\rightarrow 10^2$$ and code:\n```python\nx = 1 / 2\n```';
    const polished = polishHumanChatText(raw);
    expect(polished).not.toContain('$$');
    expect(polished).not.toContain('\\frac');
    expect(polished).not.toContain('\\varepsilon_0');
    expect(polished).toContain('(q) / (ε₀)');
    expect(polished).toContain('× 2 → 10²');
    expect(polished).toContain('```python\nx = 1 / 2\n```');
  });

  it('detects diagram requests cleanly without false positives and extracts topic names', () => {
    const microscope = detectDiagramRequest(
      'Please draw a neat labelled ray diagram of a compound microscope with explanation',
    );
    expect(microscope.wantsDiagram).toBe(true);
    expect(microscope.cleanTopic.toLowerCase()).toContain('compound microscope');

    const rectifier = detectDiagramRequest('Circuit diagram of full wave rectifier');
    expect(rectifier.wantsDiagram).toBe(true);
    expect(rectifier.cleanTopic.toLowerCase()).toContain('full wave rectifier');

    const sperm = detectDiagramRequest('Show the structure of human sperm');
    expect(sperm.wantsDiagram).toBe(true);
    expect(sperm.cleanTopic.toLowerCase()).toContain('human sperm');

    const falsePositiveDrawback = detectDiagramRequest('What is the main drawback of Rutherford model?');
    expect(falsePositiveDrawback.wantsDiagram).toBe(false);

    const falsePositivePython = detectDiagramRequest('Explain Stack data structure in Python');
    expect(falsePositivePython.wantsDiagram).toBe(false);
  });

  it('sanitizes generated SVG diagrams against scripts/handlers/identity leaks while enforcing responsive viewBox', () => {
    const dirtySvg = `\`\`\`svg
      <svg width="800" height="480" onload="alert(1)">
        <script>alert("xss")</script>
        <foreignObject><div>evil</div></foreignObject>
        <rect x="0" y="0" width="800" height="480" fill="#0b1220" onclick="hack()" />
        <path d="M 100 100 L 400 200" stroke="#38bdf8" />
        <text x="120" y="90">Gemini Optical Axis</text>
      </svg>
    \`\`\``;

    const clean = sanitizeSvgMarkup(dirtySvg);
    expect(clean.toLowerCase()).not.toContain('<script');
    expect(clean.toLowerCase()).not.toContain('foreignobject');
    expect(clean.toLowerCase()).not.toContain('onload=');
    expect(clean.toLowerCase()).not.toContain('onclick=');
    expect(clean.toLowerCase()).not.toContain('gemini');
    expect(clean).toContain('ARORA AI Optical Axis');
    expect(clean).toContain('viewBox="0 0 800 480"');
    expect(clean).toContain('<path');

    expect(sanitizeSvgMarkup('<svg><text>No shapes here</text></svg>')).toBe('');
  });

  it('parses global hands-free navigation commands across workspaces and subjects without hijacking study questions', () => {
    const syllabusCmd = detectGlobalNavigationCommand('Arora, show me the syllabus');
    expect(syllabusCmd?.target).toBe('curriculum');
    expect(syllabusCmd?.subjectId).toBeUndefined();

    const chemSyllabus = detectGlobalNavigationCommand('Hey Arora, open Chemistry syllabus');
    expect(chemSyllabus?.target).toBe('curriculum');
    expect(chemSyllabus?.subjectId).toBe('chemistry');

    const startPhysicsMock = detectGlobalNavigationCommand(
      'Arora, start a mock test for Physics',
    );
    expect(startPhysicsMock?.target).toBe('mock_tests');
    expect(startPhysicsMock?.subjectId).toBe('physics');
    expect(startPhysicsMock?.autoStartMockTest).toBe(true);

    const startMathsPyqMock = detectGlobalNavigationCommand(
      'Arora, start a 70 marks PYQ mock test in Maths',
    );
    expect(startMathsPyqMock?.target).toBe('mock_tests');
    expect(startMathsPyqMock?.subjectId).toBe('mathematics');
    expect(startMathsPyqMock?.totalMarks).toBe(70);
    expect(startMathsPyqMock?.pyqOnly).toBe(true);
    expect(startMathsPyqMock?.autoStartMockTest).toBe(true);

    const pyqCmd = detectGlobalNavigationCommand('Arora, show previous year questions');
    expect(pyqCmd?.target).toBe('pyq_guides');

    const chatCmd = detectGlobalNavigationCommand('Arora, open Arora Chat');
    expect(chatCmd?.target).toBe('chatbot');

    const studyQuestion = detectGlobalNavigationCommand(
      'What is the syllabus weightage of Electrostatics in Physics?',
    );
    expect(studyQuestion).toBeUndefined();
  });

  it('parses multi-domain Smart Voice Commands for controls, diagrams, Live Chat, and queries while leaving plain study questions conversational', () => {
    expect(parseSmartVoiceCommand('Arora, go back')?.kind).toBe('history_back');
    expect(parseSmartVoiceCommand('Mute voice')?.kind).toBe('stop_speech');

    const darkAction = parseSmartVoiceCommand('Switch to dark mode');
    expect(darkAction?.kind).toBe('set_theme');
    if (darkAction?.kind === 'set_theme') expect(darkAction.theme).toBe('dark');

    const lightAction = parseSmartVoiceCommand('Enable light theme');
    expect(lightAction?.kind).toBe('set_theme');
    if (lightAction?.kind === 'set_theme') expect(lightAction.theme).toBe('light');

    const langAction = parseSmartVoiceCommand('Speak in Tanglish mode');
    expect(langAction?.kind).toBe('set_language');
    if (langAction?.kind === 'set_language') expect(langAction.language).toBe('tanglish');

    const personaAction = parseSmartVoiceCommand('Switch voice to Kore');
    expect(personaAction?.kind).toBe('set_voice_persona');
    if (personaAction?.kind === 'set_voice_persona') expect(personaAction.persona).toBe('Kore');

    expect(parseSmartVoiceCommand('Arora, start live chat')?.kind).toBe('launch_live_chat');

    const diagramAction = parseSmartVoiceCommand('Arora, draw a diagram of compound microscope');
    expect(diagramAction?.kind).toBe('draw_diagram');
    if (diagramAction?.kind === 'draw_diagram') {
      expect(diagramAction.topic.toLowerCase()).toContain('compound microscope');
    }

    const askAction = parseSmartVoiceCommand("Arora, ask about Kirchhoff's voltage law");
    expect(askAction?.kind).toBe('ask_arora');
    if (askAction?.kind === 'ask_arora') {
      expect(askAction.query.toLowerCase()).toContain('kirchhoff');
    }

    const navAction = parseSmartVoiceCommand('Arora, start a 70 marks Physics mock test');
    expect(navAction?.kind).toBe('navigate');

    expect(parseSmartVoiceCommand("Explain Newton's third law")).toBeUndefined();
  });

  it('activates Google Search Grounding only for Research mode or explicit recency/online queries to eliminate casual AI latency', () => {
    expect(shouldEnableSearchGrounding("Explain Ohm's law for Class 12", 'Quick Answer')).toBe(false);
    expect(shouldEnableSearchGrounding('Derive Gauss law for a charged wire', 'Deep Explanation')).toBe(false);
    expect(shouldEnableSearchGrounding('Write a Python stack program', 'Coding')).toBe(false);

    expect(shouldEnableSearchGrounding('Explain quantum dots', 'Research')).toBe(true);
    expect(shouldEnableSearchGrounding('What is the latest 2026 CBSE circular on Physics practicals?')).toBe(true);
    expect(shouldEnableSearchGrounding('Search online for official NCERT syllabus update today')).toBe(true);
  });

  it('encodes normalized Float32 audio into clamped binary Int16 PCM buffers without distortion', () => {
    const input = new Float32Array([-1.5, -0.5, 0, 0.5, 1.5]);
    const buf = float32ToPcm16Buffer(input);
    expect(buf.byteLength).toBe(10);
    const view = new Int16Array(buf);
    expect(view[0]).toBe(-32768);
    expect(view[1]).toBe(-16384);
    expect(view[2]).toBe(0);
    expect(view[3]).toBe(16383);
    expect(view[4]).toBe(32767);
  });

  it('coalesces high-frequency SSE chunks with zero dropped characters and enforces first-byte timeouts', async () => {
    const flushes: string[] = [];
    const coalescer = createStreamCoalescer(
      (txt) => flushes.push(txt),
      { flushIntervalMs: 30, sanitize: sanitizeAroraOutput },
    );

    coalescer.push('Hello ');
    coalescer.push('Gemini ');
    coalescer.push('student!');
    // Not flushed synchronously on every chunk
    expect(flushes.length).toBe(0);

    const finalText = coalescer.flushNow();
    expect(flushes.length).toBe(1);
    expect(finalText).toContain('Hello ');
    expect(finalText.toLowerCase()).not.toContain('gemini');
    expect(finalText).toContain('ARORA AI');

    coalescer.cancel();
    coalescer.push('should-be-ignored');
    expect(coalescer.getText()).toBe(finalText);

    const timeoutGuard = createRequestTimeoutGuard(undefined, 25);
    expect(timeoutGuard.didTimeout()).toBe(false);
    await new Promise((r) => setTimeout(r, 45));
    expect(timeoutGuard.didTimeout()).toBe(true);
    expect(timeoutGuard.signal.aborted).toBe(true);
    timeoutGuard.cleanup();

    const parentCtrl = new AbortController();
    const fastGuard = createRequestTimeoutGuard(parentCtrl.signal, 200);
    fastGuard.markFirstByte();
    parentCtrl.abort();
    expect(fastGuard.signal.aborted).toBe(true);
    expect(fastGuard.didTimeout()).toBe(false);
    fastGuard.cleanup();
  });

  it('detects significant telemetry changes for re-render avoidance and cleans up Live Audio client safely', () => {
    const base = {
      totalRamGb: 4,
      estimatedAvailableRamGb: 1.7,
      jsHeapUsedMb: 42,
      jsHeapLimitMb: 512,
      memoryPressure: 'moderate' as const,
      cpuCores: 4,
      architecture: 'ARM64',
      platform: 'Android',
      androidVersion: 'Android 13',
      storageUsedMb: 12,
      storageQuotaMb: 2048,
      batteryLevelPercent: 80,
      batteryCharging: false,
      networkEffectiveType: '4g',
      networkDownlinkMbps: 10,
      isOnline: true,
      operatingMode: 'online' as const,
      activeProfile: 'eco_3_4gb' as const,
      manualTierOverride: 'auto' as const,
      localModelSpec: 'Quantized 0.5B',
      maxContextTurns: 4,
      maxCacheEntries: 16,
      animationComplexity: 'minimal' as const,
      modelLoadedInMemory: true,
    };

    expect(areTelemetrySnapshotsEqual(base, { ...base, jsHeapUsedMb: 44 })).toBe(true);
    expect(
      areTelemetrySnapshotsEqual(base, { ...base, memoryPressure: 'high' }),
    ).toBe(false);

    const client = new AroraLiveAudioClient({
      onReady: () => {},
      onInputTranscript: () => {},
      onOutputTranscript: () => {},
      onAudioStart: () => {},
      onInterrupted: () => {},
      onTurnComplete: () => {},
      onError: () => {},
      onClose: () => {},
    });
    expect(client.isAudioWorkletActive()).toBe(false);
    expect(client.sampleAudioTelemetry()).toEqual({
      inputLevel: 0,
      outputLevel: 0,
      inputBins: null,
      outputBins: null,
    });
    expect(() => client.setMicPaused(true)).not.toThrow();
    expect(() => client.setMuted(true)).not.toThrow();
    expect(() => client.interruptPlayback(false)).not.toThrow();
    expect(() => client.disconnect()).not.toThrow();
  });

  it('recognizes all Virtual Classroom natural student voice commands cleanly', () => {
    expect(detectSpokenInteractiveCommand('Open virtual classroom')).toBe('activate');
    expect(detectSpokenInteractiveCommand('Clear the board')).toBe('clear_board');
    expect(detectSpokenInteractiveCommand('Write that on the board')).toBe('write_on_board');
    expect(detectSpokenInteractiveCommand('Zoom in')).toBe('zoom_in');
    expect(detectSpokenInteractiveCommand('Zoom out')).toBe('zoom_out');
    expect(detectSpokenInteractiveCommand('Reset zoom')).toBe('reset_zoom');
    expect(detectSpokenInteractiveCommand('Solve step by step')).toBe('solve_step_by_step');
    expect(detectSpokenInteractiveCommand('Slow down')).toBe('slow_down');
    expect(detectSpokenInteractiveCommand('Speed up')).toBe('speed_up');
    expect(detectSpokenInteractiveCommand('Ask me a question')).toBe('ask_question');
    expect(detectSpokenInteractiveCommand('Give another example')).toBe('give_example');
    expect(detectSpokenInteractiveCommand('Move to the next topic')).toBe('next_topic');
    expect(detectSpokenInteractiveCommand('Pause the class')).toBe('pause');
    expect(detectSpokenInteractiveCommand('Resume the class')).toBe('resume');
  });

  it('synchronizes board cues with speech progress fraction, tracks corrections, and cancels cleanly', () => {
    const cues = [
      {
        id: 'c1',
        op: 'append' as const,
        delayRatio: 0.1,
        block: {
          id: 'b1',
          kind: 'formula' as const,
          tone: 'formula' as const,
          title: 'Initial Formula',
          content: 'V = I + R',
          createdAt: '2026-11-16T10:00:00.000Z',
        },
      },
      {
        id: 'c2',
        op: 'replace' as const,
        blockId: 'b1',
        delayRatio: 0.5,
        block: {
          id: 'b1',
          kind: 'formula' as const,
          tone: 'formula' as const,
          title: 'Corrected Formula',
          content: 'V = I × R',
          createdAt: '2026-11-16T10:00:01.000Z',
        },
      },
      {
        id: 'c3',
        op: 'append' as const,
        delayRatio: 0.85,
        block: {
          id: 'b2',
          kind: 'question' as const,
          tone: 'question' as const,
          title: 'Your Turn',
          content: 'What is R if V = 12 V and I = 3 A?',
          createdAt: '2026-11-16T10:00:02.000Z',
        },
      },
    ];

    let boardState: ReturnType<typeof applyBoardCues> = { blocks: [], activeBlockId: null };
    const scheduler = createBoardCueScheduler(cues, (ready) => {
      boardState = applyBoardCues(boardState.blocks, ready);
    });

    scheduler.updateProgress(0.05);
    expect(boardState.blocks).toHaveLength(0);

    scheduler.updateProgress(0.15);
    expect(boardState.blocks).toHaveLength(1);
    expect(boardState.blocks[0].content).toBe('V = I + R');

    scheduler.updateProgress(0.55);
    expect(boardState.blocks).toHaveLength(1);
    expect(boardState.blocks[0].isCorrected).toBe(true);
    expect(boardState.blocks[0].replacesText).toBe('V = I + R');
    expect(boardState.blocks[0].content).toBe('V = I × R');

    expect(scheduler.getRemainingCount()).toBe(1);
    scheduler.flushRemaining();
    expect(boardState.blocks).toHaveLength(2);
    expect(boardState.blocks[1].kind).toBe('question');
    expect(scheduler.getRemainingCount()).toBe(0);

    // Cancellation must block subsequent late cue dispatches
    const lateDispatched: number[] = [];
    const cancelledScheduler = createBoardCueScheduler(cues, (ready) =>
      lateDispatched.push(ready.length),
    );
    cancelledScheduler.cancel();
    cancelledScheduler.updateProgress(1);
    cancelledScheduler.flushRemaining();
    expect(lateDispatched).toHaveLength(0);

    expect(teachingSpeedToRateMultiplier('slow')).toBeLessThan(1);
    expect(teachingSpeedToRateMultiplier('normal')).toBe(1);
    expect(teachingSpeedToRateMultiplier('fast')).toBeGreaterThan(1);
  });

  it('builds subject-adapted Virtual Classroom launch cues across all 6 CBSE Class 12 subjects and exports Markdown notes', () => {
    for (const sub of CBSE_CLASS_12_CURRICULUM) {
      const ch = sub.chapters[0];
      const cues = buildSubjectLaunchCues(
        sub.id,
        ch,
        ch.topics[0],
        `Test check on ${ch.topics[0]}?`,
      );
      expect(cues.some((c) => c.op === 'clear')).toBe(true);
      expect(cues.some((c) => c.block?.kind === 'question')).toBe(true);
      if (sub.id === 'computer_science') {
        expect(cues.some((c) => c.block?.kind === 'code')).toBe(true);
      }
      if (sub.id === 'english') {
        expect(cues.some((c) => c.block?.kind === 'grammar')).toBe(true);
      }
    }

    const csSub = CBSE_CLASS_12_CURRICULUM.find((s) => s.id === 'computer_science')!;
    const csResult = applyBoardCues(
      [],
      buildSubjectLaunchCues('computer_science', csSub.chapters[0], csSub.chapters[0].topics[0], 'Why use base cases?'),
    );
    const md = exportBoardNotesMarkdown({
      subjectName: csSub.name,
      chapterTitle: csSub.chapters[0].title,
      topic: csSub.chapters[0].topics[0],
      blocks: csResult.blocks,
      questionLog: [
        {
          id: 'q1',
          question: 'Why use base cases?',
          studentAnswer: 'To stop infinite recursion.',
          status: 'correct',
          topic: csSub.chapters[0].topics[0],
          feedback: 'Spot on!',
          timestamp: '2026-11-16T10:05:00.000Z',
        },
      ],
      lessonSummary: 'Mastered Python recursion & board notes.',
    });
    expect(md).toContain('# ARORA AI Virtual Classroom Notes');
    expect(md).toContain('```python');
    expect(md).toContain('To stop infinite recursion.');
  });

  it('routes adaptive response styles, multi-tier thinking depth, follow-ups, missing data, and misconceptions cleanly', () => {
    const greeting = analyzeQueryIntelligence({ message: 'Vanakkam Arora', mode: 'Auto (Smart)' });
    expect(greeting.thinkingDepth).toBe('LOW');
    expect(greeting.responseStyle).toBe('quick_answer');

    const simpleTanglish = analyzeQueryIntelligence({
      message: 'Gauss law simple-a puriyura mathiri sollu',
      mode: 'Auto (Smart)',
    });
    expect(simpleTanglish.responseStyle).toBe('simple_explanation');
    expect(simpleTanglish.primaryDomain).toBe('physics');
    expect(simpleTanglish.isCodingRequest).toBe(false);

    const numericalChem = analyzeQueryIntelligence({
      message: 'Calculate EMF using Nernst equation step by step at 298 K for [Mg2+]=0.01M',
      mode: 'Auto (Smart)',
    });
    expect(numericalChem.responseStyle).toBe('step_by_step');
    expect(numericalChem.primaryDomain).toBe('chemistry');
    expect(numericalChem.thinkingDepth).toBe('HIGH');
    expect(numericalChem.crossSubjectBridge).toBeTruthy();

    const boardExamAns = analyzeQueryIntelligence({
      message: 'Explain p-n junction full-wave rectifier for a 5 mark CBSE board exam answer',
      mode: 'Auto (Smart)',
    });
    expect(boardExamAns.responseStyle).toBe('board_exam');

    const deepProof = analyzeQueryIntelligence({
      message: 'Give a complete derivation of lens maker formula and analyze thin lens approximations',
      mode: 'Auto (Smart)',
    });
    expect(deepProof.thinkingDepth).toBe('XHIGH');

    const codingTask = analyzeQueryIntelligence({
      message: 'Debug this Python recursion function for Stack pop',
      mode: 'Auto (Smart)',
    });
    expect(codingTask.isCodingRequest).toBe(true);
    expect(codingTask.primaryDomain).toBe('computer_science');
    expect(codingTask.thinkingDepth).toBe('HIGH');

    const followUp = analyzeQueryIntelligence({
      message: 'athu eppadi?',
      mode: 'Auto (Smart)',
      historyLength: 4,
    });
    expect(followUp.isFollowUpOrFragment).toBe(true);

    const missingData = analyzeQueryIntelligence({
      message: 'Calculate force on the block',
      mode: 'Problem Solving',
      historyLength: 0,
    });
    expect(missingData.hasMissingDataRisk).toBe(true);

    const trapPremise = analyzeQueryIntelligence({
      message: 'Since electric current is a vector with magnitude and direction, how do we add currents?',
      mode: 'Auto (Smart)',
    });
    expect(trapPremise.hasMisconceptionRisk).toBe(true);
  });

  it('provides deduplicated, provenance-verified CBSE Question Bank coverage across all 6 subjects, sample papers, MSQs, derivations, and practicals', () => {
    const all2027 = getAllQuestions(2027);
    const dedupeCheck = deduplicateQuestions(all2027);
    expect(dedupeCheck.duplicateIdsRemoved).toBe(0);
    expect(dedupeCheck.duplicateHashesRemoved).toBe(0);

    const audit = buildQuestionBankAuditReport(all2027, 2027);
    expect(audit.totalIndexed).toBeGreaterThan(500);
    expect(audit.curatedOfficialPyqCount).toBeGreaterThanOrEqual(30);
    expect(audit.officialSamplePaperCount).toBeGreaterThanOrEqual(5);
    expect(audit.aiMarkedAsPyqViolations).toBe(0);
    expect(audit.answerIntegrityIssues).toBe(0);

    for (const row of audit.subjectBreakdown) {
      expect(row.chaptersCovered).toBe(row.chaptersTotal);
      expect(row.total).toBeGreaterThan(20);
    }

    const typesPresent = new Set(all2027.map((q) => q.type));
    expect(typesPresent.has('MCQ')).toBe(true);
    expect(typesPresent.has('MSQ')).toBe(true);
    expect(typesPresent.has('Assertion-Reason')).toBe(true);
    expect(typesPresent.has('Very Short Answer')).toBe(true);
    expect(typesPresent.has('Derivation')).toBe(true);
    expect(typesPresent.has('Practical-Based')).toBe(true);
    expect(typesPresent.has('4-Mark Case Study')).toBe(true);
    expect(typesPresent.has('5-Mark')).toBe(true);

    const sampleItem = all2027.find((q) => q.isSamplePaper);
    expect(sampleItem).toBeDefined();
    if (sampleItem) {
      expect(getDisplaySourceCategory(sampleItem)).toBe('Official CBSE Sample Paper');
    }
  });

  it('supports topic filtering, sorting, true pagination, MSQ/subjective practice evaluation, upload deduplication, and gap detection', () => {
    const all = getAllQuestions(2027);
    const filtered = filterAndSortQuestions(all, {
      subjectId: 'physics',
      chapterId: 'all',
      topicQuery: 'Gauss',
      marks: 'all',
      difficulty: 'all',
      type: 'All',
      sourceBook: 'All',
      provenance: 'All',
      practiceStatus: 'all',
      searchQuery: '',
      sortBy: 'marks_desc',
    });
    expect(filtered.length).toBeGreaterThan(0);
    for (let i = 1; i < filtered.length; i++) {
      expect(filtered[i - 1].marks).toBeGreaterThanOrEqual(filtered[i].marks);
    }

    const page1 = paginateQuestions(all, 1, 20);
    expect(page1.items).toHaveLength(20);
    expect(page1.totalPages).toBeGreaterThan(10);

    // MSQ exact & partial grading
    const msq = all.find((q) => q.type === 'MSQ' && q.correctOptionIndices?.length);
    expect(msq).toBeDefined();
    if (msq && msq.correctOptionIndices) {
      const exact = evaluatePracticeResponseLocal(msq, '', msq.correctOptionIndices);
      expect(exact.status).toBe('correct');
      const partial = evaluatePracticeResponseLocal(msq, '', [msq.correctOptionIndices[0]]);
      expect(partial.status).toBe('partial');
    }

    // Authorized material import with duplicate detection
    const hashes = new Set<string>();
    const rawUpload = `Q: What is the SI unit of electric flux?\nA: N·m²/C (or V·m).\n\nQ: What is the SI unit of electric flux?\nA: N·m²/C (or V·m).`;
    const parsed = parseUploadedStudyQuestions(
      rawUpload,
      { subjectId: 'physics', chapterId: 'phy-ch1', year: 2027 },
      hashes,
    );
    expect(parsed.imported).toHaveLength(1);
    expect(parsed.skippedDuplicates).toBe(1);
    expect(getDisplaySourceCategory(parsed.imported[0])).toBe('Student Uploaded Material');

    const gaps = detectSparseChapters(all, 12);
    expect(Array.isArray(gaps)).toBe(true);
  });
});
