import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  connectAroraLiveSession,
  enrichSubjectSyllabusOnline,
  evaluatePracticeAnswer,
  formatSafeCloudError,
  generateClassroomWrapup,
  generateOriginalPracticeQuestion,
  generateTopicDiagram,
  isGeminiConfigured,
  runAroraChat,
  runInteractiveTeacherTurn,
  runTeacherCasualTurn,
  streamAroraChat,
  streamTeacherCasualTurn,
  synthesizeAroraSpeech,
  validateAttachments,
} from './server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function sanitizeHistory(rawHistory: unknown, maxLen: number) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter(
      (item): item is { role: 'user' | 'assistant'; content: string } =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as { role?: unknown }).role === 'user' ||
          (item as { role?: unknown }).role === 'assistant') &&
        typeof (item as { content?: unknown }).content === 'string',
    )
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, maxLen),
    }));
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '16mb' }));

  // Health & Provider Status Route (never exposes secrets or underlying provider names)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'arora-ai-backend',
      cloudConfigured: isGeminiConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  // Fast SSE Streaming Chatbot Route
  app.post('/api/ai/chat/stream', async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (message.length > 16000) {
      return res.status(400).json({ error: 'Message exceeds maximum length.' });
    }

    const mode = typeof body.mode === 'string' ? body.mode : 'Auto (Smart)';
    const language = typeof body.language === 'string' ? body.language : 'indian_english';
    const memorySummary =
      typeof body.memorySummary === 'string' ? body.memorySummary.slice(0, 1000) : undefined;
    const maxContextTurns =
      typeof body.maxContextTurns === 'number' ? body.maxContextTurns : 8;
    const history = sanitizeHistory(body.history, 6000);
    const attachments = validateAttachments(body.attachments);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    const keepAliveTimer = setInterval(() => {
      if (!res.writableEnded && !abortController.signal.aborted) {
        res.write(': keepalive\n\n');
      }
    }, 10000);

    res.on('close', () => {
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) abortController.abort();
    });

    const sendEvent = (payload: unknown) => {
      if (res.writableEnded || abortController.signal.aborted) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await streamAroraChat({
        message,
        mode,
        language,
        history,
        attachments,
        memorySummary,
        maxContextTurns,
        signal: abortController.signal,
        onDelta: (delta) => sendEvent({ type: 'delta', delta }),
      });
      if (!abortController.signal.aborted) {
        sendEvent({
          type: 'done',
          text: result.text,
          provider: result.provider,
          responseStyle: result.responseStyle,
          sources: result.sources,
        });
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        sendEvent({
          type: 'error',
          error: formatSafeCloudError(error),
        });
      }
    } finally {
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) res.end();
    }
  });

  // Fast SSE Streaming Casual AI Teacher Agent Route
  app.post('/api/ai/teacher-casual/stream', async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (message.length > 8000) {
      return res.status(400).json({ error: 'Message exceeds maximum length.' });
    }

    const language = typeof body.language === 'string' ? body.language : 'indian_english';
    const history = sanitizeHistory(body.history, 4000);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    const keepAliveTimer = setInterval(() => {
      if (!res.writableEnded && !abortController.signal.aborted) {
        res.write(': keepalive\n\n');
      }
    }, 10000);

    res.on('close', () => {
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) abortController.abort();
    });

    const sendEvent = (payload: unknown) => {
      if (res.writableEnded || abortController.signal.aborted) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await streamTeacherCasualTurn({
        message,
        language,
        history,
        signal: abortController.signal,
        onDelta: (delta) => sendEvent({ type: 'delta', delta }),
      });
      if (!abortController.signal.aborted) {
        sendEvent({
          type: 'done',
          text: result.text,
          provider: result.provider,
          sources: result.sources,
        });
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        sendEvent({
          type: 'error',
          error: formatSafeCloudError(error),
        });
      }
    } finally {
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) res.end();
    }
  });

  // Non-streaming JSON Chatbot Route (kept for compatibility)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }
      if (message.length > 16000) {
        return res.status(400).json({ error: 'Message exceeds maximum length.' });
      }

      const mode = typeof body.mode === 'string' ? body.mode : 'Auto (Smart)';
      const language = typeof body.language === 'string' ? body.language : 'indian_english';
      const memorySummary =
        typeof body.memorySummary === 'string' ? body.memorySummary.slice(0, 1000) : undefined;
      const maxContextTurns =
        typeof body.maxContextTurns === 'number' ? body.maxContextTurns : 8;
      const history = sanitizeHistory(body.history, 6000);
      const attachments = validateAttachments(body.attachments);

      const result = await runAroraChat({
        message,
        mode,
        language,
        history,
        attachments,
        memorySummary,
        maxContextTurns,
      });

      return res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      if (msg === 'CLOUD_AI_NOT_CONFIGURED') {
        return res.status(503).json({
          error: 'ARORA Cloud Intelligence API key is not configured on this server.',
          code: 'CLOUD_AI_NOT_CONFIGURED',
        });
      }
      return res.status(502).json({
        error: formatSafeCloudError(error),
        code: 'CLOUD_AI_ERROR',
      });
    }
  });

  // Casual Conversational AI Teacher Agent Route
  app.post('/api/ai/teacher-casual', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }
      if (message.length > 8000) {
        return res.status(400).json({ error: 'Message exceeds maximum length.' });
      }

      const language = typeof body.language === 'string' ? body.language : 'indian_english';
      const history = sanitizeHistory(body.history, 4000);

      const result = await runTeacherCasualTurn({
        message,
        language,
        history,
      });

      return res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Voice-First Interactive AI Teacher Route (Active when Classroom Mode is ON)
  app.post('/api/ai/interactive', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const rawBoardCtx =
        body.boardContext && typeof body.boardContext === 'object'
          ? (body.boardContext as Record<string, unknown>)
          : undefined;
      const result = await runInteractiveTeacherTurn({
        subject: typeof body.subject === 'string' ? body.subject : 'Physics',
        chapter: typeof body.chapter === 'string' ? body.chapter : '',
        topic: typeof body.topic === 'string' ? body.topic : '',
        difficulty: typeof body.difficulty === 'string' ? body.difficulty : 'Moderate',
        teachingStyle:
          typeof body.teachingStyle === 'string' ? body.teachingStyle : 'Conceptual learning',
        language: typeof body.language === 'string' ? body.language : 'indian_english',
        studentUtterance:
          typeof body.studentUtterance === 'string' ? body.studentUtterance.slice(0, 4000) : '',
        currentConcept:
          typeof body.currentConcept === 'string' ? body.currentConcept.slice(0, 3000) : '',
        currentQuestion:
          typeof body.currentQuestion === 'string' ? body.currentQuestion.slice(0, 2000) : '',
        attemptCount: typeof body.attemptCount === 'number' ? body.attemptCount : 0,
        struggleCount: typeof body.struggleCount === 'number' ? body.struggleCount : undefined,
        recentHistory: sanitizeHistory(body.recentHistory, 1200),
        command: typeof body.command === 'string' ? body.command : undefined,
        boardContext: rawBoardCtx
          ? {
              teachingSpeed:
                typeof rawBoardCtx.teachingSpeed === 'string'
                  ? rawBoardCtx.teachingSpeed
                  : 'normal',
              existingBlockTitles: Array.isArray(rawBoardCtx.existingBlockTitles)
                ? rawBoardCtx.existingBlockTitles
                    .slice(0, 8)
                    .map((t) => String(t).slice(0, 120))
                : [],
              isInterrupt: Boolean(rawBoardCtx.isInterrupt),
            }
          : undefined,
      });
      return res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Post-Class Lesson Summary, Revision Notes & Assessment Route
  app.post('/api/ai/classroom-wrapup', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const result = await generateClassroomWrapup({
        subject: typeof body.subject === 'string' ? body.subject.slice(0, 80) : 'Physics',
        chapter: typeof body.chapter === 'string' ? body.chapter.slice(0, 180) : '',
        topicsCovered: Array.isArray(body.topicsCovered)
          ? body.topicsCovered.slice(0, 12).map((t) => String(t).slice(0, 140))
          : [],
        boardNotes: Array.isArray(body.boardNotes)
          ? body.boardNotes.slice(0, 14).map((n) => String(n).slice(0, 400))
          : [],
        questionLog: Array.isArray(body.questionLog)
          ? body.questionLog.slice(-12).map((item) => {
              const rec = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
              return {
                question: typeof rec.question === 'string' ? rec.question.slice(0, 300) : '',
                studentAnswer:
                  typeof rec.studentAnswer === 'string' ? rec.studentAnswer.slice(0, 300) : '',
                status: typeof rec.status === 'string' ? rec.status.slice(0, 32) : 'skipped',
              };
            })
          : [],
        language: typeof body.language === 'string' ? body.language.slice(0, 32) : 'indian_english',
      });
      return res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Original AI Practice Question Generator Route
  app.post('/api/ai/generate-question', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const generated = await generateOriginalPracticeQuestion({
        subjectName: typeof body.subjectName === 'string' ? body.subjectName : 'Physics',
        chapterTitle: typeof body.chapterTitle === 'string' ? body.chapterTitle : 'Electrostatics',
        topic: typeof body.topic === 'string' ? body.topic : 'Coulomb Law',
        subtopic: typeof body.subtopic === 'string' ? body.subtopic.slice(0, 140) : undefined,
        marks: typeof body.marks === 'number' ? body.marks : 3,
        difficulty: typeof body.difficulty === 'string' ? body.difficulty : 'Moderate',
        questionType: typeof body.questionType === 'string' ? body.questionType : 'Competency-Based',
        sourceStyle:
          typeof body.sourceStyle === 'string' ? body.sourceStyle.slice(0, 64) : undefined,
        year: typeof body.year === 'number' ? body.year : 2027,
        existingQuestionSnippets: Array.isArray(body.existingQuestionSnippets)
          ? body.existingQuestionSnippets.slice(0, 10).map((s) => String(s).slice(0, 180))
          : undefined,
      });
      return res.json(generated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Semantic Practice Answer Evaluation Route
  app.post('/api/ai/evaluate-practice-answer', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const questionText =
        typeof body.questionText === 'string' ? body.questionText.trim().slice(0, 2000) : '';
      const studentAnswer =
        typeof body.studentAnswer === 'string' ? body.studentAnswer.trim().slice(0, 4000) : '';
      if (!questionText || !studentAnswer) {
        return res.status(400).json({ error: 'Question and student answer are required.' });
      }
      const evaluation = await evaluatePracticeAnswer({
        questionText,
        correctAnswer:
          typeof body.correctAnswer === 'string' ? body.correctAnswer.slice(0, 2000) : '',
        explanation:
          typeof body.explanation === 'string' ? body.explanation.slice(0, 2500) : '',
        stepByStepSolution: Array.isArray(body.stepByStepSolution)
          ? body.stepByStepSolution.slice(0, 8).map((s) => String(s).slice(0, 400))
          : undefined,
        marks: typeof body.marks === 'number' ? body.marks : 3,
        questionType:
          typeof body.questionType === 'string' ? body.questionType.slice(0, 40) : '3-Mark',
        studentAnswer,
        language: typeof body.language === 'string' ? body.language.slice(0, 32) : 'indian_english',
      });
      return res.json(evaluation);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Live Multi-Website Online Syllabus & Chapter Portion Synthesizer Route
  app.post('/api/ai/syllabus-enrich', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const subjectName =
        typeof body.subjectName === 'string' ? body.subjectName.trim().slice(0, 80) : '';
      if (!subjectName) {
        return res.status(400).json({ error: 'Subject name is required.' });
      }
      const enriched = await enrichSubjectSyllabusOnline({
        subjectName,
        subjectCode:
          typeof body.subjectCode === 'string' ? body.subjectCode.slice(0, 16) : '',
        year: typeof body.year === 'number' ? body.year : 2027,
        chapterTitle:
          typeof body.chapterTitle === 'string' ? body.chapterTitle.slice(0, 180) : undefined,
        unit: typeof body.unit === 'string' ? body.unit.slice(0, 180) : undefined,
        language:
          typeof body.language === 'string' ? body.language.slice(0, 32) : 'indian_english',
      });
      return res.json(enriched);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Precision Labelled Topic Diagram Synthesizer Route
  app.post('/api/ai/diagram', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 220) : '';
      if (!topic) {
        return res.status(400).json({ error: 'Diagram topic is required.' });
      }
      const diagram = await generateTopicDiagram({
        topic,
        subjectHint:
          typeof body.subjectHint === 'string' ? body.subjectHint.slice(0, 120) : undefined,
        additionalContext:
          typeof body.additionalContext === 'string'
            ? body.additionalContext.slice(0, 600)
            : undefined,
        language:
          typeof body.language === 'string' ? body.language.slice(0, 32) : 'indian_english',
      });
      return res.json(diagram);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Fluent Human / Siri-like Neural Text-to-Speech Route
  app.post('/api/ai/tts', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) {
        return res.status(400).json({ error: 'Text cannot be empty.' });
      }
      const language = typeof body.language === 'string' ? body.language : 'indian_english';
      const voiceName = typeof body.voicePersona === 'string' ? body.voicePersona : 'Zephyr';

      const result = await synthesizeAroraSpeech({
        text: text.slice(0, 2000),
        language,
        voiceName,
      });
      return res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const status = msg === 'CLOUD_AI_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: formatSafeCloudError(error) });
    }
  });

  // Full-Duplex Bidirectional Live Voice WebSocket Bridge (/api/live)
  const liveWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/api/live')) return;
    liveWss.handleUpgrade(request, socket, head, (ws) => {
      liveWss.emit('connection', ws, request);
    });
  });

  liveWss.on('connection', async (clientWs: WebSocket, req: http.IncomingMessage) => {
    const reqUrl = new URL(req.url || '/api/live', `http://${req.headers.host || 'localhost'}`);
    const language = reqUrl.searchParams.get('language') || 'indian_english';
    const voiceName = reqUrl.searchParams.get('voice') || 'Zephyr';
    const interactiveContext = reqUrl.searchParams.get('context') || undefined;

    let session: Awaited<ReturnType<typeof connectAroraLiveSession>> | null = null;
    let isClosing = false;
    let suppressOutgoingUntil = 0;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN && !isClosing) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    clientWs.on('message', (raw, isBinary) => {
      if (isClosing) return;

      // Fast-path binary PCM16 16kHz frame from browser AudioWorklet (avoids client-side Base64 & JSON overhead)
      if (isBinary) {
        if (!session) return;
        const pcmBuf = Buffer.isBuffer(raw)
          ? raw
          : Array.isArray(raw)
            ? Buffer.concat(raw)
            : Buffer.from(raw);
        if (pcmBuf.byteLength === 0) return;
        try {
          session.sendRealtimeInput({
            audio: {
              data: pcmBuf.toString('base64'),
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } catch {
          // Ignore send during session teardown
        }
        return;
      }

      let msg: {
        ping?: boolean;
        ts?: number;
        audio?: string;
        text?: string;
        contextUpdate?: string;
        interrupt?: boolean;
      };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.ping) {
        safeSend({ pong: true, ts: typeof msg.ts === 'number' ? msg.ts : Date.now() });
        return;
      }

      if (!session) return;

      if (msg.interrupt) {
        // Suppress trailing chunks from the interrupted response up to 1.5s or until turnComplete/new transcript
        suppressOutgoingUntil = Date.now() + 1500;
        safeSend({ interrupted: true });
        return;
      }

      if (msg.audio) {
        try {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } catch {
          // Ignore send during session teardown
        }
      }

      if (msg.contextUpdate) {
        suppressOutgoingUntil = 0;
        try {
          session.sendRealtimeInput({
            text: `[Classroom Context Update — do not read aloud unless needed]: ${msg.contextUpdate}`,
          });
        } catch {
          // Ignore send during teardown
        }
      }

      if (msg.text) {
        suppressOutgoingUntil = 0;
        try {
          session.sendRealtimeInput({ text: msg.text });
        } catch {
          // Ignore send during teardown
        }
      }
    });

    clientWs.on('close', () => {
      isClosing = true;
      try {
        session?.close();
      } catch {
        // ignore close error
      }
      session = null;
    });

    try {
      const connectTimeout = setTimeout(() => {
        if (!session && !isClosing) {
          safeSend({ error: 'Live Voice handshake timed out. Please tap Reconnect.' });
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        }
      }, 11000);

      const created = await connectAroraLiveSession({
        language,
        voiceName,
        interactiveContext,
        onAudioChunk: (audio) => {
          if (Date.now() > suppressOutgoingUntil) {
            safeSend({ audio });
          }
        },
        onInputTranscript: (inputTranscript) => {
          suppressOutgoingUntil = 0;
          safeSend({ inputTranscript });
        },
        onOutputTranscript: (outputTranscript) => {
          if (Date.now() > suppressOutgoingUntil) {
            safeSend({ outputTranscript });
          }
        },
        onInterrupted: () => {
          suppressOutgoingUntil = 0;
          safeSend({ interrupted: true });
        },
        onTurnComplete: () => {
          suppressOutgoingUntil = 0;
          safeSend({ turnComplete: true });
        },
        onError: (error) => {
          safeSend({ error });
        },
        onClose: () => {
          if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        },
      });
      clearTimeout(connectTimeout);

      if (isClosing || clientWs.readyState !== WebSocket.OPEN) {
        try {
          created.close();
        } catch {
          // ignore close error
        }
        return;
      }
      session = created;
      safeSend({ ready: true });
    } catch (err) {
      safeSend({ error: formatSafeCloudError(err) });
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    }
  });

  let viteServer: { close: () => Promise<void> } | null = null;

  if (!isProduction) {
    let viteMiddleware: express.RequestHandler | null = null;
    let viteInitError: unknown = null;

    const { createServer: createViteServer } = await import('vite');
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    })
      .then((vite) => {
        viteServer = vite;
        viteMiddleware = vite.middlewares;
        return vite;
      })
      .catch((err) => {
        viteInitError = err;
        console.error('Failed to initialize Vite dev middleware:', err);
        throw err;
      });

    app.use((req, res, next) => {
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      if (viteInitError) {
        return next(viteInitError);
      }
      vitePromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`ARORA AI server listening on http://0.0.0.0:${PORT}`);
      resolve();
    });
  });

  const shutdown = async () => {
    try {
      await viteServer?.close();
    } catch {
      // ignore close error
    }
    httpServer.close(() => process.exit(0));
  };
  process.once('SIGTERM', () => {
    void shutdown();
  });
  process.once('SIGINT', () => {
    void shutdown();
  });
}

startServer().catch((err) => {
  console.error('Failed to start ARORA AI server:', err);
  process.exit(1);
});
