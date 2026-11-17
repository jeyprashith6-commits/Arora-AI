import {
  type Content,
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';
import { sanitizeSvgMarkup } from '../src/engines/diagramUtils.ts';
import { sanitizeAroraOutput } from '../src/engines/identityGuard.ts';
import {
  analyzeQueryIntelligence,
  type QueryIntelligenceProfile,
} from '../src/engines/intelligenceRouter.ts';

const MODEL_NAME = 'gemini-4-hydrogen';
const FALLBACK_MODEL_NAME = 'gemini-3.1-flash-lite';
const LIVE_MODEL_NAME = 'gemini-3.8-live';

// When Google Search Grounding quota hits 429 on free-tier keys, skip retrying
// the search tool for 90s so requests respond immediately via standard Cloud AI
// without failing or adding round-trip latency, then re-probe automatically.
let searchGroundingCooldownUntil = 0;
let primaryOverloadCooldownUntil = 0;

export function resetSearchGroundingCooldownForTest() {
  searchGroundingCooldownUntil = 0;
  primaryOverloadCooldownUntil = 0;
}

function isTransientCloudError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const name = err instanceof Error ? err.name.toLowerCase() : '';
  return (
    name.includes('abort') ||
    name.includes('timeout') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('500') ||
    msg.includes('resource_exhausted') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed')
  );
}

function isToolOrConfigError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('search') ||
    msg.includes('grounding') ||
    msg.includes('tool') ||
    msg.includes('400') ||
    msg.includes('not supported') ||
    isTransientCloudError(err)
  );
}

function extractReadableErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        message?: unknown;
        error?: { message?: unknown } | unknown;
      };
      if (parsed?.error && typeof parsed.error === 'object') {
        const innerMsg = (parsed.error as { message?: unknown }).message;
        if (typeof innerMsg === 'string' && innerMsg.trim()) {
          return innerMsg.trim();
        }
      }
      if (typeof parsed?.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      // fall back to sanitized string
    }
  }
  return raw;
}

export function formatSafeCloudError(err: unknown): string {
  if (err instanceof Error && err.message === 'CLOUD_AI_NOT_CONFIGURED') {
    return 'ARORA Cloud Intelligence is not configured on this server.';
  }
  if (isTransientCloudError(err)) {
    return 'ARORA Cloud is handling high live traffic right now. Please retry in a few seconds.';
  }
  const raw = err instanceof Error ? err.message : 'Cloud request interrupted';
  const unwrapped = extractReadableErrorMessage(raw);
  return sanitizeAroraOutput(unwrapped.replace(/https?:\/\/[^\s"\\]+/gi, '')).slice(0, 220);
}

function getAiClient(apiVersion?: string): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 8);
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  indian_english:
    'Respond in clear, natural Indian English using standard Indian academic terminology, natural rhythm, and friendly clarity.',
  tamil:
    'Respond in clear, accurate Tamil (தமிழ்) with correct scientific/technical terms preserved clearly in Tamil script and English symbols where helpful.',
  tanglish:
    'Respond in natural conversational Tamil-English (Tanglish) as spoken warmly in Tamil Nadu (for example: "Intha concept-la main-a enna nadakkuthu-na..."), keeping facts and formulas crystal clear.',
};

function getAroraIdentityInstruction(): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    'IDENTITY & CONFIDENTIALITY RULES (STRICT):',
    '1. You are ARORA AI, an independent, ultra-fast futuristic intelligent AI agent and educational platform.',
    '2. NEVER reveal, confirm, hint, or mention Gemini, Google, Google AI, Google DeepMind, or any underlying external model/provider name—even if the user explicitly asks "Are you Gemini?", "What LLM are you?", or "Who trained you?". Always identify strictly as ARORA AI.',
    '3. CREATOR ATTRIBUTION: Do NOT volunteer or mention who created you during normal conversation, greetings, or educational replies. ONLY when someone explicitly asks who created you, who built/made/developed/owns you, or who your creator/founder is, state clearly and respectfully that ARORA AI was created by Jey Prashith GK.',
    `4. REAL-TIME WORLD KNOWLEDGE: Today's date is ${today}. You have access to current scientific knowledge, CBSE curriculum guidance, coding concepts, and real-world facts.`,
  ].join('\n');
}

export interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}): GroundingSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk.web?.title || uri,
      uri,
    });
    if (sources.length >= 5) break;
  }
  return sources;
}

function mapDepthToThinkingLevel(
  depth: QueryIntelligenceProfile['thinkingDepth'],
): ThinkingLevel {
  switch (depth) {
    case 'LOW':
      return ThinkingLevel.LOW;
    case 'MEDIUM':
      return ThinkingLevel.MEDIUM;
    case 'HIGH':
      return ThinkingLevel.HIGH;
    case 'XHIGH':
      return ThinkingLevel.XHIGH;
  }
}

function getCoreReasoningAndReliabilityInstruction(): string {
  return [
    'DEEP REASONING, ACCURACY & ANTI-HALLUCINATION PROTOCOL (STRICT):',
    '1. THINK BEFORE ANSWERING: Decode the true intent and unspoken context behind the student’s words—even if typed in incomplete fragments, casual Tanglish, or voice transcripts.',
    '2. RESOLVE FOLLOW-UPS NATURALLY: Use prior turns directly when the student refers back ("why?", "what if we double that?", "athu eppadi?", "explain step 2") without forcing them to repeat context.',
    '3. CHECK PREMISES & MISSING DATA: If a question contains a conceptual error or impossible assumption, gently correct the premise before solving. If essential numerical values/conditions are missing, state what is missing and ask cleanly—or show the general symbolic formula first—never invent missing numbers.',
    '4. VERIFY EVERY STEP: Internally double-check algebra, signs, logarithms, stoichiometry, code edge cases, and SI units before presenting clear, verifiable solution steps and concise reasoning summaries. Never expose raw internal chain-of-thought.',
    '5. FACTUAL HONESTY & CITATIONS: Ground academic claims in standard NCERT & CBSE Class 12 principles. Distinguish established scientific facts from intuitive analogies. NEVER fabricate NCERT page numbers, CBSE PYQ paper codes, URLs, or quotes; if something cannot be verified, state clearly what is unknown or unverified.',
  ].join('\n');
}

function buildMultiTurnContents(
  history: { role: 'user' | 'assistant'; content: string }[],
  finalUserParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  maxTurns: number,
): Content[] {
  const trimmed = history
    .filter((h) => h.content && h.content.trim().length > 0)
    .slice(-maxTurns);

  const contents: Content[] = [];
  for (const h of trimmed) {
    const mappedRole = h.role === 'assistant' ? 'model' : 'user';
    const textPart = { text: h.content.trim() };
    const prev = contents[contents.length - 1];
    if (prev && prev.role === mappedRole && Array.isArray(prev.parts)) {
      prev.parts.push(textPart);
    } else {
      contents.push({ role: mappedRole, parts: [textPart] });
    }
  }

  const last = contents[contents.length - 1];
  if (last && last.role === 'user' && Array.isArray(last.parts)) {
    last.parts.push(...finalUserParts);
  } else {
    contents.push({ role: 'user', parts: finalUserParts });
  }
  return contents;
}

// Adaptive Conversational Modes paired with Dynamic Query Intelligence
const CHAT_MODE_CONFIG: Record<
  string,
  { thinking: ThinkingLevel; instruction: string }
