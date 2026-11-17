/**
 * Real-time Runtime Monitor & Auto-Recovery Engine for ARORA AI.
 * Tracks live WebWorker throughput, JS Heap memory usage, active SSE streams,
 * Voice synthesis/recognition locks, and Live WebSocket connection health,
 * providing safe non-destructive recovery actions for stuck sessions.
 */

export type LiveWsMonitorState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'stalled'
  | 'error'
  | 'closed';

export type WorkerMonitorStatus = 'idle' | 'healthy' | 'slow' | 'stalled' | 'unsupported' | 'error';

export type RecoveryActionKind =
  | 'reset_ws'
  | 'probe_ws'
  | 'abort_streams'
  | 'reset_voice'
  | 'restart_worker'
  | 'free_memory';

export interface LiveSocketMonitorEntry {
  id: string;
  state: LiveWsMonitorState;
  startedAt: number;
  connectedAt: number | null;
  lastActivityAt: number;
  rttMs: number | null;
  usingWorklet: boolean;
  audioFramesSent: number;
  audioChunksReceived: number;
  lastError: string | null;
  recover: () => void;
}

export interface ActiveStreamMonitorEntry {
  id: string;
  startedAt: number;
  lastChunkAt: number;
  recover: () => void;
}

export interface WsProbeSnapshot {
  status: 'idle' | 'probing' | 'healthy' | 'degraded' | 'error';
  handshakeMs: number | null;
  pingRttMs: number | null;
  checkedAt: number | null;
  error: string | null;
}

export interface WorkerMetricsSnapshot {
  supported: boolean;
  status: WorkerMonitorStatus;
  rttMs: number | null;
  throughputOpsPerSec: number | null;
  eventLoopLagMs: number | null;
  restartsCount: number;
  lastCheckedAt: number | null;
  error: string | null;
}

export interface MemoryMetricsSnapshot {
  heapSupported: boolean;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  jsHeapLimitMb: number | null;
  heapUsagePercent: number | null;
  pressure: 'low' | 'moderate' | 'high';
}

export interface RuntimeMonitorSnapshot {
  timestamp: number;
  websocket: {
    activeCount: number;
    state: LiveWsMonitorState;
    startedAt: number | null;
    connectedAt: number | null;
    lastActivityAt: number | null;
    rttMs: number | null;
    usingWorklet: boolean;
    audioFramesSent: number;
    audioChunksReceived: number;
    lastError: string | null;
    probe: WsProbeSnapshot;
  };
  streams: {
    activeCount: number;
    oldestStartedAt: number | null;
    lastChunkAt: number | null;
  };
  voice: {
    isSpeaking: boolean;
    speakingSince: number | null;
    isRecognizing: boolean;
    recognizingSince: number | null;
  };
  worker: WorkerMetricsSnapshot;
  memory: MemoryMetricsSnapshot;
}

export interface StuckSessionIssue {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
  actionKind: RecoveryActionKind;
  actionLabel: string;
}

const liveSockets = new Map<string, LiveSocketMonitorEntry>();
const activeStreams = new Map<string, ActiveStreamMonitorEntry>();
const listeners = new Set<(snap: RuntimeMonitorSnapshot) => void>();

let voiceState: {
  isSpeaking: boolean;
  speakingSince: number | null;
  isRecognizing: boolean;
  recognizingSince: number | null;
  recoverFn: (() => void) | null;
} = {
  isSpeaking: false,
  speakingSince: null,
  isRecognizing: false,
  recognizingSince: null,
  recoverFn: null,
};

let wsProbeState: WsProbeSnapshot = {
  status: 'idle',
  handshakeMs: null,
  pingRttMs: null,
  checkedAt: null,
  error: null,
};

let workerState: WorkerMetricsSnapshot = {
  supported: typeof Worker !== 'undefined' && typeof Blob !== 'undefined',
  status: 'idle',
  rttMs: null,
  throughputOpsPerSec: null,
  eventLoopLagMs: null,
  restartsCount: 0,
  lastCheckedAt: null,
  error: null,
};

