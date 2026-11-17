import type { ChapterContent, SubjectCurriculum, SubjectId } from '../../types/arora';
import { BIOLOGY_CURRICULUM } from './biology';
import { CHEMISTRY_CURRICULUM } from './chemistry';
import { COMPUTER_SCIENCE_CURRICULUM } from './computerScience';
import { ENGLISH_CURRICULUM } from './english';
import { MATHEMATICS_CURRICULUM } from './mathematics';
import { PHYSICS_CURRICULUM } from './physics';

export const CBSE_CLASS_12_CURRICULUM: SubjectCurriculum[] = [
  PHYSICS_CURRICULUM,
  CHEMISTRY_CURRICULUM,
  MATHEMATICS_CURRICULUM,
  BIOLOGY_CURRICULUM,
  ENGLISH_CURRICULUM,
  COMPUTER_SCIENCE_CURRICULUM,
];

export const SUBJECT_MAP: Record<SubjectId, SubjectCurriculum> = {
  physics: PHYSICS_CURRICULUM,
  chemistry: CHEMISTRY_CURRICULUM,
  mathematics: MATHEMATICS_CURRICULUM,
  biology: BIOLOGY_CURRICULUM,
  english: ENGLISH_CURRICULUM,
  computer_science: COMPUTER_SCIENCE_CURRICULUM,
};

export function getSubjectById(id: SubjectId): SubjectCurriculum {
  return SUBJECT_MAP[id] || PHYSICS_CURRICULUM;
}

export function getChapterById(
  subjectId: SubjectId,
  chapterId: string,
): ChapterContent | undefined {
  return getSubjectById(subjectId).chapters.find((c) => c.id === chapterId);
}