> = {
  'Auto (Smart)': {
    thinking: ThinkingLevel.MEDIUM,
    instruction:
      'Automatically match depth, structure, and tone to the user’s exact question—concise for quick lookups, clear analogies for foundational doubts, rigorous verified steps for numericals/code, and structured points for exam questions.',
  },
  'Quick Answer': {
    thinking: ThinkingLevel.LOW,
    instruction:
      'Deliver a crisp, ultra-fast, accurate answer under ~150 words with the key conclusion, formula, or rule first.',
  },
  'Deep Explanation': {
    thinking: ThinkingLevel.HIGH,
    instruction:
      'Provide a thorough, intuitive conceptual explanation from first principles, answering why and how it works, with clear logical steps and real-world intuition.',
  },
  Research: {
    thinking: ThinkingLevel.XHIGH,
    instruction:
      'Perform multi-angle analytical synthesis comparing mechanisms, edge cases, NCERT/scientific principles, and verified evidence without guessing.',
  },
  Study: {
    thinking: ThinkingLevel.MEDIUM,
    instruction:
      'Format as structured CBSE revision notes: key definitions, bulleted concepts, formulas with SI units, common exam pitfalls, and 2 quick self-check questions.',
  },
  'Problem Solving': {
    thinking: ThinkingLevel.HIGH,
    instruction:
      'Solve methodically with full verification: Given data with SI units, Principle/Formula, Step-by-step substitution/derivation, Calculation check, and Final result with units.',
  },
  'Board Exam': {
    thinking: ThinkingLevel.MEDIUM,
    instruction:
      'Write a full-marks CBSE Board Exam model answer following CBSE marking-scheme structure: crisp opening law/definition, neat labelled steps or diagram cues, highlighted keywords, and concluding unit/statement.',
  },
  Coding: {
    thinking: ThinkingLevel.HIGH,
    instruction:
      'Write clean, bug-free, well-commented Python, SQL, or requested code aligned with CBSE Class 12 Computer Science and modern engineering standards, plus dry-run trace, edge cases, time complexity, and sample output.',
  },
  Creative: {
    thinking: ThinkingLevel.MEDIUM,
    instruction:
      'Explain using memorable everyday Indian analogies, vivid mental models, or structured literary insight while keeping scientific facts strictly accurate.',
  },
};

export interface AttachmentPayload {
  name: string;
  mimeType: string;
  base64Data: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
]);

export function validateAttachments(attachments: unknown): AttachmentPayload[] {
  if (!Array.isArray(attachments)) return [];
  const valid: AttachmentPayload[] = [];
  for (const item of attachments.slice(0, 3)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const mimeType = typeof rec.mimeType === 'string' ? rec.mimeType : '';
    const base64Data = typeof rec.base64Data === 'string' ? rec.base64Data : '';
    const name = typeof rec.name === 'string' ? rec.name.slice(0, 120) : 'attachment';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) continue;
    if (!base64Data || base64Data.length > 8_000_000) continue;
    valid.push({ name, mimeType, base64Data });
  }
  return valid;
}

