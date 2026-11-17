import { sanitizeAroraOutput } from './identityGuard';
import type { ChatMessage, ChatSession, LanguageMode, VoicePersona } from '../types/arora';

export interface LiveArchiveTurn {
  id: string;
  speaker: 'arora' | 'student';
  text: string;
  timestamp: string;
}

export function buildLiveChatSession(params: {
  sessionId: string;
  createdAt: string;
  turns: LiveArchiveTurn[];
  language: LanguageMode;
  voicePersona: VoicePersona;
  classroomContext?: string;
}): ChatSession | null {
  const cleanedTurns = params.turns
    .map((t) => ({
      ...t,
      text: sanitizeAroraOutput(t.text).trim(),
    }))
    .filter((t) => t.text.length > 0);

  if (cleanedTurns.length === 0) return null;

  const firstUserTurn = cleanedTurns.find((t) => t.speaker === 'student');
  const contextLabel = params.classroomContext?.trim();

  let title = 'Live Voice Session';
  if (contextLabel) {
    title = `Live Voice · ${contextLabel.slice(0, 48)}${contextLabel.length > 48 ? '...' : ''}`;
  } else if (firstUserTurn) {
    const snippet = firstUserTurn.text.replace(/\s+/g, ' ').trim();
    title = `Live Voice · ${snippet.slice(0, 46)}${snippet.length > 46 ? '...' : ''}`;
  } else {
    const firstTurn = cleanedTurns[0].text.replace(/\s+/g, ' ').trim();
    title = `Live Voice · ${firstTurn.slice(0, 46)}${firstTurn.length > 46 ? '...' : ''}`;
  }

  const messages: ChatMessage[] = cleanedTurns.map((t) => ({
    id: t.id,
    role: t.speaker === 'student' ? 'user' : 'assistant',
    content: t.text,
    timestamp: t.timestamp,
    mode: contextLabel ? 'Study' : 'Quick Answer',
    language: params.language,
    provider: t.speaker === 'arora' ? 'ARORA Live Voice' : undefined,
  }));

  return {
    id: params.sessionId,
    title,
    createdAt: params.createdAt,
    updatedAt: new Date().toISOString(),
    mode: contextLabel ? 'Study' : 'Quick Answer',
    sessionType: 'live_voice',
    language: params.language,
    voicePersona: params.voicePersona,
    classroomContext: contextLabel,
    messages,
  };
}