let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNotify(): void {
  if (listeners.size === 0 || notifyTimer !== null) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    const snap = getRuntimeMonitorSnapshot();
    for (const cb of listeners) {
      try {
        cb(snap);
      } catch {
        // Ignore subscriber error
      }
    }
  }, 40);
}

export function subscribeRuntimeMonitor(
  cb: (snap: RuntimeMonitorSnapshot) => void,
): () => void {
  listeners.add(cb);
  cb(getRuntimeMonitorSnapshot());
  return () => {
    listeners.delete(cb);
  };
}

export function registerLiveSocket(entry: LiveSocketMonitorEntry): void {
  liveSockets.set(entry.id, { ...entry });
  scheduleNotify();
}

export function updateLiveSocket(
  id: string,
  patch: Partial<Omit<LiveSocketMonitorEntry, 'id' | 'recover'>>,
): void {
  const existing = liveSockets.get(id);
  if (!existing) return;
  liveSockets.set(id, { ...existing, ...patch });
  scheduleNotify();
}

export function unregisterLiveSocket(id: string): void {
  if (liveSockets.delete(id)) {
    scheduleNotify();
  }
}

export function registerActiveStream(id: string, recover: () => void): void {
  const now = Date.now();
  activeStreams.set(id, { id, startedAt: now, lastChunkAt: now, recover });
  scheduleNotify();
}

export function markActiveStreamChunk(id: string): void {
  const existing = activeStreams.get(id);
  if (!existing) return;
  existing.lastChunkAt = Date.now();
}

export function unregisterActiveStream(id: string): void {
  if (activeStreams.delete(id)) {
    scheduleNotify();
  }
}

export function setVoiceMonitorState(patch: {
  isSpeaking?: boolean;
  isRecognizing?: boolean;
  recoverFn?: () => void;
}): void {
  const now = Date.now();
  if (typeof patch.isSpeaking === 'boolean') {
    voiceState.isSpeaking = patch.isSpeaking;
    voiceState.speakingSince = patch.isSpeaking ? (voiceState.speakingSince ?? now) : null;
  }
  if (typeof patch.isRecognizing === 'boolean') {
    voiceState.isRecognizing = patch.isRecognizing;
    voiceState.recognizingSince = patch.isRecognizing
      ? (voiceState.recognizingSince ?? now)
      : null;
  }
  if (patch.recoverFn) {
    voiceState.recoverFn = patch.recoverFn;
  }
  scheduleNotify();
}

export function readBrowserMemorySnapshot(): MemoryMetricsSnapshot {
  const perf =
    typeof performance !== 'undefined'
      ? (performance as Performance & {
          memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        })
      : undefined;

  if (perf?.memory && perf.memory.jsHeapSizeLimit > 0) {
    const usedMb = Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
    const totalMb = Math.round((perf.memory.totalJSHeapSize / (1024 * 1024)) * 10) / 10;
    const limitMb = Math.round((perf.memory.jsHeapSizeLimit / (1024 * 1024)) * 10) / 10;
    const pct = Math.min(100, Math.round((usedMb / limitMb) * 1000) / 10);
    const pressure: 'low' | 'moderate' | 'high' =
      pct >= 72 ? 'high' : pct >= 48 ? 'moderate' : 'low';
    return {
      heapSupported: true,
      jsHeapUsedMb: usedMb,
      jsHeapTotalMb: totalMb,
      jsHeapLimitMb: limitMb,
      heapUsagePercent: pct,
      pressure,
    };
  }

  return {
    heapSupported: false,
    jsHeapUsedMb: null,
    jsHeapTotalMb: null,
    jsHeapLimitMb: null,
    heapUsagePercent: null,
    pressure: 'low',
  };
}