function buildChatRequest(params: {
  message: string;
  mode: string;
  language: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  attachments: AttachmentPayload[];
  memorySummary?: string;
  maxContextTurns?: number;
}) {
  const modeMeta = CHAT_MODE_CONFIG[params.mode] || CHAT_MODE_CONFIG['Auto (Smart)'];
  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language] || LANGUAGE_INSTRUCTIONS.indian_english;

  const intel = analyzeQueryIntelligence({
    message: params.message,
    mode: params.mode,
    historyLength: params.history.length,
    attachmentCount: params.attachments.length,
  });

  // Allow explicit deep modes to elevate thinking, while Auto/Quick adapt smoothly to query complexity
  const routedThinking =
    params.mode === 'Quick Answer' && intel.thinkingDepth === 'LOW'
      ? ThinkingLevel.LOW
      : params.mode === 'Auto (Smart)'
        ? mapDepthToThinkingLevel(intel.thinkingDepth)
        : intel.thinkingDepth === 'XHIGH'
          ? ThinkingLevel.XHIGH
          : intel.thinkingDepth === 'HIGH' && modeMeta.thinking === ThinkingLevel.MEDIUM
            ? ThinkingLevel.HIGH
            : modeMeta.thinking;

  const adaptiveHints: string[] = [intel.styleInstruction];
  if (intel.crossSubjectBridge) {
    adaptiveHints.push(`CROSS-CONCEPT INSIGHT: ${intel.crossSubjectBridge}`);
  }
  if (intel.isFollowUpOrFragment) {
    adaptiveHints.push(
      'FOLLOW-UP CONTEXT: The user wrote a concise follow-up or fragment; directly continue from the active topic in recent turns without asking them to repeat themselves.',
    );
  }
  if (intel.hasMissingDataRisk) {
    adaptiveHints.push(
      'MISSING INFORMATION GUARD: Check whether key numerical inputs or conditions are absent. If required inputs are missing, show the symbolic formula/approach cleanly and politely ask for the missing value instead of inventing numbers.',
    );
  }
  if (intel.hasMisconceptionRisk) {
    adaptiveHints.push(
      'PREMISE VERIFICATION: Inspect carefully whether the question contains a subtle misconception or false premise; clarify kindly before answering.',
    );
  }

  const systemInstruction = [
    getAroraIdentityInstruction(),
    getCoreReasoningAndReliabilityInstruction(),
    'CONVERSATION PERFECTION & HUMAN CLARITY RULES:',
    '1. Follow the user’s exact wish first: strictly match the requested depth, length, simplicity, or exam format.',
    '2. Speak like a thoughtful, articulate human mentor—natural rhythm, clear structure, zero robotic filler ("As an AI...", "Here is the output..."), and concise directness.',
    '3. ZERO COMPUTER LANGUAGE OR RAW SYNTAX: Never output raw LaTeX backslashes (like \\frac, \\times, \\cdot, \\rightarrow, \\text) or dollar-sign delimiters ($...$ / $$...$$).',
    intel.isCodingRequest
      ? '4. Coding query detected: provide clean, bug-free fenced code with brief line-by-line reasoning, edge cases, and expected output.'
      : '4. Non-coding query: NEVER use programming jargon or code blocks. Write mathematics cleanly using readable Unicode symbols (×, ÷, ², ³, √, π, θ, ε₀, →, ≤, ≥) in plain, flowing human prose.',
    langInstruction,
    modeMeta.instruction,
    adaptiveHints.join('\n'),
    params.memorySummary
      ? `Student optional study context: ${params.memorySummary}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const maxTurns = Math.min(Math.max(params.maxContextTurns ?? 8, 2), 16);

  const finalParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];
  for (const att of params.attachments) {
    finalParts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.base64Data,
      },
    });
  }
  finalParts.push({ text: params.message });

  const contents = buildMultiTurnContents(params.history, finalParts, maxTurns);

  return { systemInstruction, contents, thinkingLevel: routedThinking, intel };
}

interface TextAttemptSpec {
  model: string;
  useSearch: boolean;
  thinkingLevel?: ThinkingLevel;
}

export function shouldEnableSearchGrounding(message: string, mode?: string): boolean {
  if (mode === 'Research') return true;
  const q = message.trim();
  if (q.length < 4) return false;
  return /\b(latest|current|today|yesterday|news|recent|2025|2026|2027|live score|weather|stock|price|official website|cbse circular|syllabus update|search online|look up online)\b/i.test(
    q,
  );
}

function buildResilientAttempts(
  preferredThinking?: ThinkingLevel,
  allowSearch = false,
): TextAttemptSpec[] {
  const attempts: TextAttemptSpec[] = [];
  const primaryInCooldown = Date.now() < primaryOverloadCooldownUntil;

  if (!primaryInCooldown) {
    if (allowSearch && Date.now() >= searchGroundingCooldownUntil) {
      attempts.push({
        model: MODEL_NAME,
        useSearch: true,
        thinkingLevel: preferredThinking,
      });
    }
    attempts.push({
      model: MODEL_NAME,
      useSearch: false,
      thinkingLevel: preferredThinking,
    });
    if (preferredThinking === ThinkingLevel.XHIGH) {
      attempts.push({
        model: MODEL_NAME,
        useSearch: false,
        thinkingLevel: ThinkingLevel.HIGH,
      });
    }
  }

  attempts.push({
    model: FALLBACK_MODEL_NAME,
    useSearch: false,
  });
  return attempts;
}

async function waitMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: unknown,
  systemInstruction: string,
  preferredThinking?: ThinkingLevel,
  allowSearch = false,
) {
  const attempts = buildResilientAttempts(preferredThinking, allowSearch);
  let lastError: unknown;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    if (attempt.model === MODEL_NAME && Date.now() < primaryOverloadCooldownUntil) {
      continue;
    }
    const timeoutMs = attempt.model === MODEL_NAME ? 8500 : 18000;
    try {
      return await ai.models.generateContent({
        model: attempt.model,
        contents: contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
        config: {
          systemInstruction,
          abortSignal: AbortSignal.timeout(timeoutMs),
          ...(attempt.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
          ...(attempt.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
            : {}),
        },
      });
    } catch (err) {
      lastError = err;
      if (attempt.useSearch && isToolOrConfigError(err)) {
        searchGroundingCooldownUntil = Date.now() + 90_000;
      }
      if (attempt.model === MODEL_NAME && isTransientCloudError(err)) {
        primaryOverloadCooldownUntil = Date.now() + 60_000;
      }
      if (i === attempts.length - 1) {
        if (isTransientCloudError(err)) {
          await waitMs(350);
          return await ai.models.generateContent({
            model: FALLBACK_MODEL_NAME,
            contents: contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
            config: {
              systemInstruction,
              abortSignal: AbortSignal.timeout(18000),
            },
          });
        }
        throw err;
      }
    }
  }
  throw lastError;
}

async function generateStructuredJsonWithFallback(params: {
  ai: GoogleGenAI;
  contents: unknown;
  systemInstruction: string;
  schema: Record<string, unknown>;
  preferredThinking?: ThinkingLevel;
}) {
  const attempts: Array<{ model: string; thinkingLevel?: ThinkingLevel }> =
    Date.now() < primaryOverloadCooldownUntil
      ? [{ model: FALLBACK_MODEL_NAME }, { model: FALLBACK_MODEL_NAME }]
      : [
          { model: MODEL_NAME, thinkingLevel: params.preferredThinking },
          { model: FALLBACK_MODEL_NAME },
          { model: FALLBACK_MODEL_NAME },
        ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    if (i === attempts.length - 1 && attempt.model === FALLBACK_MODEL_NAME && i > 0) {
      // Only add brief backoff before repeating fallback
      if (attempts[i - 1]?.model === FALLBACK_MODEL_NAME) {
        await waitMs(350);
      }
    }
    const timeoutMs = attempt.model === MODEL_NAME ? 9000 : 18000;
    try {
      return await params.ai.models.generateContent({
        model: attempt.model,
        contents: params.contents as Parameters<typeof params.ai.models.generateContent>[0]['contents'],
        config: {
          systemInstruction: params.systemInstruction,
          abortSignal: AbortSignal.timeout(timeoutMs),
          ...(attempt.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: params.schema,
        },
      });
    } catch (err) {
      lastError = err;
      if (attempt.model === MODEL_NAME && isTransientCloudError(err)) {
        primaryOverloadCooldownUntil = Date.now() + 60_000;
      }
      const canFallback = isTransientCloudError(err) || isToolOrConfigError(err);
      if (!canFallback || i === attempts.length - 1) {
        throw err;
      }
    }
  }
  throw lastError;
}

async function streamWithFallback(params: {
  ai: GoogleGenAI;
  contents: unknown;
  systemInstruction: string;
  preferredThinking?: ThinkingLevel;
  allowSearch?: boolean;
  signal?: AbortSignal;
  onDelta: (deltaText: string) => void;
}) {
  const attempts = buildResilientAttempts(params.preferredThinking, params.allowSearch ?? false);
  let lastError: unknown;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    if (attempt.model === MODEL_NAME && Date.now() < primaryOverloadCooldownUntil) {
      continue;
    }
    let emittedChunks = false;
    let fullText = '';
    let sources: GroundingSource[] = [];

    const firstByteController = new AbortController();
    const firstByteTimer = setTimeout(
      () => firstByteController.abort(new Error('Stream first-byte timeout')),
      attempt.model === MODEL_NAME ? 8500 : 18000,
    );
    const combinedSignal = params.signal
      ? AbortSignal.any([params.signal, firstByteController.signal])
      : firstByteController.signal;

    try {
      const stream = await params.ai.models.generateContentStream({
        model: attempt.model,
        contents: params.contents as Parameters<
          typeof params.ai.models.generateContentStream
        >[0]['contents'],
        config: {
          systemInstruction: params.systemInstruction,
          abortSignal: combinedSignal,
          ...(attempt.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
          ...(attempt.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
            : {}),
        },
      });

      for await (const chunk of stream) {
        if (params.signal?.aborted) break;
        const rawPiece = chunk.text ?? '';
        if (rawPiece) {
          if (!emittedChunks) {
            emittedChunks = true;
            clearTimeout(firstByteTimer);
          }
          const safePiece = sanitizeAroraOutput(rawPiece);
          fullText += safePiece;
          params.onDelta(safePiece);
        }
        const chunkSources = extractGroundingSources(chunk);
        if (chunkSources.length > 0) {
          sources = chunkSources;
        }
      }
      clearTimeout(firstByteTimer);

      return { fullText, sources, usedSearch: attempt.useSearch };
    } catch (err) {
      clearTimeout(firstByteTimer);
      lastError = err;
      if (params.signal?.aborted || emittedChunks) throw err;
      if (attempt.useSearch && isToolOrConfigError(err)) {
        searchGroundingCooldownUntil = Date.now() + 90_000;
      }
      if (attempt.model === MODEL_NAME && isTransientCloudError(err)) {
        primaryOverloadCooldownUntil = Date.now() + 60_000;
      }
      if (i === attempts.length - 1) throw err;
    }
  }

  throw lastError;
}

export async function runAroraChat(params: {
  message: string;
  mode: string;
  language: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  attachments: AttachmentPayload[];
  memorySummary?: string;
  maxContextTurns?: number;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const { systemInstruction, contents, thinkingLevel, intel } = buildChatRequest(params);
  const allowSearch = shouldEnableSearchGrounding(params.message, params.mode);
  const response = await generateWithFallback(
    ai,
    contents,
    systemInstruction,
    thinkingLevel,
    allowSearch,
  );
  const sources = extractGroundingSources(response);

  return {
    text: sanitizeAroraOutput(response.text ?? 'Unable to generate a response for this query.'),
    provider: 'ARORA AI',
    thinkingLevel,
    responseStyle: intel.responseStyle,
    sources,
  };
}

export async function streamAroraChat(params: {
  message: string;
  mode: string;
  language: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  attachments: AttachmentPayload[];
  memorySummary?: string;
  maxContextTurns?: number;
  signal?: AbortSignal;
  onDelta: (deltaText: string) => void;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const { systemInstruction, contents, thinkingLevel, intel } = buildChatRequest(params);
  const allowSearch = shouldEnableSearchGrounding(params.message, params.mode);
  const { fullText, sources } = await streamWithFallback({
    ai,
    contents,
    systemInstruction,
    preferredThinking: thinkingLevel,
    allowSearch,
    signal: params.signal,
    onDelta: params.onDelta,
  });

  return {
    text: sanitizeAroraOutput(fullText) || 'Unable to generate a response for this query.',
    provider: 'ARORA AI',
    thinkingLevel,
    responseStyle: intel.responseStyle,
    sources,
  };
}

function buildTeacherCasualRequest(params: {
  message: string;
  language: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}) {
  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language] || LANGUAGE_INSTRUCTIONS.indian_english;

  const intel = analyzeQueryIntelligence({
    message: params.message,
    mode: 'Auto (Smart)',
    historyLength: params.history.length,
  });
  const thinkingLevel = mapDepthToThinkingLevel(intel.thinkingDepth);

  const systemInstruction = [
    getAroraIdentityInstruction(),
    getCoreReasoningAndReliabilityInstruction(),
    langInstruction,
    'CONVERSATIONAL AI TEACHER MODE (ADAPTIVE HUMAN INTELLIGENCE):',
    '1. Understand the student’s true intent cleanly—whether they sent a quick greeting, an incomplete follow-up, a Tanglish doubt, a hard CBSE numerical, or a code debugging question.',
    '2. Match length and style dynamically: brief & natural for quick questions; logical, step-by-step and deeply illuminating for physics, chemistry, mathematics, biology, or coding.',
    '3. Speak and write warmly and clearly in natural human language—NEVER output raw LaTeX backslashes (\\frac, \\times, $$) or robotic boilerplate. Write math cleanly with Unicode symbols (×, ÷, ², √, π, →, ε₀).',
    intel.isCodingRequest
      ? '4. Coding question: include clean fenced code with concise trace explanation and edge cases.'
      : '4. Non-coding question: keep prose free of programming jargon or code blocks.',
    intel.styleInstruction,
    intel.crossSubjectBridge ? `CROSS-CONCEPT LINK: ${intel.crossSubjectBridge}` : '',
    intel.isFollowUpOrFragment
      ? 'FOLLOW-UP: Continue seamlessly from the immediately preceding turns without making the student repeat context.'
      : '',
    intel.hasMissingDataRisk
      ? 'MISSING DATA CHECK: Verify if essential givens are missing before plugging numbers; ask politely if needed.'
      : '',
    '5. Keep conversation natural and supportive—do NOT force structured classroom onboarding unless Interactive Classroom Mode is explicitly active.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const contents = buildMultiTurnContents(
    params.history,
    [{ text: params.message }],
    10,
  );

  return { systemInstruction, contents, thinkingLevel };
}

export async function runTeacherCasualTurn(params: {
  message: string;
  language: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const { systemInstruction, contents, thinkingLevel } = buildTeacherCasualRequest(params);
  const allowSearch = shouldEnableSearchGrounding(params.message);
  const response = await generateWithFallback(
    ai,
    contents,
    systemInstruction,
    thinkingLevel,
    allowSearch,
  );
  const sources = extractGroundingSources(response);

  return {
    text: sanitizeAroraOutput(response.text ?? 'I am right here with you. Could you rephrase that?'),
    provider: 'ARORA AI',
    sources,
  };
}

export async function streamTeacherCasualTurn(params: {
  message: string;
  language: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  signal?: AbortSignal;
  onDelta: (deltaText: string) => void;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const { systemInstruction, contents, thinkingLevel } = buildTeacherCasualRequest(params);
  const allowSearch = shouldEnableSearchGrounding(params.message);
  const { fullText, sources } = await streamWithFallback({
    ai,
    contents,
    systemInstruction,
    preferredThinking: thinkingLevel,
    allowSearch,
    signal: params.signal,
    onDelta: params.onDelta,
  });

  return {
    text: sanitizeAroraOutput(fullText) || 'I am right here with you. Could you rephrase that?',
    provider: 'ARORA AI',
    sources,
  };
}

export interface ServerBoardCue {
  id: string;
  op: 'append' | 'replace' | 'highlight' | 'erase_block' | 'clear';
  blockId?: string;
  delayRatio: number;
  spokenCueAnchor?: string;
  block?: {
    id: string;
    kind:
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
    tone: 'default' | 'formula' | 'example' | 'important' | 'correction' | 'question' | 'code';
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
    replacesText?: string;
    topicTag?: string;
    createdAt: string;
  };
}

function getSubjectPedagogyHint(subjectName: string): string {
  const s = subjectName.toLowerCase();
  if (s.includes('physics')) {
    return 'PHYSICS BOARD STYLE: Write derivations step-by-step, box key formulas with SI units, solve numericals cleanly (Given → Formula → Substitution → Result), and set diagramTopic when a ray diagram, vector field, graph, or circuit helps.';
  }
  if (s.includes('chemistry')) {
    return 'CHEMISTRY BOARD STYLE: Display chemical reactions using structured equationParts (reactants, conditions above arrow, products), highlight oxidizing/reducing agents or mechanisms, and suggest diagramTopic for electrochemical cells, structures, or apparatus.';
  }
  if (s.includes('math')) {
    return 'MATHEMATICS BOARD STYLE: Show algebraic/calculus/matrix steps sequentially (kind: numerical_step or derivation_step), highlight identities, and set diagramTopic for graphs, coordinate geometry curves, or vectors.';
  }
  if (s.includes('biology')) {
    return 'BIOLOGY BOARD STYLE: Break physiological/genetic processes into flowchart steps, highlight key NCERT terms, and set diagramTopic for biological structures or replication/pathway diagrams.';
  }
  if (s.includes('computer')) {
    return 'COMPUTER SCIENCE BOARD STYLE: Put Python or SQL snippets in kind="code" with codeLanguage="python" or "sql", walk through trace steps line by line, and highlight edge cases.';
  }
  return 'ENGLISH BOARD STYLE: Show annotated grammar examples, highlight poetic/literary devices or sentence corrections (use kind="grammar"), and structure CBSE writing formats clearly.';
}

export async function runInteractiveTeacherTurn(params: {
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  teachingStyle: string;
  language: string;
  studentUtterance: string;
  currentConcept: string;
  currentQuestion: string;
  attemptCount: number;
  struggleCount?: number;
  recentHistory?: { role: 'user' | 'assistant'; content: string }[];
  command?: string;
  boardContext?: {
    teachingSpeed?: string;
    existingBlockTitles?: string[];
    isInterrupt?: boolean;
  };
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language] || LANGUAGE_INSTRUCTIONS.indian_english;
  const subjectGuidance = getSubjectPedagogyHint(params.subject);

  const intel = analyzeQueryIntelligence({
    message: params.studentUtterance,
    mode: params.teachingStyle,
    historyLength: params.recentHistory?.length ?? 0,
    interactiveActive: true,
  });
  const struggleCount = params.struggleCount ?? params.attemptCount;
  const teacherThinking =
    intel.thinkingDepth === 'HIGH' ||
    intel.thinkingDepth === 'XHIGH' ||
    struggleCount >= 2 ||
    params.command === 'solve_step_by_step'
      ? ThinkingLevel.HIGH
      : ThinkingLevel.MEDIUM;

  const systemInstruction = [
    getAroraIdentityInstruction(),
    getCoreReasoningAndReliabilityInstruction(),
    'You are ARORA Interactive AI Teacher conducting a live Virtual Classroom with a SYNCHRONIZED Digital Teaching Board.',
    langInstruction,
    subjectGuidance,
    'SEMANTIC INTERACTIVE TEACHING & BOARD INTELLIGENCE RULES (STRICT):',
    '1. EVALUATE BY MEANING, NOT KEYWORDS: Understand the student’s spoken/typed answer conceptually—even in casual wording or Tanglish. Detect underlying misconceptions specifically rather than guessing.',
    '2. ADAPTIVE PEDAGOGY WHEN STRUGGLING: If attemptCount >= 1 or struggleCount >= 2, switch your teaching method automatically (for example: move from formal definition -> concrete daily-life analogy -> step-by-step scaffold -> visual board diagram) and give a targeted hint before revealing.',
    '3. NEVER reveal the final answer before the student tries unless they explicitly ask or command is "reveal" or "solve_step_by_step".',
    '4. CONNECT CONCEPTS & HANDLE FOLLOW-UPS: Use recentHistory cleanly when the student asks "why?", disputes a step, or asks a clarification interrupt; link the current topic to prerequisite or cross-subject ideas.',
    '5. DECIDE BOARD UPDATES INTELLIGENTLY: Synchronize boardCues with spokenResponse using delayRatio (0.05 to 0.90) so formulas, worked calculation steps, highlights, corrections (op="replace"), or diagramTopic triggers match the spoken explanation.',
    '6. Never output raw LaTeX backslashes (\\frac, \\times, $$). Use clean Unicode symbols (×, ÷, ², ³, √, π, θ, ε₀, →, ⇌). Never invent textbook citations or PYQs.',
    '7. Support student controls seamlessly: "write_on_board", "clear_board", "solve_step_by_step", "give_example", "explain_again", "repeat_formula", "give_hint", "slow_down", "speed_up", "ask_question", "make_easier", "make_harder", "next_topic".',
    '8. Keep spokenResponse warm, articulate, concise, and natural for Text-to-Speech.',
  ].join('\n');

  const recentDialogue = (params.recentHistory || [])
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'Student' : 'ARORA Teacher'}: ${h.content.slice(0, 420)}`);

  const prompt = JSON.stringify({
    subject: params.subject,
    chapter: params.chapter,
    topic: params.topic,
    difficulty: params.difficulty,
    teachingStyle: params.teachingStyle,
    teachingSpeed: params.boardContext?.teachingSpeed || 'normal',
    existingBoardTitles: params.boardContext?.existingBlockTitles?.slice(-6) || [],
    currentConcept: params.currentConcept,
    pendingQuestion: params.currentQuestion,
    attemptCount: params.attemptCount,
    struggleCount,
    detectedCommand: params.command ?? null,
    isInterrupt: Boolean(params.boardContext?.isInterrupt),
    crossSubjectHint: intel.crossSubjectBridge ?? null,
    recentDialogue,
    studentUtterance: params.studentUtterance,
  });

  const boardCueItemSchema = {
    type: Type.OBJECT,
    properties: {
      op: {
        type: Type.STRING,
        description: 'One of: append, replace, highlight, erase_block, clear',
      },
      delayRatio: {
        type: Type.NUMBER,
        description: 'Normalized timestamp 0.0 to 0.9 when this board action should trigger during speech.',
      },
      kind: {
        type: Type.STRING,
        description:
          'One of: explanation, formula, derivation_step, numerical_step, definition, equation, code, grammar, question, highlight',
      },
      tone: {
        type: Type.STRING,
        description: 'One of: default, formula, example, important, correction, question, code',
      },
      title: {
        type: Type.STRING,
        description: 'Short clear heading for this board block.',
      },
      content: {
        type: Type.STRING,
        description: 'Main text, formula, code snippet, or question written on the board.',
      },
      lines: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Optional sub-steps or bullet points for the board block.',
      },
      codeLanguage: {
        type: Type.STRING,
        description: 'Only for Computer Science code blocks: python, sql, or algorithm.',
      },
      reactants: {
        type: Type.STRING,
        description: 'Chemistry equation reactants if op uses equation.',
      },
      conditions: {
        type: Type.STRING,
        description: 'Chemistry reaction catalyst/temperature conditions above arrow.',
      },
      products: {
        type: Type.STRING,
        description: 'Chemistry equation products.',
      },
      highlightTerms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Key terms to highlight inside this block.',
      },
    },
    required: ['op', 'delayRatio', 'kind', 'tone', 'title', 'content'],
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      spokenResponse: {
        type: Type.STRING,
        description: 'Voice-friendly teaching explanation, semantic evaluation feedback, or scaffolded hint.',
      },
      evaluationStatus: {
        type: Type.STRING,
        description: 'One of: teaching, correct, partial, incorrect, hint, adapted',
      },
      detectedMisconception: {
        type: Type.STRING,
        description: 'Specific conceptual misconception noticed in student answer/question, or empty string if none.',
      },
      teachingMethodUsed: {
        type: Type.STRING,
        description: 'One of: first_principles, real_world_analogy, step_by_step_scaffold, visual_diagram, socratic_hint',
      },
      nextQuestion: {
        type: Type.STRING,
        description: 'One focused follow-up or check-for-understanding question.',
      },
      formulaHighlight: {
        type: Type.STRING,
        description: 'Key formula, equation, or syntax highlight if applicable, else empty string.',
      },
      adaptedDifficulty: {
        type: Type.STRING,
        description: 'One of: Easy, Moderate, Hard, Expert',
      },
      advanceTopic: {
        type: Type.BOOLEAN,
        description: 'True only if student requested next topic or fully mastered current topic.',
      },
      teachingSpeedHint: {
        type: Type.STRING,
        description: 'One of: keep, slow, normal, fast',
      },
      diagramTopic: {
        type: Type.STRING,
        description:
          'Optional short NCERT diagram topic to auto-draw onto the board when visual drawing clarifies the concept, else empty string.',
      },
      boardCues: {
        type: Type.ARRAY,
        items: boardCueItemSchema,
        description: '1 to 4 synchronized Digital Board cues aligned sequentially with spokenResponse.',
      },
    },
    required: [
      'spokenResponse',
      'evaluationStatus',
      'detectedMisconception',
      'teachingMethodUsed',
      'nextQuestion',
      'formulaHighlight',
      'adaptedDifficulty',
      'advanceTopic',
      'teachingSpeedHint',
      'diagramTopic',
      'boardCues',
    ],
  };

  const response = await generateStructuredJsonWithFallback({
    ai,
    contents: prompt,
    systemInstruction,
    schema: responseSchema,
    preferredThinking: teacherThinking,
  });

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as {
    spokenResponse: string;
    evaluationStatus: string;
    detectedMisconception?: string;
    teachingMethodUsed?: string;
    nextQuestion: string;
    formulaHighlight: string;
    adaptedDifficulty: string;
    advanceTopic: boolean;
    teachingSpeedHint?: string;
    diagramTopic?: string;
    boardCues?: Array<{
      op?: string;
      delayRatio?: number;
      kind?: string;
      tone?: string;
      title?: string;
      content?: string;
      lines?: string[];
      codeLanguage?: string;
      reactants?: string;
      conditions?: string;
      products?: string;
      highlightTerms?: string[];
    }>;
  };

  const nowIso = new Date().toISOString();
  const allowedOps = new Set(['append', 'replace', 'highlight', 'erase_block', 'clear']);
  const allowedKinds = new Set([
    'explanation',
    'formula',
    'derivation_step',
    'numerical_step',
    'definition',
    'equation',
    'diagram',
    'code',
    'grammar',
    'question',
    'highlight',
  ]);
  const allowedTones = new Set([
    'default',
    'formula',
    'example',
    'important',
    'correction',
    'question',
    'code',
  ]);

  const sanitizedCues: ServerBoardCue[] = Array.isArray(parsed.boardCues)
    ? parsed.boardCues.slice(0, 6).map((c, idx) => {
        const op = allowedOps.has(String(c.op))
          ? (c.op as ServerBoardCue['op'])
          : 'append';
        const kind = allowedKinds.has(String(c.kind))
          ? (c.kind as NonNullable<ServerBoardCue['block']>['kind'])
          : 'explanation';
        const tone = allowedTones.has(String(c.tone))
          ? (c.tone as NonNullable<ServerBoardCue['block']>['tone'])
          : 'default';
        const blockId = `srv-blk-${Date.now()}-${idx}`;
        const hasReaction = Boolean(c.reactants?.trim() && c.products?.trim());
        return {
          id: `srv-cue-${Date.now()}-${idx}`,
          op,
          delayRatio:
            typeof c.delayRatio === 'number' && Number.isFinite(c.delayRatio)
              ? Math.min(0.95, Math.max(0, c.delayRatio))
              : Math.min(0.85, idx * 0.25),
          ...(op === 'clear' || op === 'erase_block'
            ? {}
            : {
                block: {
                  id: blockId,
                  kind,
                  tone,
                  title: c.title ? sanitizeAroraOutput(c.title) : undefined,
                  content: sanitizeAroraOutput(c.content || ''),
                  lines: Array.isArray(c.lines)
                    ? c.lines.slice(0, 8).map((l) => sanitizeAroraOutput(String(l)))
                    : undefined,
                  codeLanguage:
                    c.codeLanguage === 'python' ||
                    c.codeLanguage === 'sql' ||
                    c.codeLanguage === 'algorithm'
                      ? c.codeLanguage
                      : undefined,
                  equationParts: hasReaction
                    ? {
                        reactants: sanitizeAroraOutput(String(c.reactants)),
                        conditions: c.conditions ? sanitizeAroraOutput(String(c.conditions)) : undefined,
                        products: sanitizeAroraOutput(String(c.products)),
                      }
                    : undefined,
                  highlightTerms: Array.isArray(c.highlightTerms)
                    ? c.highlightTerms.slice(0, 6).map((t) => sanitizeAroraOutput(String(t)))
                    : undefined,
                  topicTag: params.topic,
                  createdAt: nowIso,
                },
              }),
        };
      })
    : [];

  return {
    spokenResponse: sanitizeAroraOutput(parsed.spokenResponse || ''),
    evaluationStatus: parsed.evaluationStatus || 'teaching',
    detectedMisconception: parsed.detectedMisconception
      ? sanitizeAroraOutput(parsed.detectedMisconception)
      : '',
    teachingMethodUsed: parsed.teachingMethodUsed || 'first_principles',
    nextQuestion: sanitizeAroraOutput(parsed.nextQuestion || ''),
    formulaHighlight: sanitizeAroraOutput(parsed.formulaHighlight || ''),
    adaptedDifficulty: parsed.adaptedDifficulty || params.difficulty,
    advanceTopic: Boolean(parsed.advanceTopic),
    teachingSpeedHint: parsed.teachingSpeedHint || 'keep',
    diagramTopic: parsed.diagramTopic ? sanitizeAroraOutput(parsed.diagramTopic) : '',
    boardCues: sanitizedCues,
    provider: 'ARORA Virtual Classroom Core',
  };
}

