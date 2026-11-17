/**
 * Coalesces high-frequency SSE text deltas into batched UI updates so React
 * never re-renders or parses Markdown on every individual token on 4 GB devices.
 */

import {
  markActiveStreamChunk,
  registerActiveStream,
  unregisterActiveStream,
} from './runtimeMonitor';

export interface StreamCoalescer {
  push: (delta: string) => void;
  getText: () => string;
  flushNow: () => string;
  cancel: () => void;
  isCancelled: () => boolean;
}

export function createStreamCoalescer(
  onFlush: (accumulatedText: string) => void,
  options?: {
    flushIntervalMs?: number;
    sanitize?: (chunk: string) => string;
  },
): StreamCoalescer {
  const intervalMs = Math.max(16, options?.flushIntervalMs ?? 48);
  const sanitize = options?.sanitize;
  const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let accumulated = '';
  let dirty = false;
  let cancelled = false;
  let registered = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const ensureRegistered = () => {
    if (!registered) {
      registered = true;
      registerActiveStream(streamId, () => {
        cancelled = true;
        dirty = false;
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
      });
    }
  };

  const flushInternal = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (cancelled || !dirty) return;
    dirty = false;
    onFlush(accumulated);
  };

  return {
    push(delta: string) {
      if (cancelled || !delta) return;
      ensureRegistered();
      markActiveStreamChunk(streamId);
      accumulated += sanitize ? sanitize(delta) : delta;
      dirty = true;
      if (timerId === null) {
        timerId = setTimeout(flushInternal, intervalMs);
      }
    },
    getText() {
      return accumulated;
    },
    flushNow() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (!cancelled && dirty) {
        dirty = false;
        onFlush(accumulated);
      }
      if (registered) {
        unregisterActiveStream(streamId);
        registered = false;
      }
      return accumulated;
    },
    cancel() {
      cancelled = true;
      dirty = false;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (registered) {
        unregisterActiveStream(streamId);
        registered = false;
      }
    },
    isCancelled() {
      return cancelled;
    },
  };
}

/**
 * Wraps an AbortController with a pre-first-byte timeout so stalled requests
 * recover cleanly without killing active long-running SSE streams once chunks flow.
 */
export interface RequestTimeoutGuard {
  signal: AbortSignal;
  markFirstByte: () => void;
  didTimeout: () => boolean;
  cleanup: () => void;
}

export function createRequestTimeoutGuard(
  parentSignal?: AbortSignal,
  firstByteTimeoutMs = 15000,
): RequestTimeoutGuard {
  const controller = new AbortController();
  const guardId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let timedOut = false;
  let cleanedUp = false;

  registerActiveStream(guardId, () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  });

  const onParentAbort = () => {
    controller.abort();
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, firstByteTimeoutMs);

  return {
    signal: controller.signal,
    markFirstByte() {
      markActiveStreamChunk(guardId);
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    didTimeout() {
      return timedOut;
    },
    cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      unregisterActiveStream(guardId);
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    },
  };
}