export function getRuntimeMonitorSnapshot(): RuntimeMonitorSnapshot {
  const sockets = Array.from(liveSockets.values());
  const primarySocket = sockets[sockets.length - 1];
  const streamsList = Array.from(activeStreams.values());
  let oldestStartedAt: number | null = null;
  let latestChunkAt: number | null = null;

  for (const st of streamsList) {
    if (oldestStartedAt === null || st.startedAt < oldestStartedAt) {
      oldestStartedAt = st.startedAt;
    }
    if (latestChunkAt === null || st.lastChunkAt > latestChunkAt) {
      latestChunkAt = st.lastChunkAt;
    }
  }

  return {
    timestamp: Date.now(),
    websocket: primarySocket
      ? {
          activeCount: sockets.length,
          state: primarySocket.state,
          startedAt: primarySocket.startedAt,
          connectedAt: primarySocket.connectedAt,
          lastActivityAt: primarySocket.lastActivityAt,
          rttMs: primarySocket.rttMs,
          usingWorklet: primarySocket.usingWorklet,
          audioFramesSent: sockets.reduce((acc, s) => acc + s.audioFramesSent, 0),
          audioChunksReceived: sockets.reduce((acc, s) => acc + s.audioChunksReceived, 0),
          lastError: primarySocket.lastError,
          probe: { ...wsProbeState },
        }
      : {
          activeCount: 0,
          state: 'idle',
          startedAt: null,
          connectedAt: null,
          lastActivityAt: null,
          rttMs: wsProbeState.pingRttMs,
          usingWorklet: false,
          audioFramesSent: 0,
          audioChunksReceived: 0,
          lastError: wsProbeState.error,
          probe: { ...wsProbeState },
        },
    streams: {
      activeCount: streamsList.length,
      oldestStartedAt,
      lastChunkAt: latestChunkAt,
    },
    voice: {
      isSpeaking: voiceState.isSpeaking,
      speakingSince: voiceState.speakingSince,
      isRecognizing: voiceState.isRecognizing,
      recognizingSince: voiceState.recognizingSince,
    },
    worker: { ...workerState },
    memory: readBrowserMemorySnapshot(),
  };
}