export async function generateClassroomWrapup(params: {
  subject: string;
  chapter: string;
  topicsCovered: string[];
  boardNotes: string[];
  questionLog: { question: string; studentAnswer: string; status: string }[];
  language: string;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language] || LANGUAGE_INSTRUCTIONS.indian_english;

  const systemInstruction = [
    getAroraIdentityInstruction(),
    langInstruction,
    'Generate a concise CBSE Class 12 post-class lesson summary, structured revision notes (clean markdown, Unicode math symbols, zero LaTeX backslashes), and 3 targeted multiple-choice recap questions grounded in what the student covered and missed.',
  ].join('\n\n');

  const prompt = JSON.stringify({
    subject: params.subject,
    chapter: params.chapter,
    topicsCovered: params.topicsCovered.slice(0, 10),
    boardHighlights: params.boardNotes.slice(0, 12),
    questionPerformance: params.questionLog.slice(-12),
  });

  const schema = {
    type: Type.OBJECT,
    properties: {
      lessonSummary: {
        type: Type.STRING,
        description: 'Warm 2-3 sentence recap of what was accomplished and areas to reinforce.',
      },
      revisionNotes: {
        type: Type.STRING,
        description: 'Structured Markdown revision sheet with headings, formulas/rules, and key takeaways.',
      },
      assessment: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            topic: { type: Type.STRING },
          },
          required: ['question', 'options', 'correctIndex', 'explanation', 'topic'],
        },
        description: '3 to 4 crisp CBSE Class 12 MCQ check questions.',
      },
    },
    required: ['lessonSummary', 'revisionNotes', 'assessment'],
  };

  const response = await generateStructuredJsonWithFallback({
    ai,
    contents: prompt,
    systemInstruction,
    schema,
    preferredThinking: ThinkingLevel.LOW,
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    lessonSummary: string;
    revisionNotes: string;
    assessment: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      topic: string;
    }>;
  };

  return {
    lessonSummary: sanitizeAroraOutput(parsed.lessonSummary || ''),
    revisionNotes: sanitizeAroraOutput(parsed.revisionNotes || ''),
    assessment: Array.isArray(parsed.assessment)
      ? parsed.assessment.slice(0, 5).map((item, idx) => ({
          id: `cls-quiz-${Date.now()}-${idx}`,
          question: sanitizeAroraOutput(item.question || ''),
          options: Array.isArray(item.options)
            ? item.options.slice(0, 4).map((o) => sanitizeAroraOutput(String(o)))
            : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex:
            typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex <= 3
              ? item.correctIndex
              : 0,
          explanation: sanitizeAroraOutput(item.explanation || ''),
          topic: sanitizeAroraOutput(item.topic || params.chapter),
        }))
      : [],
    provider: 'ARORA Classroom Synthesizer',
  };
}

