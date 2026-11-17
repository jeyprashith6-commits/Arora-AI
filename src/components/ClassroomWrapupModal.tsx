import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { triggerHaptic } from '../engines/hapticsEngine';
import type { ClassroomAssessmentItem } from '../types/arora';
import { RichMessageRenderer } from './RichMessageRenderer';

interface ClassroomWrapupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  subjectName: string;
  chapterTitle: string;
  topicsCovered: string[];
  correctCount: number;
  incorrectCount: number;
  lessonSummary: string;
  revisionNotes: string;
  assessment: ClassroomAssessmentItem[];
  onDownloadNotes: () => void;
}

export const ClassroomWrapupModal: React.FC<ClassroomWrapupModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  subjectName,
  chapterTitle,
  topicsCovered,
  correctCount,
  incorrectCount,
  lessonSummary,
  revisionNotes,
  assessment,
  onDownloadNotes,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  if (!isOpen) return null;

  const totalAnswered = correctCount + incorrectCount;
  const sessionAccuracy =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : null;

  const quizScore = assessment.reduce(
    (acc, q) => acc + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0),
    0,
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Classroom Lesson Summary and Revision Notes"
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto holo-panel-elevated p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              Classroom Session Saved · {subjectName}
            </p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Lesson Summary, Revision Notes & Quick Check
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chapterTitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownloadNotes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold min-h-[40px] glass-press"
            >
              <Download className="w-4 h-4" />
              Download Notes (.md)
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lesson summary"
              className="p-2 rounded-xl glass-subcard text-slate-500 hover:text-slate-900 dark:hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="glass-subcard p-3">
            <div className="text-slate-500 dark:text-slate-400">Topics Covered</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {topicsCovered.length}
            </div>
          </div>
          <div className="glass-subcard p-3">
            <div className="text-slate-500 dark:text-slate-400">Answered Correctly</div>
            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {correctCount}
            </div>
          </div>
          <div className="glass-subcard p-3">
            <div className="text-slate-500 dark:text-slate-400">Needs Review</div>
            <div className="text-lg font-semibold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              {incorrectCount}
            </div>
          </div>
          <div className="glass-subcard p-3">
            <div className="text-slate-500 dark:text-slate-400">Live Accuracy</div>
            <div className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums mt-0.5">
              {sessionAccuracy !== null ? `${sessionAccuracy}%` : 'Notes Only'}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 glass-subcard flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Synthesizing your personalized revision notes and post-class check...
            </p>
          </div>
        ) : (
          <>
            {lessonSummary && (
              <div className="glass-subcard p-4 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                  <Award className="w-4 h-4" />
                  Teacher Recap
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {lessonSummary}
                </p>
              </div>
            )}

            {revisionNotes && (
              <div className="glass-subcard p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Structured Revision Notes
                </div>
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <RichMessageRenderer content={revisionNotes} msgId="wrapup-notes" />
                </div>
              </div>
            )}

            {assessment.length > 0 && (
              <div className="glass-subcard p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <ClipboardCheck className="w-4 h-4" />
                    Short Post-Class Check ({assessment.length} Questions)
                  </div>
                  {submittedQuiz && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      Score: {quizScore} / {assessment.length}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {assessment.map((item, qIdx) => {
                    const chosen = selectedAnswers[item.id];
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] space-y-2.5"
                      >
                        <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                          {qIdx + 1}. {item.question}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.options.map((opt, oIdx) => {
                            const isPicked = chosen === oIdx;
                            const isRight = item.correctIndex === oIdx;
                            let optStyle =
                              'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-cyan-400/50';
                            if (submittedQuiz) {
                              if (isRight) {
                                optStyle =
                                  'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold';
                              } else if (isPicked) {
                                optStyle =
                                  'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200';
                              }
                            } else if (isPicked) {
                              optStyle =
                                'border-cyan-500 bg-cyan-500/15 text-cyan-900 dark:text-cyan-100 font-semibold';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={submittedQuiz}
                                onClick={() => {
                                  triggerHaptic('tap');
                                  setSelectedAnswers((prev) => ({ ...prev, [item.id]: oIdx }));
                                }}
                                className={`text-left px-3 py-2 rounded-xl border text-xs min-h-[40px] flex items-center justify-between gap-2 transition-colors ${optStyle}`}
                              >
                                <span>{opt}</span>
                                {submittedQuiz && isRight && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                )}
                                {submittedQuiz && isPicked && !isRight && (
                                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {submittedQuiz && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                            <strong>Explanation:</strong> {item.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!submittedQuiz && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('submit');
                      setSubmittedQuiz(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold min-h-[42px] glass-press"
                  >
                    Check Answers
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