export function detectStuckSessionIssues(
  snapshot: RuntimeMonitorSnapshot,
  nowMs = Date.now(),
): StuckSessionIssue[] {
  const issues: StuckSessionIssue[] = [];

  if (
    snapshot.websocket.state === 'connecting' &&
    snapshot.websocket.startedAt !== null &&
    nowMs - snapshot.websocket.startedAt > 9000
  ) {
    issues.push({
      id: 'stuck-ws-handshake',
      severity: 'critical',
      title: 'Live Voice WebSocket Handshake Stuck',
      detail: `Socket has remained in CONNECTING state for ${Math.round((nowMs - snapshot.websocket.startedAt) / 1000)}s.`,
      actionKind: 'reset_ws',
      actionLabel: 'Reset Stuck WebSocket',
    });
  } else if (
    snapshot.websocket.state === 'open' &&
    snapshot.websocket.lastActivityAt !== null &&
    nowMs - snapshot.websocket.lastActivityAt > 20000
  ) {
    issues.push({
      id: 'stuck-ws-silent',
      severity: 'warning',
      title: 'WebSocket Heartbeat Silence Detected',
      detail: `No packet received or acknowledged for ${Math.round((nowMs - snapshot.websocket.lastActivityAt) / 1000)}s.`,
      actionKind: 'reset_ws',
      actionLabel: 'Reconnect Live Socket',
    });
  } else if (
    snapshot.websocket.state === 'error' ||
    snapshot.websocket.probe.status === 'error'
  ) {
    issues.push({
      id: 'ws-error-state',
      severity: 'warning',
      title: 'WebSocket Connection Error State',
      detail:
        snapshot.websocket.lastError ||
        snapshot.websocket.probe.error ||
        'WebSocket bridge reported an interruption.',
      actionKind: 'probe_ws',
      actionLabel: 'Test & Reconnect WS',
    });
  }

  if (
    snapshot.streams.activeCount > 0 &&
    snapshot.streams.lastChunkAt !== null &&
    nowMs - snapshot.streams.lastChunkAt > 15000
  ) {
    issues.push({
      id: 'stuck-sse-stream',
      severity: 'critical',
      title: 'AI Response Stream Appears Hung',
      detail: `${snapshot.streams.activeCount} active stream(s) waiting with no token delta for ${Math.round((nowMs - snapshot.streams.lastChunkAt) / 1000)}s.`,
      actionKind: 'abort_streams',
      actionLabel: 'Abort Stuck Streams',
    });
  }

  if (
    snapshot.worker.status === 'stalled' ||
    snapshot.worker.status === 'error' ||
    (snapshot.worker.rttMs !== null && snapshot.worker.rttMs > 120)
  ) {
    issues.push({
      id: 'stuck-worker',
      severity: snapshot.worker.status === 'stalled' ? 'critical' : 'warning',
      title: 'WebWorker Performance Degraded',
      detail:
        snapshot.worker.error ||
        `Worker round-trip latency elevated (${snapshot.worker.rttMs ?? '>1000'} ms).`,
      actionKind: 'restart_worker',
      actionLabel: 'Restart Worker Thread',
    });
  }

  if (
    snapshot.voice.isRecognizing &&
    snapshot.voice.recognizingSince !== null &&
    nowMs - snapshot.voice.recognizingSince > 45000
  ) {
    issues.push({
      id: 'stuck-mic-rec',
      severity: 'warning',
      title: 'Microphone Recognition Lock Active Long Duration',
      detail: `Speech recognition has been active for ${Math.round((nowMs - snapshot.voice.recognizingSince) / 1000)}s.`,
      actionKind: 'reset_voice',
      actionLabel: 'Reset Voice Engine',
    });
  }

  if (
    snapshot.memory.pressure === 'high' ||
    (snapshot.memory.heapUsagePercent !== null && snapshot.memory.heapUsagePercent >= 75)
  ) {
    issues.push({
      id: 'high-heap-pressure',
      severity: 'warning',
      title: 'High JS Heap Memory Pressure',
      detail:
        snapshot.memory.heapUsagePercent !== null
          ? `JS Heap at ${snapshot.memory.heapUsagePercent}% (${snapshot.memory.jsHeapUsedMb}/${snapshot.memory.jsHeapLimitMb} MB).`
          : 'Memory pressure elevated on current device.',
      actionKind: 'free_memory',
      actionLabel: 'Free Unused Buffers',
    });
  }

  return issues;
}

// Live Inline Benchmark WebWorker (isolated background thread for latency & throughput telemetry)
const MONITOR_WORKER_CODE = `
self.onmessage = function(e) {
  var data = e.data || {};
  if (data.type === 'ping') {
    var t0 = performance.now();
    var acc = 0;
    var ops = data.iterations || 25000;
    for (var i = 1; i <= ops; i++) {
      acc += (i * 1.0001) % 97;
    }
    var execMs = Math.max(0.05, performance.now() - t0);
    self.postMessage({
      type: 'pong',
      id: data.id,
      sentAt: data.sentAt,
      execMs: execMs,
      ops: ops,
      checksum: Math.round(acc)
    });
  }
};
`;

let activeWorker: Worker | null = null;
let pendingPingTimer: ReturnType<typeof setTimeout> | null = null;

function destroyDiagnosticWorker(): void {
  if (pendingPingTimer !== null) {
    clearTimeout(pendingPingTimer);
    pendingPingTimer = null;
  }
  if (activeWorker) {
    try {
      activeWorker.onmessage = null;
      activeWorker.onerror = null;
      activeWorker.terminate();
    } catch {
      // Ignore worker termination error
    }
    activeWorker = null;
  }
}

export function stopDiagnosticWorker(): void {
  destroyDiagnosticWorker();
}

export function restartDiagnosticWorker(): boolean {
  destroyDiagnosticWorker();
  workerState = {
    ...workerState,
    status: 'idle',
    restartsCount: workerState.restartsCount + 1,
    error: null,
  };
  scheduleNotify();
  return ensureDiagnosticWorker();
}