export async function generateOriginalPracticeQuestion(params: {
  subjectName: string;
  chapterTitle: string;
  topic: string;
  subtopic?: string;
  marks: number;
  difficulty: string;
  questionType: string;
  sourceStyle?: string;
  year: number;
  existingQuestionSnippets?: string[];
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const avoidList = Array.isArray(params.existingQuestionSnippets)
    ? params.existingQuestionSnippets
        .slice(0, 8)
        .map((s, idx) => `${idx + 1}. ${s.slice(0, 140)}`)
        .join('\n')
    : '';

  const styleNote = params.sourceStyle && params.sourceStyle !== 'All'
    ? `Reference Style Guidance: Match the pedagogy, numerical/conceptual depth, and CBSE Class 12 typology characteristic of "${params.sourceStyle}" without copying any copyrighted verbatim passage.`
    : 'Reference Style Guidance: Match verified NCERT & CBSE Class 12 board examination typology.';

  const systemInstruction = [
    getAroraIdentityInstruction(),
    'You are an expert CBSE Class 12 curriculum item writer for ARORA AI.',
    'Generate ONE completely original, mathematically and conceptually verified CBSE-style practice question matching the requested marks, topic, subtopic, difficulty, and academic year blueprint.',
    styleNote,
    'VERIFICATION RULES:',
    '1. Double-check every calculation, sign, SI unit, balanced chemical reaction, biological pathway, or Python/SQL syntax before outputting.',
    '2. NEVER claim this is an official CBSE previous-year question or quote any copyright-restricted textbook verbatim.',
    '3. Provide a helpful non-spoiler hint, a concise formula/rule reference (where applicable), and a clear step-by-step value-marked solution.',
    '4. Use clean readable Unicode math symbols (×, ÷, ², √, π, ε₀, Δ, →, ∫) and zero raw LaTeX backslashes.',
    avoidList
      ? `5. DO NOT duplicate or closely rephrase these existing questions in this chapter:\n${avoidList}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const prompt = `Subject: ${params.subjectName}
Chapter: ${params.chapterTitle}
Topic: ${params.topic}
${params.subtopic ? `Subtopic: ${params.subtopic}` : ''}
Marks: ${params.marks}
Difficulty: ${params.difficulty}
Question Type: ${params.questionType}
Target Academic Session: ${params.year}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      questionText: { type: Type.STRING },
      assertionText: {
        type: Type.STRING,
        description: 'Populate only if Question Type is Assertion-Reason, else empty string.',
      },
      reasonText: {
        type: Type.STRING,
        description: 'Populate only if Question Type is Assertion-Reason, else empty string.',
      },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '4 options if MCQ, MSQ, or Assertion-Reason, otherwise empty array.',
      },
      correctOptionIndex: {
        type: Type.INTEGER,
        description: '0-3 if single-choice MCQ/Assertion-Reason, otherwise -1.',
      },
      correctOptionIndices: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER },
        description: 'Array of 0-based correct option indices if MSQ (multiple-select), otherwise empty array.',
      },
      correctAnswer: { type: Type.STRING },
      hint: {
        type: Type.STRING,
        description: 'Non-spoiler hint guiding the student toward the right formula or principle.',
      },
      formulaRef: {
        type: Type.STRING,
        description: 'Relevant formula, law, reaction pattern, theorem, or SQL/Python rule (empty string if pure literature).',
      },
      stepByStepSolution: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '3 to 6 ordered solution & CBSE marking-scheme steps.',
      },
      explanation: { type: Type.STRING },
    },
    required: [
      'questionText',
      'options',
      'correctOptionIndex',
      'correctOptionIndices',
      'correctAnswer',
      'hint',
      'formulaRef',
      'stepByStepSolution',
      'explanation',
    ],
  };

  const response = await generateStructuredJsonWithFallback({
    ai,
    contents: prompt,
    systemInstruction,
    schema,
    preferredThinking: ThinkingLevel.MEDIUM,
  });

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as {
    questionText: string;
    assertionText?: string;
    reasonText?: string;
    options: string[];
    correctOptionIndex: number;
    correctOptionIndices?: number[];
    correctAnswer: string;
    hint?: string;
    formulaRef?: string;
    stepByStepSolution?: string[];
    explanation: string;
  };
  return {
    ...parsed,
    questionText: sanitizeAroraOutput(parsed.questionText || ''),
    assertionText: parsed.assertionText ? sanitizeAroraOutput(parsed.assertionText) : undefined,
    reasonText: parsed.reasonText ? sanitizeAroraOutput(parsed.reasonText) : undefined,
    options: Array.isArray(parsed.options)
      ? parsed.options.slice(0, 4).map((o) => sanitizeAroraOutput(String(o)))
      : [],
    correctOptionIndices: Array.isArray(parsed.correctOptionIndices)
      ? parsed.correctOptionIndices.filter((n) => typeof n === 'number' && n >= 0 && n <= 3)
      : [],
    correctAnswer: sanitizeAroraOutput(parsed.correctAnswer || ''),
    hint: parsed.hint ? sanitizeAroraOutput(parsed.hint) : '',
    formulaRef: parsed.formulaRef ? sanitizeAroraOutput(parsed.formulaRef) : '',
    stepByStepSolution: Array.isArray(parsed.stepByStepSolution)
      ? parsed.stepByStepSolution.map((s) => sanitizeAroraOutput(String(s))).filter(Boolean)
      : [],
    explanation: sanitizeAroraOutput(parsed.explanation || ''),
  };
}

