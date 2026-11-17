import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { detectCurrentAcademicYear } from '../data/academicYears';
import { computeQuestionContentHash } from './questionBankEngine';
import type {
  AcademicYearRecord,
  ChatSession,
  ClassroomSessionRecord,
  DiagnosticCheckResult,
  MockTestAttempt,
  QuestionItem,
  QuestionPracticeProgress,
  StudentProfile,
  SubjectId,
  VersionCheckpoint,
} from '../types/arora';

export interface OfflineQuestionPackRecord {
  id: string;
  subjectId: SubjectId;
  year: number;
  questionCount: number;
  savedAt: string;
  sizeKb: number;
  questions: QuestionItem[];
}

interface AroraDBSchema extends DBSchema {
  profile: {
    key: string;
    value: StudentProfile;
  };
  chatSessions: {
    key: string;
    value: ChatSession;
  };
  classroomSessions: {
    key: string;
    value: ClassroomSessionRecord;
  };
  mockAttempts: {
    key: string;
    value: MockTestAttempt;
  };
  userQuestions: {
    key: string;
    value: QuestionItem;
  };
  academicYears: {
    key: number;
    value: AcademicYearRecord;
  };
  offlinePacks: {
    key: SubjectId;
    value: { subjectId: SubjectId; downloadedAt: string; sizeKb: number };
  };
  diagnostics: {
    key: string;
    value: DiagnosticCheckResult;
  };
  checkpoints: {
    key: string;
    value: VersionCheckpoint;
  };
  questionProgress: {
    key: string;
    value: QuestionPracticeProgress;
  };
  offlineQuestionPacks: {
    key: string;
    value: OfflineQuestionPackRecord;
  };
}

const DB_NAME = 'arora_ai_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<AroraDBSchema>> | null = null;

export function generateAnonymousStudentId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `STU-${seg(4)}-${seg(4)}`;
}