function ensureDiagnosticWorker(): boolean {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    workerState = {
      ...workerState,
      supported: false,
      status: 'unsupported',
    };
    return false;
  }
  if (activeWorker) return true;
  let blobUrl: string | null = null;
  try {
    const blob = new Blob([MONITOR_WORKER_CODE], { type: 'application/javascript' });
    blobUrl = URL.createObjectURL(blob);
    activeWorker = new Worker(blobUrl);
    workerState.supported = true;
    activeWorker.onerror = (ev) => {
      workerState = {
        ...workerState,
        status: 'error',
        error: ev.message || 'Diagnostic WebWorker runtime error.',
      };
      destroyDiagnosticWorker();
      scheduleNotify();
    };
    return true;
  } catch (err) {
    workerState = {
      ...workerState,
      supported: false,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unable to spawn WebWorker.',
    };
    return false;
  } finally {
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore revoke error
      }
    }
  }
}

export async function runWorkerPerformanceSample(): Promise<WorkerMetricsSnapshot> {
  // Measure UI thread event loop lag
  const lagStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const lagEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const eventLoopLagMs = Math.max(0, Math.round((lagEnd - lagStart) * 10) / 10);

  if (!ensureDiagnosticWorker() || !activeWorker) {
    workerState = {
      ...workerState,
      eventLoopLagMs,
      lastCheckedAt: Date.now(),
    };
    scheduleNotify();
    return { ...workerState };
  }

  return new Promise<WorkerMetricsSnapshot>((resolve) => {
    const worker = activeWorker;
    if (!worker) {
      resolve({ ...workerState });
      return;
    }
    const pingId = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sentAt = performance.now();

    const finish = (next: WorkerMetricsSnapshot) => {
      if (pendingPingTimer !== null) {
        clearTimeout(pendingPingTimer);
        pendingPingTimer = null;
      }
      workerState = next;
      scheduleNotify();
      resolve({ ...next });
    };

    pendingPingTimer = setTimeout(() => {
      finish({
        ...workerState,
        status: 'stalled',
        eventLoopLagMs,
        lastCheckedAt: Date.now(),
        error: 'WebWorker did not respond within 1200ms.',
      });
    }, 1200);

    const onMessage = (ev: MessageEvent) => {
      const payload = ev.data as {
        type?: string;
        id?: string;
        sentAt?: number;
        execMs?: number;
        ops?: number;
      };
      if (!payload || payload.type !== 'pong' || payload.id !== pingId) return;
      worker.removeEventListener('message', onMessage);
      const rttMs = Math.max(0.1, Math.round((performance.now() - sentAt) * 10) / 10);
      const execMs = Math.max(0.05, payload.execMs || 0.1);
      const opsPerSec = Math.round(((payload.ops || 25000) / execMs) * 1000);
      const status: WorkerMonitorStatus = rttMs > 120 ? 'slow' : 'healthy';
      finish({
        ...workerState,
        supported: true,
        status,
        rttMs,
        throughputOpsPerSec: opsPerSec,
        eventLoopLagMs,
        lastCheckedAt: Date.now(),
        error: null,
      });
    };

    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'ping', id: pingId, sentAt, iterations: 30000 });
  });
}