export async function evaluatePracticeAnswer(params: {
  questionText: string;
  correctAnswer: string;
  explanation: string;
  stepByStepSolution?: string[];
  marks: number;
  questionType: string;
  studentAnswer: string;
  language?: string;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language || 'indian_english'] ||
    LANGUAGE_INSTRUCTIONS.indian_english;

  const systemInstruction = [
    getAroraIdentityInstruction(),
    langInstruction,
    'You are grading a CBSE Class 12 student practice response constructively and accurately.',
    'Compare the student answer semantically and numerically against the verified answer and CBSE marking scheme steps.',
    'Reward correct reasoning/units/formulas even if wording differs from the reference text. If there is a mistake, explain exactly what slipped and give a short next-step hint without being condescending.',
  ].join('\n\n');

  const prompt = JSON.stringify({
    questionText: params.questionText,
    questionType: params.questionType,
    maxMarks: params.marks,
    verifiedAnswer: params.correctAnswer,
    stepByStepSolution: params.stepByStepSolution || [],
    explanation: params.explanation,
    studentAnswer: params.studentAnswer,
  });

  const schema = {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: 'Exactly one of: "correct", "partial", "incorrect".',
      },
      isCorrect: { type: Type.BOOLEAN },
      scoreAwarded: {
        type: Type.NUMBER,
        description: 'Marks awarded from 0 up to maxMarks (increments of 0.5 allowed).',
      },
      feedback: {
        type: Type.STRING,
        description: 'Direct, encouraging 1-2 sentence assessment.',
      },
      mistakeExplanation: {
        type: Type.STRING,
        description: 'Specific conceptual/calculation gap found (or reinforcement note if fully correct).',
      },
      nextStepHint: {
        type: Type.STRING,
        description: 'Actionable hint if partial/incorrect, or short challenge note if correct.',
      },
    },
    required: ['status', 'isCorrect', 'scoreAwarded', 'feedback', 'mistakeExplanation', 'nextStepHint'],
  };

  const response = await generateStructuredJsonWithFallback({
    ai,
    contents: prompt,
    systemInstruction,
    schema,
    preferredThinking: ThinkingLevel.LOW,
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    status: string;
    isCorrect: boolean;
    scoreAwarded: number;
    feedback: string;
    mistakeExplanation: string;
    nextStepHint: string;
  };

  const normalizedStatus =
    parsed.status === 'correct' || parsed.status === 'partial' || parsed.status === 'incorrect'
      ? parsed.status
      : parsed.isCorrect
        ? 'correct'
        : 'incorrect';

  return {
    status: normalizedStatus as 'correct' | 'partial' | 'incorrect',
    isCorrect: normalizedStatus === 'correct',
    scoreAwarded: Math.max(0, Math.min(params.marks, Number(parsed.scoreAwarded) || 0)),
    feedback: sanitizeAroraOutput(parsed.feedback || ''),
    mistakeExplanation: sanitizeAroraOutput(parsed.mistakeExplanation || ''),
    nextStepHint: sanitizeAroraOutput(parsed.nextStepHint || ''),
  };
}

