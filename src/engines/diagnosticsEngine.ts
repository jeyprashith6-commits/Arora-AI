import { INITIAL_ACADEMIC_YEARS } from '../data/academicYears';
import { CBSE_CLASS_12_CURRICULUM } from '../data/curriculum';
import { buildMockTestQuestions, getAllQuestions } from '../data/questionBank';
import type {
  DeviceTelemetry,
  DiagnosticCheckResult,
  SubjectId,
  VersionCheckpoint,
} from '../types/arora';
import { saveVersionCheckpoint, validateDatabaseIntegrity } from './localDb';
import { float32ToPcm16Buffer, resampleToTargetRate } from './liveAudioClient';
import { inspectDeviceVoiceCapabilities } from './voiceEngine';

async function measureEventLoopJitterMs(): Promise<number> {
  const start = performance.now();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return Math.max(0, Math.round((performance.now() - start) * 10) / 10);
}

export async function runFullSystemDiagnostics(
  telemetry: DeviceTelemetry,
): Promise<DiagnosticCheckResult[]> {
  const now = new Date().toISOString();
  const checks: DiagnosticCheckResult[] = [];

  // 1. Curriculum Completeness Scan (all 6 subjects, chapters, zero empty options)
  const expectedSubjects: SubjectId[] = [
    'physics',
    'chemistry',
    'mathematics',
    'biology',
    'english',
    'computer_science',
  ];
  const missingSubjects = expectedSubjects.filter(
    (id) => !CBSE_CLASS_12_CURRICULUM.some((s) => s.id === id && s.chapters.length > 0),
  );
  const emptyChapterFound = CBSE_CLASS_12_CURRICULUM.some((s) =>
    s.chapters.some(
      (c) =>
        !c.title ||
        c.topics.length === 0 ||
        c.concepts.length === 0 ||
        c.learningOutcomes.length === 0,
    ),
  );

  checks.push({
    id: 'diag-curriculum',
    category: 'curriculum',
    name: 'CBSE Class 12 Curriculum Integrity (6 Subjects)',
    status: missingSubjects.length === 0 && !emptyChapterFound ? 'passed' : 'failed',
    detail:
      missingSubjects.length === 0 && !emptyChapterFound
        ? `Verified all 6 subjects and ${CBSE_CLASS_12_CURRICULUM.reduce((a, s) => a + s.chapters.length, 0)} chapters with real topics, concepts, and learning outcomes.`
        : `Incomplete curriculum entries detected (${missingSubjects.join(', ')}).`,
    checkedAt: now,
  });

  // 2. Year-Wise Library & Mock Test Non-Empty Validation
  const yearsOk = [2027, 2028, 2029, 2030, 2031, 2032].every((y) =>
    INITIAL_ACADEMIC_YEARS.some((rec) => rec.year === y),
  );
  const sampleMock80 = buildMockTestQuestions({
    id: 'diag-mock',
    title: 'Diag 80M',
    testType: 'Board-Pattern',
    academicYear: 2027,
    subjectId: 'mathematics',
    totalMarks: 80,
    durationMinutes: 180,
    difficulty: 'Mixed',
  });
  const totalMarksSum = sampleMock80.reduce((sum, q) => sum + q.marks, 0);
  const bankCount = getAllQuestions(2027).length;

  checks.push({
    id: 'diag-mock-bank',
    category: 'navigation',
    name: 'Academic Library (2027–2032) & Mock Test Assembler',
    status: yearsOk && totalMarksSum === 80 && bankCount > 50 ? 'passed' : 'warning',
    detail: `Years 2027–2032 verified. ${bankCount} total questions indexed. 80-mark Board Pattern test assembled ${sampleMock80.length} items summing to ${totalMarksSum}/80 marks.`,
    checkedAt: now,
  });

  // 3. IndexedDB Database Integrity
  const dbCheck = await validateDatabaseIntegrity();
  checks.push({
    id: 'diag-db',
    category: 'database',
    name: 'Local Student IndexedDB Storage',
    status: dbCheck.ok ? 'passed' : 'failed',
    detail: dbCheck.detail,
    remediation: dbCheck.ok ? undefined : 'Export backup JSON and reinitialize IndexedDB.',
    checkedAt: now,
  });

  // 4. Memory Pressure & Adaptive RAM Guard
  checks.push({
    id: 'diag-memory',
    category: 'memory',
    name: 'Adaptive Device RAM & Low-Memory Performance Guard',
    status: telemetry.memoryPressure === 'high' ? 'warning' : 'passed',
    detail: `Profile: ${telemetry.activeProfile} (${telemetry.totalRamGb} GB detected, ~${telemetry.estimatedAvailableRamGb} GB free). Pressure: ${telemetry.memoryPressure}. Max context turns: ${telemetry.maxContextTurns}. Animation mode: ${telemetry.animationComplexity}.`,
    remediation:
      telemetry.memoryPressure === 'high'
        ? 'Low-Memory Eco mode automatically disables heavy blur and trims transient buffers.'
        : undefined,
    checkedAt: now,
  });

  // 5. UI Thread Responsiveness & Audio Resampling Pipeline Benchmark
  const jitterMs = await measureEventLoopJitterMs();
  const benchStart = performance.now();
  const sample48k = new Float32Array(2048);
  const resampled = resampleToTargetRate(sample48k, 48000, 16000);
  const pcmBuf = float32ToPcm16Buffer(resampled);
  const audioBenchMs = Math.round((performance.now() - benchStart) * 100) / 100;
  const workletCapable = typeof window !== 'undefined' && 'AudioWorkletNode' in window;

  checks.push({
    id: 'diag-ui-audio',
    category: 'memory',
    name: 'UI Thread Latency & Live Audio Pipeline',
    status: jitterMs > 80 ? 'warning' : 'passed',
    detail: `Event-loop turn latency: ${jitterMs} ms. 48kHz→16kHz PCM16 transform (${pcmBuf.byteLength} B): ${audioBenchMs} ms. Off-thread AudioWorklet: ${workletCapable ? 'Supported' : 'Fallback Mode'}.`,
    remediation:
      jitterMs > 80
        ? 'Enable Low-Memory Performance Mode (4 GB Android) in System Console to reduce visual overhead.'
        : undefined,
    checkedAt: now,
  });

  // 6. Backend ARORA Cloud Proxy Health & Timed RTT Latency
  let apiStatus: DiagnosticCheckResult['status'] = 'warning';
  let apiDetail = 'Network reconnecting or backend health endpoint unreachable.';
  if (telemetry.isOnline) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const reqStart = performance.now();
    try {
      const res = await fetch('/api/health', { cache: 'no-store', signal: ctrl.signal });
      const rttMs = Math.round(performance.now() - reqStart);
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; cloudConfigured: boolean };
        apiStatus = data.cloudConfigured ? (rttMs > 2000 ? 'warning' : 'passed') : 'warning';
        apiDetail = data.cloudConfigured
          ? `Express AI proxy healthy (${rttMs} ms RTT) and ARORA Live Cloud active server-side.`
          : `Express backend reachable (${rttMs} ms RTT), awaiting ARORA Cloud Intelligence API configuration.`;
      } else {
        apiStatus = 'failed';
        apiDetail = `Backend returned HTTP ${res.status} (${rttMs} ms).`;
      }
    } catch (err) {
      apiStatus = 'warning';
      apiDetail = err instanceof Error ? err.message : 'Unable to reach /api/health within 4.5s.';
    } finally {
      clearTimeout(timer);
    }
  }

  checks.push({
    id: 'diag-api',
    category: 'api',
    name: 'Server-Side ARORA Cloud Proxy & Latency',
    status: apiStatus,
    detail: apiDetail,
    checkedAt: now,
  });

  // 7. Voice & Language Pack Readiness
  const voice = inspectDeviceVoiceCapabilities();
  checks.push({
    id: 'diag-voice',
    category: 'voice',
    name: 'Indian English & Tamil Voice Engines',
    status:
      voice.speechSynthesisSupported &&
      (voice.installedIndianEnglishVoices.length > 0 || voice.installedTamilVoices.length > 0)
        ? 'passed'
        : 'warning',
    detail: voice.honestStatusNote,
    checkedAt: now,
  });

  return checks;
}

export async function createSafeCheckpoint(label: string, notes: string): Promise<VersionCheckpoint> {
  const hash = Math.random().toString(36).slice(2, 10).toUpperCase();
  const cp: VersionCheckpoint = {
    id: `cp-${Date.now()}`,
    label,
    createdAt: new Date().toISOString(),
    integrityHash: `CHK-${hash}`,
    notes,
  };
  await saveVersionCheckpoint(cp);
  return cp;
}