export async function probeLiveWebSocketHealth(timeoutMs = 4500): Promise<WsProbeSnapshot> {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    wsProbeState = {
      status: 'error',
      handshakeMs: null,
      pingRttMs: null,
      checkedAt: Date.now(),
      error: 'WebSocket API unavailable in this environment.',
    };
    scheduleNotify();
    return { ...wsProbeState };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    wsProbeState = {
      status: 'error',
      handshakeMs: null,
      pingRttMs: null,
      checkedAt: Date.now(),
      error: 'Device network is offline.',
    };
    scheduleNotify();
    return { ...wsProbeState };
  }

  wsProbeState = { ...wsProbeState, status: 'probing', error: null };
  scheduleNotify();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const probeUrl = `${protocol}//${window.location.host}/api/live?probe=1`;

  return new Promise<WsProbeSnapshot>((resolve) => {
    const startAt = performance.now();
    let pingSentAt = 0;
    let handshakeMs: number | null = null;
    let settled = false;
    let ws: WebSocket | null = null;

    const finish = (snap: WsProbeSnapshot) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          ws.close();
        } catch {
          // ignore
        }
      }
      wsProbeState = snap;
      scheduleNotify();
      resolve({ ...snap });
    };

    const timer = setTimeout(() => {
      finish({
        status: 'error',
        handshakeMs,
        pingRttMs: null,
        checkedAt: Date.now(),
        error: `WebSocket health probe timed out after ${timeoutMs}ms.`,
      });
    }, timeoutMs);

    try {
      ws = new WebSocket(probeUrl);
      ws.onopen = () => {
        handshakeMs = Math.max(1, Math.round(performance.now() - startAt));
        pingSentAt = performance.now();
        ws?.send(JSON.stringify({ ping: true, ts: Date.now() }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { pong?: boolean; ready?: boolean };
          if (msg.pong) {
            const pingRttMs = Math.max(1, Math.round(performance.now() - pingSentAt));
            finish({
              status: pingRttMs > 450 ? 'degraded' : 'healthy',
              handshakeMs,
              pingRttMs,
              checkedAt: Date.now(),
              error: null,
            });
          }
        } catch {
          // ignore non-JSON frame
        }
      };
      ws.onerror = () => {
        finish({
          status: 'error',
          handshakeMs,
          pingRttMs: null,
          checkedAt: Date.now(),
          error: 'WebSocket connection probe rejected or unreachable.',
        });
      };
      ws.onclose = () => {
        if (!settled) {
          finish({
            status: 'error',
            handshakeMs,
            pingRttMs: null,
            checkedAt: Date.now(),
            error: 'WebSocket probe closed before pong verification.',
          });
        }
      };
    } catch (err) {
      finish({
        status: 'error',
        handshakeMs: null,
        pingRttMs: null,
        checkedAt: Date.now(),
        error: err instanceof Error ? err.message : 'Unable to start WebSocket probe.',
      });
    }
  });
}

export function recoverStuckWebSockets(): number {
  const entries = Array.from(liveSockets.values());
  let count = 0;
  for (const entry of entries) {
    try {
      entry.recover();
      count += 1;
    } catch {
      // ignore
    }
  }
  liveSockets.clear();
  scheduleNotify();
  return count;
}

export function abortStuckAiStreams(): number {
  const entries = Array.from(activeStreams.values());
  let count = 0;
  for (const st of entries) {
    try {
      st.recover();
      count += 1;
    } catch {
      // ignore
    }
  }
  activeStreams.clear();
  scheduleNotify();
  return count;
}

export function recoverVoiceSession(): boolean {
  if (!voiceState.recoverFn) return false;
  try {
    voiceState.recoverFn();
  } catch {
    // ignore
  }
  voiceState.isSpeaking = false;
  voiceState.speakingSince = null;
  voiceState.isRecognizing = false;
  voiceState.recognizingSince = null;
  scheduleNotify();
  return true;
}

export function recoverAllStuckSessions(onFreeMemory?: () => void): {
  socketsReset: number;
  streamsAborted: number;
  voiceReset: boolean;
  workerRestarted: boolean;
} {
  const socketsReset = recoverStuckWebSockets();
  const streamsAborted = abortStuckAiStreams();
  const voiceReset = recoverVoiceSession();
  const snap = getRuntimeMonitorSnapshot();
  const workerNeedsRestart =
    snap.worker.status === 'stalled' ||
    snap.worker.status === 'error' ||
    (snap.worker.rttMs !== null && snap.worker.rttMs > 120);
  const workerRestarted = workerNeedsRestart ? restartDiagnosticWorker() : false;
  onFreeMemory?.();
  return {
    socketsReset,
    streamsAborted,
    voiceReset,
    workerRestarted,
  };
}