export async function enrichSubjectSyllabusOnline(params: {
  subjectName: string;
  subjectCode: string;
  year: number;
  chapterTitle?: string;
  unit?: string;
  language?: string;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language || 'indian_english'] ||
    LANGUAGE_INSTRUCTIONS.indian_english;

  const isChapterLevel = Boolean(params.chapterTitle?.trim());

  const systemInstruction = [
    getAroraIdentityInstruction(),
    langInstruction,
    'ONLINE CBSE CLASS 12 CURRICULUM RESEARCH & MULTI-WEBSITE SYNTHESIS:',
    '1. Search and synthesize 100% accurate, complete CBSE Class 12 curriculum details using official CBSE (cbseacademic.nic.in), NCERT (ncert.nic.in / epathshala.ncert.gov.in), and respected academic study websites (such as Khan Academy, LearnCBSE, Vedantu, GeeksforGeeks, DIKSHA).',
    '2. Present a comprehensive, student-friendly, ChatGPT-caliber structured guide covering EVERY prescribed subtopic, weightage insight, key formulas/formats/code/concepts, practical connections, deleted portions clarity, and board-exam scoring strategy.',
    '3. ZERO RAW COMPUTER SYNTAX: Never output raw LaTeX backslashes (\\frac, \\times, $$) or JSON dumps. Use readable Unicode symbols (×, ÷, ², √, π, →, ε₀) and clean Markdown headings, bullet lists, and tables.',
    '4. Only include fenced code blocks if the subject is Computer Science (Python/SQL).',
  ].join('\n\n');

  const prompt = isChapterLevel
    ? `Fetch and synthesize 100% complete online CBSE Class 12 syllabus details and multi-website study guide for:
Subject: ${params.subjectName} (Code ${params.subjectCode})
Academic Session: ${params.year}
Unit: ${params.unit || 'Prescribed Unit'}
Chapter: ${params.chapterTitle}

Please include:
1. Complete 100% Subtopic Checklist (every single topic tested in CBSE Class 12 Board Exams)
2. Core Concepts, Key Definitions, and Must-Know Formulas / Literary Themes / Python-SQL Syntax
3. High-Weightage Board Exam Question Patterns & Previous-Year Focus
4. Practical / Internal Assessment Connections & Common Mistakes to Avoid
5. Clarify any Deleted / Rationalized subtopics students can safely skip.`
    : `Fetch and synthesize the 100% complete official CBSE Class 12 syllabus & multi-website study roadmap for:
Subject: ${params.subjectName} (Code ${params.subjectCode})
Academic Session: ${params.year}

Please include:
1. Complete Unit-Wise & Chapter-Wise Marks Weightage Table (Theory + Practical/Internal Assessment = 100 Marks)
2. Full 100% Portion Summary across all Units & Chapters (plus clearly marked Rationalized/Deleted chapters)
3. Practical / ASL / Lab / Project Evaluation Breakdown
4. Recommended Preparation Strategy & High-Yield Reference Focus across CBSE, NCERT, and leading online study portals.`;

  const response = await generateWithFallback(
    ai,
    prompt,
    systemInstruction,
    ThinkingLevel.MEDIUM,
    true,
  );
  const sources = extractGroundingSources(response);

  return {
    content: sanitizeAroraOutput(
      response.text ?? 'Unable to synthesize online syllabus guide right now.',
    ),
    sources,
    provider: 'ARORA Online Syllabus Synthesizer',
    enrichedAt: new Date().toISOString(),
  };
}