async function getDb(): Promise<IDBPDatabase<AroraDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AroraDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) db.createObjectStore('profile');
        if (!db.objectStoreNames.contains('chatSessions')) {
          db.createObjectStore('chatSessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('classroomSessions')) {
          db.createObjectStore('classroomSessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('mockAttempts')) {
          db.createObjectStore('mockAttempts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('userQuestions')) {
          db.createObjectStore('userQuestions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('academicYears')) {
          db.createObjectStore('academicYears', { keyPath: 'year' });
        }
        if (!db.objectStoreNames.contains('offlinePacks')) {
          db.createObjectStore('offlinePacks', { keyPath: 'subjectId' });
        }
        if (!db.objectStoreNames.contains('diagnostics')) {
          db.createObjectStore('diagnostics', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('questionProgress')) {
          db.createObjectStore('questionProgress', { keyPath: 'questionId' });
        }
        if (!db.objectStoreNames.contains('offlineQuestionPacks')) {
          db.createObjectStore('offlineQuestionPacks', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getOrCreateStudentProfile(): Promise<StudentProfile> {
  const db = await getDb();
  const existing = await db.get('profile', 'current');
  if (existing) {
    return existing;
  }
  const fresh: StudentProfile = {
    anonymousId: generateAnonymousStudentId(),
    displayAlias: 'CBSE Scholar',
    targetYear: Math.max(2027, detectCurrentAcademicYear()),
    preferredLanguage: 'indian_english',
    theme: 'dark',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    downloadedOfflineSubjects: ['physics', 'chemistry', 'mathematics', 'biology', 'english', 'computer_science'],
    memoryEnabled: true,
    hapticsEnabled: true,
    alwaysOnline: true,
    voicePersona: 'Zephyr',
    studyStreakDays: 1,
    completedTopics: [],
  };
  await db.put('profile', fresh, 'current');
  return fresh;
}

export async function saveStudentProfile(profile: StudentProfile): Promise<void> {
  const db = await getDb();
  await db.put(
    'profile',
    { ...profile, lastActiveAt: new Date().toISOString() },
    'current',
  );
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const db = await getDb();
  const list = await db.getAll('chatSessions');
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveChatSession(session: ChatSession): Promise<void> {
  const db = await getDb();
  await db.put('chatSessions', session);
}

export async function deleteChatSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('chatSessions', id);
}

export async function listClassroomSessions(): Promise<ClassroomSessionRecord[]> {
  const db = await getDb();
  const list = await db.getAll('classroomSessions');
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveClassroomSession(session: ClassroomSessionRecord): Promise<void> {
  const db = await getDb();
  await db.put('classroomSessions', session);
}

export async function deleteClassroomSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('classroomSessions', id);
}

export async function listMockAttempts(): Promise<MockTestAttempt[]> {
  const db = await getDb();
  const list = await db.getAll('mockAttempts');
  return list.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export async function saveMockAttempt(attempt: MockTestAttempt): Promise<void> {
  const db = await getDb();
  await db.put('mockAttempts', attempt);
}

export async function listUserQuestions(): Promise<QuestionItem[]> {
  const db = await getDb();
  return db.getAll('userQuestions');
}

export async function saveUserQuestion(question: QuestionItem): Promise<void> {
  const db = await getDb();
  const withHash: QuestionItem = question.contentHash
    ? question
    : { ...question, contentHash: computeQuestionContentHash(question) };
  await db.put('userQuestions', withHash);
}

export async function bulkSaveUserQuestions(
  questions: QuestionItem[],
): Promise<{ added: QuestionItem[]; skippedDuplicates: number }> {
  const db = await getDb();
  const existing = await db.getAll('userQuestions');
  const seenHashes = new Set(
    existing.map((q) => q.contentHash || computeQuestionContentHash(q)),
  );
  const added: QuestionItem[] = [];
  let skippedDuplicates = 0;

  const tx = db.transaction('userQuestions', 'readwrite');
  for (const q of questions) {
    const hash = q.contentHash || computeQuestionContentHash(q);
    if (seenHashes.has(hash)) {
      skippedDuplicates++;
      continue;
    }
    seenHashes.add(hash);
    const enriched: QuestionItem = { ...q, contentHash: hash };
    await tx.store.put(enriched);
    added.push(enriched);
  }
  await tx.done;
  return { added, skippedDuplicates };
}

export async function listQuestionProgress(): Promise<QuestionPracticeProgress[]> {
  const db = await getDb();
  return db.getAll('questionProgress');
}

export async function saveQuestionProgress(entry: QuestionPracticeProgress): Promise<void> {
  const db = await getDb();
  await db.put('questionProgress', entry);
}

export async function saveOfflineQuestionPack(
  subjectId: SubjectId,
  year: number,
  questions: QuestionItem[],
): Promise<OfflineQuestionPackRecord> {
  const db = await getDb();
  const serialized = JSON.stringify(questions);
  const sizeKb = Math.max(1, Math.round(serialized.length / 1024));
  const now = new Date().toISOString();
  const record: OfflineQuestionPackRecord = {
    id: `${subjectId}-${year}`,
    subjectId,
    year,
    questionCount: questions.length,
    savedAt: now,
    sizeKb,
    questions,
  };
  await db.put('offlineQuestionPacks', record);
  await db.put('offlinePacks', { subjectId, downloadedAt: now, sizeKb });
  return record;
}

export async function listOfflineQuestionPacks(): Promise<OfflineQuestionPackRecord[]> {
  const db = await getDb();
  return db.getAll('offlineQuestionPacks');
}

export async function listStoredAcademicYears(): Promise<AcademicYearRecord[]> {
  const db = await getDb();
  return db.getAll('academicYears');
}

export async function saveAcademicYear(record: AcademicYearRecord): Promise<void> {
  const db = await getDb();
  await db.put('academicYears', record);
}

export async function listVersionCheckpoints(): Promise<VersionCheckpoint[]> {
  const db = await getDb();
  const list = await db.getAll('checkpoints');
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveVersionCheckpoint(cp: VersionCheckpoint): Promise<void> {
  const db = await getDb();
  await db.put('checkpoints', cp);
}

export async function validateDatabaseIntegrity(): Promise<{
  ok: boolean;
  storesChecked: number;
  detail: string;
}> {
  try {
    const db = await getDb();
    const storeNames = [
      'profile',
      'chatSessions',
      'classroomSessions',
      'mockAttempts',
      'userQuestions',
      'academicYears',
      'offlinePacks',
      'diagnostics',
      'checkpoints',
      'questionProgress',
      'offlineQuestionPacks',
    ] as const;
    for (const store of storeNames) {
      await db.count(store);
    }
    return {
      ok: true,
      storesChecked: storeNames.length,
      detail: `All ${storeNames.length} IndexedDB object stores verified healthy.`,
    };
  } catch (err) {
    return {
      ok: false,
      storesChecked: 0,
      detail: err instanceof Error ? err.message : 'IndexedDB verification failed.',
    };
  }
}

export async function exportFullBackupJson(): Promise<string> {
  const db = await getDb();
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'ARORA AI',
    version: 3,
    profile: await db.get('profile', 'current'),
    chatSessions: await db.getAll('chatSessions'),
    classroomSessions: await db.getAll('classroomSessions'),
    mockAttempts: await db.getAll('mockAttempts'),
    userQuestions: await db.getAll('userQuestions'),
    questionProgress: await db.getAll('questionProgress'),
    academicYears: await db.getAll('academicYears'),
    checkpoints: await db.getAll('checkpoints'),
  };
  return JSON.stringify(payload, null, 2);
}

export async function importFullBackupJson(rawJson: string): Promise<{ imported: boolean; message: string }> {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    if (parsed.app !== 'ARORA AI') {
      return { imported: false, message: 'Invalid backup file format.' };
    }
    const db = await getDb();
    if (parsed.profile && typeof parsed.profile === 'object') {
      await db.put('profile', parsed.profile as StudentProfile, 'current');
    }
    if (Array.isArray(parsed.chatSessions)) {
      for (const s of parsed.chatSessions) await db.put('chatSessions', s as ChatSession);
    }
    if (Array.isArray(parsed.classroomSessions)) {
      for (const cs of parsed.classroomSessions) {
        await db.put('classroomSessions', cs as ClassroomSessionRecord);
      }
    }
    if (Array.isArray(parsed.mockAttempts)) {
      for (const m of parsed.mockAttempts) await db.put('mockAttempts', m as MockTestAttempt);
    }
    if (Array.isArray(parsed.userQuestions)) {
      for (const q of parsed.userQuestions) await db.put('userQuestions', q as QuestionItem);
    }
    if (Array.isArray(parsed.questionProgress)) {
      for (const qp of parsed.questionProgress) {
        await db.put('questionProgress', qp as QuestionPracticeProgress);
      }
    }
    return { imported: true, message: 'Backup restored cleanly into local IndexedDB.' };
  } catch (err) {
    return {
      imported: false,
      message: err instanceof Error ? err.message : 'Failed to parse backup JSON.',
    };
  }
}