export async function generateTopicDiagram(params: {
  topic: string;
  subjectHint?: string;
  additionalContext?: string;
  language?: string;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const systemInstruction = [
    getAroraIdentityInstruction(),
    'PRECISION SCIENTIFIC & TEXTBOOK VECTOR DIAGRAM ENGINE (CBSE CLASS 12 / NCERT STANDARD):',
    'Generate a publication-grade, crystal-clear, accurately labelled SVG diagram inside a strict 800x480 coordinate grid.',
    'VISUAL & GEOMETRY PERFECTION RULES:',
    '1. Canvas: Root element MUST be <svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">. First child MUST be a dark slate backdrop <rect width="800" height="480" rx="16" fill="#0b1220" /> plus subtle optional gridlines.',
    '2. Include reusable <defs> arrow markers (<marker id="arrow-cyan" ...>, <marker id="arrow-amber" ...>, <marker id="arrow-emerald" ...>, <marker id="arrow-rose" ...>) so all rays, currents, vectors, and flows have crisp arrowheads.',
    '3. Keep primary diagram geometry cleanly inside x: 110..670, y: 68..425 so there is generous perimeter room for non-overlapping horizontal labels.',
    '4. NEVER overlap text labels or cross lines awkwardly: place text annotations neatly in outer whitespace using crisp leader lines (stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3") with a small dot (<circle r="3" ...>) pinpointing the exact anatomical/circuit/optical feature. Keep adjacent labels separated vertically by at least 22px.',
    '5. Domain accuracy:',
    '   - Physics Optics: draw straight principal axis, optical centers, focal points F/2F, proper concave/convex lens or mirror arcs, incident/refracted/reflected rays WITH directional arrowheads, virtual extensions dashed, object AB and image A\'B\'.',
    '   - Physics/Electronics Circuits: standard IEEE/NCERT symbols (zigzag/box resistor, diode triangle+bar, coils, AC source sine circle, parallel plates, current arrows I, terminal polarity +/-).',
    '   - Biology Anatomy / Genetics: distinct double/single membranes, organelles, arrows for synthesis/pathway direction (e.g. DNA 5\'->3\' polarity, ori/ampR/tetR/restriction sites on pBR322 plasmid, sperm acrosome/mitochondria spiral, heart/nephron/flower parts).',
    '   - Chemistry Mechanisms & Cells: accurate hexagonal rings, δ+/δ- partial charges, salt bridge U-tube, anode/cathode half-cells, e⁻ flow arrow, standard orbital shapes.',
    '   - Mathematics & CS: labelled axes with ticks and arrowheads, smooth curves, tangent/secant/area shading, clean flowchart boxes/diamonds with Yes/No branches.',
    '6. Color Palette on #0b1220: #38bdf8 (cyan primary), #fbbf24 (amber highlights/rays), #34d399 (emerald green), #c084fc (violet), #f472b6 (rose), #e2e8f0 (clean sans-serif text font-family="system-ui, sans-serif" font-size="12" or "13").',
    '7. Output ONLY valid, self-contained SVG markup without <script>, <foreignObject>, or external image URLs. Zero LaTeX backslashes.',
  ].join('\n');

  const prompt = [
    `Topic to draw with NCERT / CBSE textbook perfection: ${params.topic}`,
    params.subjectHint ? `Subject context: ${params.subjectHint}` : '',
    params.additionalContext ? `Extra student context: ${params.additionalContext}` : '',
    'Deliver clean SVG vector geometry, exact labels, concise keyLabels legend entries, and CBSE board-exam drawing tips.',
  ]
    .filter(Boolean)
    .join('\n');

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Clean formal diagram title (e.g., "Compound Microscope — Ray Diagram at Least Distance of Distinct Vision").',
      },
      subjectHint: {
        type: Type.STRING,
        description: 'Subject & chapter context (e.g., "Physics · Ray Optics").',
      },
      caption: {
        type: Type.STRING,
        description: 'Clear 1-2 sentence textbook figure caption.',
      },
      svgMarkup: {
        type: Type.STRING,
        description: 'Complete self-contained <svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">...</svg> diagram markup with crisp non-overlapping labels and leader lines.',
      },
      keyLabels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['label', 'description'],
        },
        description: '4 to 8 important labelled parts and their concise functions.',
      },
      boardDrawingTips: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '2 to 4 practical CBSE Board Exam tips for drawing this diagram cleanly for full marks.',
      },
    },
    required: [
      'title',
      'subjectHint',
      'caption',
      'svgMarkup',
      'keyLabels',
      'boardDrawingTips',
    ],
  };

  const modelsToTry = [MODEL_NAME, FALLBACK_MODEL_NAME, FALLBACK_MODEL_NAME];
  let lastError: unknown;

  for (let i = 0; i < modelsToTry.length; i += 1) {
    const modelName = modelsToTry[i];
    if (i === 2) {
      await waitMs(350);
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          ...(modelName === MODEL_NAME
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw) as {
        title: string;
        subjectHint: string;
        caption: string;
        svgMarkup: string;
        keyLabels: { label: string; description: string }[];
        boardDrawingTips: string[];
      };

      const safeSvg = sanitizeSvgMarkup(parsed.svgMarkup);
      if (!safeSvg) {
        throw new Error('Generated vector diagram failed geometry validation.');
      }

      return {
        title: sanitizeAroraOutput(parsed.title || params.topic),
        topic: params.topic,
        subjectHint: sanitizeAroraOutput(parsed.subjectHint || params.subjectHint || 'CBSE Study'),
        caption: sanitizeAroraOutput(parsed.caption || ''),
        svgMarkup: safeSvg,
        keyLabels: Array.isArray(parsed.keyLabels)
          ? parsed.keyLabels.slice(0, 10).map((item) => ({
              label: sanitizeAroraOutput(String(item.label || '')),
              description: sanitizeAroraOutput(String(item.description || '')),
            }))
          : [],
        boardDrawingTips: Array.isArray(parsed.boardDrawingTips)
          ? parsed.boardDrawingTips.slice(0, 5).map((tip) => sanitizeAroraOutput(String(tip || '')))
          : [],
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      lastError = err;
      if (i === modelsToTry.length - 1) throw err;
    }
  }

  throw lastError;
}

const VALID_NEURAL_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir']);

export function prepareTextForFluentSpeech(input: string): string {
  return sanitizeAroraOutput(input)
    .replace(/```[\s\S]*?```/g, ' Here is the code example shown on screen. ')
    .replace(/[*_`#>]/g, '')
    .replace(/\u2192|->/g, ' leads to ')
    .replace(/\u03bb/g, ' lambda ')
    .replace(/\u03bc/g, ' micro ')
    .replace(/\u0394/g, ' delta ')
    .replace(/\u03b8/g, ' theta ')
    .replace(/\u03b5\u2080|\u03b50/g, ' epsilon naught ')
    .replace(/\u03c0/g, ' pi ')
    .replace(/\u03a9/g, ' ohm ')
    .replace(/(\d+)\s*\^\s*(\d+)/g, '$1 to the power of $2')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1400);
}

export async function synthesizeAroraSpeech(params: {
  text: string;
  language: string;
  voiceName?: string;
}) {
  const ai = getAiClient('v1beta');
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const spokenText = prepareTextForFluentSpeech(params.text);
  if (!spokenText) {
    throw new Error('No speakable text provided.');
  }

  const chosenVoice =
    params.voiceName && VALID_NEURAL_VOICES.has(params.voiceName)
      ? params.voiceName
      : 'Zephyr';

  const styleGuide =
    params.language === 'tamil'
      ? 'Speak in natural, warm, fluent conversational Tamil with smooth pacing, expressive clarity, and human poise like an attentive personal tutor.'
      : params.language === 'tanglish'
        ? 'Speak warmly and fluently in natural conversational Tamil-English (Tanglish) with relaxed, intelligent, Siri-like clarity and smooth intonation.'
        : 'Speak fluently like a warm, articulate, attentive human AI voice assistant (natural Siri-like poise, smooth conversational rhythm, clear Indian English pronunciation, zero robotic stiffness).';

  const invokeTts = () =>
    ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: spokenText,
              speechMetadata: {
                style: styleGuide,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: chosenVoice,
            },
          },
        },
      },
    });

  let response;
  try {
    response = await invokeTts();
  } catch (err) {
    if (!isTransientCloudError(err)) throw err;
    await waitMs(350);
    response = await invokeTts();
  }

  const audioBase64 =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioBase64) {
    throw new Error('Neural TTS returned empty audio stream.');
  }

  return {
    audioBase64,
    mimeType: 'audio/wav',
    voiceName: chosenVoice,
  };
}

export async function connectAroraLiveSession(params: {
  language: string;
  voiceName?: string;
  interactiveContext?: string;
  onAudioChunk: (base64Pcm: string) => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onError: (err: string) => void;
  onClose: () => void;
}) {
  const ai = getAiClient('v1beta');
  if (!ai) {
    throw new Error('CLOUD_AI_NOT_CONFIGURED');
  }

  const chosenVoice =
    params.voiceName && VALID_NEURAL_VOICES.has(params.voiceName)
      ? params.voiceName
      : 'Zephyr';

  const langInstruction =
    LANGUAGE_INSTRUCTIONS[params.language] || LANGUAGE_INSTRUCTIONS.indian_english;

  const systemInstruction = [
    getAroraIdentityInstruction(),
    getCoreReasoningAndReliabilityInstruction(),
    langInstruction,
    'LIVE FULL-DUPLEX VOICE CONVERSATION RULES:',
    '1. Speak warmly, naturally, and intelligently like a perceptive human teacher—understand incomplete spoken fragments, Tanglish idioms, and follow-up references without forcing repetition.',
    '2. Verify reasoning before speaking: explain why and how concisely, give everyday examples, admit uncertainty cleanly rather than inventing citations, and adapt immediately if the student interrupts mid-sentence.',
    '3. Keep spoken sentences crisp and natural for voice (zero markdown formatting, raw LaTeX, or bullet clutter).',
    params.interactiveContext
      ? `Active classroom context: ${params.interactiveContext}`
      : 'Default mode: Casual one-on-one intelligent AI companion & CBSE Class 12 tutor. Only enforce structured classroom questioning if Interactive Mode context is active.',
  ].join('\n\n');

  const session = await ai.live.connect({
    model: LIVE_MODEL_NAME,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: chosenVoice,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction,
    },
    callbacks: {
      onmessage: (message: LiveServerMessage) => {
        const content = message.serverContent;
        if (content?.inputTranscription?.text) {
          params.onInputTranscript(sanitizeAroraOutput(content.inputTranscription.text));
        }
        if (content?.outputTranscription?.text) {
          params.onOutputTranscript(sanitizeAroraOutput(content.outputTranscription.text));
        }
        for (const part of content?.modelTurn?.parts ?? []) {
          if (part.inlineData?.data) {
            params.onAudioChunk(part.inlineData.data);
          }
        }
        if (content?.interrupted) {
          params.onInterrupted();
        }
        if (content?.turnComplete) {
          params.onTurnComplete();
        }
      },
      onerror: (e: { message?: string }) => {
        params.onError(
          formatSafeCloudError(
            e?.message ? new Error(e.message) : new Error('Live voice session encountered a connection error.'),
          ),
        );
      },
      onclose: () => {
        params.onClose();
      },
    },
  });

  return session;
}

export { sanitizeAroraOutput };
