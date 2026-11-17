import type { LanguageMode, VoicePersona } from '../types/arora';
import {
  registerLiveSocket,
  unregisterLiveSocket,
  updateLiveSocket,
} from './runtimeMonitor';

export const LIVE_CONNECT_TIMEOUT_MS = 10000;

export interface LiveAudioCallbacks {
  onReady?: () => void;
  onLatencyUpdate?: (rttMs: number) => void;
  onAnalysersChange?: (analysers: {
    micAnalyser: AnalyserNode | null;
    aiAnalyser: AnalyserNode | null;
  }) => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onAudioStart?: () => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface LiveAudioTelemetrySample {
  inputLevel: number;
  outputLevel: number;
  inputBins: Uint8Array | null;
  outputBins: Uint8Array | null;
}

export function computeNormalizedAudioEnergy(bins: Uint8Array): number {
  if (bins.length === 0) return 0;
  let sumSq = 0;
  const voiceBandCount = Math.min(bins.length, 48);
  for (let i = 0; i < voiceBandCount; i += 1) {
    const norm = bins[i] / 255;
    sumSq += norm * norm;
  }
  const rms = Math.sqrt(sumSq / voiceBandCount);
  return Math.min(1, Math.max(0, rms * 1.45));
}

/**
 * Downsamples or resamples Float32 PCM audio from the hardware AudioContext sample rate
 * (commonly 44.1 kHz or 48 kHz) to exact 16 kHz mono for the Live Voice WebSocket.
 */
export function resampleToTargetRate(
  samples: Float32Array,
  sourceRate: number,
  targetRate = 16000,
): Float32Array {
  if (samples.length === 0 || sourceRate <= 0 || targetRate <= 0) return samples;
  if (Math.abs(sourceRate - targetRate) < 50) return samples;

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const srcIdx = i * ratio;
    const low = Math.floor(srcIdx);
    const high = Math.min(samples.length - 1, low + 1);
    const frac = srcIdx - low;
    out[i] = samples[low] + (samples[high] - samples[low]) * frac;
  }
  return out;
}

/**
 * Converts mono Float32 samples [-1..1] into compact Int16 little-endian PCM ArrayBuffer.
 */
export function float32ToPcm16Buffer(floatData: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(floatData.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < floatData.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, floatData[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(i * 2, int16, true);
  }
  return buf;
}

function base64Pcm16ToFloat32(base64: string, reuseScratch?: Uint8Array): {
  samples: Float32Array;
  scratch: Uint8Array;
} {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = reuseScratch && reuseScratch.length >= len ? reuseScratch : new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const sampleCount = len >> 1;
  const out = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, len);
  for (let i = 0; i < sampleCount; i += 1) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return { samples: out, scratch: bytes };
}

function formatMicPermissionError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  const msg = err instanceof Error ? err.message : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Microphone permission was denied. Please allow mic access in browser settings and tap Reconnect.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No working microphone detected on this device. Connect a mic or type your question in Live Chat.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Microphone is currently busy in another app. Close other audio apps and tap Reconnect.';
  }
  return msg || 'Could not initialize microphone for Live Voice.';
}

// Off-main-thread AudioWorklet processor source: batches input frames, resamples to 16kHz,
// converts Float32 -> Int16 PCM, and transfers zero-copy ArrayBuffers to main thread.
const PCM_WORKLET_PROCESSOR_CODE = `
class AroraPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetChunkSamples = opts.chunkSamples || 1024;
    this.targetRate = opts.targetRate || 16000;
    this.paused = false;
    this.ring = new Float32Array(this.targetChunkSamples);
    this.offset = 0;
    this.port.onmessage = (ev) => {
      if (ev.data && typeof ev.data.paused === 'boolean') {
        this.paused = ev.data.paused;
        if (this.paused) this.offset = 0;
      }
    };
  }
  process(inputs) {
    if (this.paused) return true;
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;
    const ch = input[0];
    for (let i = 0; i < ch.length; i += 1) {
      this.ring[this.offset++] = ch[i];
      if (this.offset >= this.targetChunkSamples) {
        this.flushChunk();
      }
    }
    return true;
  }
  flushChunk() {
    const srcLen = this.offset;
    this.offset = 0;
    if (srcLen === 0) return;
    const srcRate = sampleRate || 16000;
    let resampled;
    let outLen;
    if (Math.abs(srcRate - this.targetRate) < 50) {
      resampled = this.ring.subarray(0, srcLen);
      outLen = srcLen;
    } else {
      const ratio = srcRate / this.targetRate;
      outLen = Math.max(1, Math.round(srcLen / ratio));
      resampled = new Float32Array(outLen);
      for (let i = 0; i < outLen; i += 1) {
        const sIdx = i * ratio;
        const low = Math.floor(sIdx);
        const high = Math.min(srcLen - 1, low + 1);
        const frac = sIdx - low;
        resampled[i] = this.ring[low] + (this.ring[high] - this.ring[low]) * frac;
      }
    }
    const buf = new ArrayBuffer(outLen * 2);
    const view = new DataView(buf);
    for (let i = 0; i < outLen; i += 1) {
      const clamped = Math.max(-1, Math.min(1, resampled[i]));
      view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    }
    this.port.postMessage(buf, [buf]);
  }
}
registerProcessor('arora-pcm-capture', AroraPcmCaptureProcessor);
`;

export class AroraLiveAudioClient {
  private ws: WebSocket | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private inputFreqData: Uint8Array<ArrayBuffer> | null = null;
  private outputFreqData: Uint8Array<ArrayBuffer> | null = null;
  private outputGain: GainNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private preReadyAudioQueue: ArrayBuffer[] = [];
  private decodeScratch: Uint8Array | undefined;
  private heartbeatTimer: number | null = null;
  private connectTimeoutTimer: number | null = null;
  private sessionReady = false;
  private usingWorklet = false;
  private nextStartTime = 0;
  private isMuted = false;
  private micPaused = false;
  private closed = false;
  private speakingNotified = false;
  private monitorId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  private audioFramesSentCount = 0;
  private audioChunksReceivedCount = 0;
  private callbacks: LiveAudioCallbacks;

  constructor(callbacks: LiveAudioCallbacks) {
    this.callbacks = callbacks;
  }

  public isAudioWorkletActive(): boolean {
    return this.usingWorklet;
  }

  public async connect(params: {
    language: LanguageMode;
    voicePersona: VoicePersona;
    interactiveContext?: string;
    bufferSize?: 1024 | 2048;
    connectTimeoutMs?: number;
  }): Promise<void> {
    if (typeof window === 'undefined') return;
    this.closed = false;
    this.sessionReady = false;
    this.usingWorklet = false;
    this.preReadyAudioQueue = [];
    this.audioFramesSentCount = 0;
    this.audioChunksReceivedCount = 0;
    const nowStart = Date.now();
    registerLiveSocket({
      id: this.monitorId,
      state: 'connecting',
      startedAt: nowStart,
      connectedAt: null,
      lastActivityAt: nowStart,
      rttMs: null,
      usingWorklet: false,
      audioFramesSent: 0,
      audioChunksReceived: 0,
      lastError: null,
      recover: () => {
        this.disconnect();
        this.callbacks.onClose?.();
      },
    });

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Live microphone audio streaming is unavailable in this browser.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('Internet connection is offline. Reconnect to start Live Voice Chat.');
    }

    // Separate 16kHz input and 24kHz output AudioContexts per Live API specification
    this.inputCtx = new AudioCtx({ sampleRate: 16000 });
    this.outputCtx = new AudioCtx({ sampleRate: 24000 });

    this.outputGain = this.outputCtx.createGain();
    this.outputGain.gain.value = this.isMuted ? 0 : 1;

    this.outputAnalyser = this.outputCtx.createAnalyser();
    this.outputAnalyser.fftSize = 128;
    this.outputAnalyser.smoothingTimeConstant = 0.72;
    this.outputFreqData = new Uint8Array(new ArrayBuffer(this.outputAnalyser.frequencyBinCount));

    this.outputGain.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.outputCtx.destination);
    this.nextStartTime = this.outputCtx.currentTime;
    this.callbacks.onAnalysersChange?.({
      micAnalyser: this.inputAnalyser,
      aiAnalyser: this.outputAnalyser,
    });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const voice = params.voicePersona === 'device_natural' ? 'Zephyr' : params.voicePersona;
    const qs = new URLSearchParams({
      language: params.language,
      voice,
    });
    if (params.interactiveContext) {
      qs.set('context', params.interactiveContext.slice(0, 600));
    }
    const wsUrl = `${protocol}//${window.location.host}/api/live?${qs.toString()}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    const timeoutMs = params.connectTimeoutMs ?? LIVE_CONNECT_TIMEOUT_MS;
    this.connectTimeoutTimer = window.setTimeout(() => {
      if (this.closed || this.sessionReady) return;
      updateLiveSocket(this.monitorId, {
        state: 'stalled',
        lastError: 'Live Voice handshake timed out.',
      });
      this.cleanupAudioOnly();
      try {
        ws.close();
      } catch {
        // ignore close error
      }
      this.callbacks.onError?.(
        'Live Voice connection timed out. Check your connection and tap Reconnect.',
      );
    }, timeoutMs);

    ws.onmessage = (event) => {
      if (this.closed) return;
      let msg: {
        ready?: boolean;
        pong?: boolean;
        ts?: number;
        audio?: string;
        inputTranscript?: string;
        outputTranscript?: string;
        interrupted?: boolean;
        turnComplete?: boolean;
        error?: string;
      };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (msg.pong && typeof msg.ts === 'number') {
        const rtt = Math.max(1, Date.now() - msg.ts);
        updateLiveSocket(this.monitorId, {
          rttMs: rtt,
          lastActivityAt: Date.now(),
        });
        this.callbacks.onLatencyUpdate?.(rtt);
        return;
      }

      if (msg.ready) {
        if (this.connectTimeoutTimer !== null) {
          window.clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        this.sessionReady = true;
        updateLiveSocket(this.monitorId, {
          state: 'open',
          connectedAt: Date.now(),
          lastActivityAt: Date.now(),
          usingWorklet: this.usingWorklet,
        });
        if (this.preReadyAudioQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
          for (const queued of this.preReadyAudioQueue) {
            ws.send(queued);
          }
          this.preReadyAudioQueue = [];
        }
        this.callbacks.onReady?.();
      }
      if (msg.inputTranscript) {
        updateLiveSocket(this.monitorId, { lastActivityAt: Date.now() });
        this.callbacks.onInputTranscript?.(msg.inputTranscript);
      }
      if (msg.outputTranscript) {
        updateLiveSocket(this.monitorId, { lastActivityAt: Date.now() });
        this.callbacks.onOutputTranscript?.(msg.outputTranscript);
      }
      if (msg.audio) {
        this.audioChunksReceivedCount += 1;
        if (this.audioChunksReceivedCount % 5 === 1) {
          updateLiveSocket(this.monitorId, {
            audioChunksReceived: this.audioChunksReceivedCount,
            lastActivityAt: Date.now(),
          });
        }
        this.scheduleOutputAudio(msg.audio);
      }
      if (msg.interrupted) {
        this.interruptPlayback(false);
        this.callbacks.onInterrupted?.();
      }
      if (msg.turnComplete) {
        this.speakingNotified = false;
        updateLiveSocket(this.monitorId, {
          audioChunksReceived: this.audioChunksReceivedCount,
          lastActivityAt: Date.now(),
        });
        this.callbacks.onTurnComplete?.();
      }
      if (msg.error) {
        if (this.connectTimeoutTimer !== null) {
          window.clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        updateLiveSocket(this.monitorId, {
          state: 'error',
          lastError: msg.error,
        });
        this.callbacks.onError?.(msg.error);
      }
    };

    ws.onerror = () => {
      if (!this.closed) {
        if (this.connectTimeoutTimer !== null) {
          window.clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        updateLiveSocket(this.monitorId, {
          state: 'error',
          lastError: 'Live WebSocket connection encountered a network interruption.',
        });
        this.callbacks.onError?.('Live WebSocket connection encountered a network interruption.');
      }
    };

    ws.onclose = () => {
      unregisterLiveSocket(this.monitorId);
      if (!this.closed) {
        this.cleanupAudioOnly();
        this.callbacks.onClose?.();
      }
    };

    // Run audio context resumes, microphone permission, and WebSocket open in PARALLEL
    // to minimize Live Voice activation delay!
    const chunkFrames = params.bufferSize ?? 1024;
    const resumePromises: Promise<unknown>[] = [];
    if (this.inputCtx.state === 'suspended') {
      resumePromises.push(this.inputCtx.resume().catch(() => {}));
    }
    if (this.outputCtx.state === 'suspended') {
      resumePromises.push(this.outputCtx.resume().catch(() => {}));
    }

    let micStream: MediaStream;
    try {
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }),
        ...resumePromises,
      ]);
      micStream = stream;
    } catch (micErr) {
      this.disconnect();
      throw new Error(formatMicPermissionError(micErr));
    }

    if (this.closed) {
      for (const t of micStream.getTracks()) {
        try {
          t.stop();
        } catch {
          // ignore
        }
      }
      this.cleanupAudioOnly();
      return;
    }

    this.micStream = micStream;

    const startPingLoop = () => {
      if (this.closed || this.ws !== ws) return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ ping: true, ts: Date.now() }));
      }
      if (this.heartbeatTimer === null) {
        this.heartbeatTimer = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.closed) {
            this.ws.send(JSON.stringify({ ping: true, ts: Date.now() }));
          }
        }, 15000);
      }
    };

    if (ws.readyState === WebSocket.OPEN) {
      await this.startMicCapture(chunkFrames);
      startPingLoop();
    } else if (ws.readyState === WebSocket.CONNECTING) {
      ws.onopen = () => {
        if (this.closed) return;
        void this.startMicCapture(chunkFrames);
        startPingLoop();
      };
    }
  }

  private forwardCapturedPcmBuffer(pcmBuffer: ArrayBuffer): void {
    if (this.closed || this.micPaused) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (!this.sessionReady) {
      this.preReadyAudioQueue.push(pcmBuffer);
      if (this.preReadyAudioQueue.length > 6) {
        this.preReadyAudioQueue.shift();
      }
      return;
    }
    this.ws.send(pcmBuffer);
    this.audioFramesSentCount += 1;
    if (this.audioFramesSentCount % 16 === 1) {
      updateLiveSocket(this.monitorId, {
        audioFramesSent: this.audioFramesSentCount,
        usingWorklet: this.usingWorklet,
      });
    }
  }

  private async startMicCapture(bufferSize: 1024 | 2048): Promise<void> {
    if (!this.inputCtx || !this.micStream || this.closed) return;
    this.micSource = this.inputCtx.createMediaStreamSource(this.micStream);
    this.inputAnalyser = this.inputCtx.createAnalyser();
    this.inputAnalyser.fftSize = 128;
    this.inputAnalyser.smoothingTimeConstant = 0.72;
    this.inputFreqData = new Uint8Array(new ArrayBuffer(this.inputAnalyser.frequencyBinCount));

    this.silentGain = this.inputCtx.createGain();
    this.silentGain.gain.value = 0;

    this.micSource.connect(this.inputAnalyser);

    // Prefer off-main-thread AudioWorkletNode for zero UI-thread blocking on 4 GB Android devices
    let workletAttached = false;
    if (
      typeof AudioWorkletNode !== 'undefined' &&
      this.inputCtx.audioWorklet &&
      typeof URL !== 'undefined' &&
      typeof Blob !== 'undefined'
    ) {
      let blobUrl: string | null = null;
      try {
        const blob = new Blob([PCM_WORKLET_PROCESSOR_CODE], {
          type: 'application/javascript',
        });
        blobUrl = URL.createObjectURL(blob);
        await this.inputCtx.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;

        if (this.closed || !this.inputCtx || !this.micSource || !this.silentGain) {
          return;
        }

        const worklet = new AudioWorkletNode(this.inputCtx, 'arora-pcm-capture', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          processorOptions: {
            chunkSamples: bufferSize,
            targetRate: 16000,
          },
        });
        worklet.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
          if (ev.data instanceof ArrayBuffer) {
            this.forwardCapturedPcmBuffer(ev.data);
          }
        };
        if (this.micPaused) {
          worklet.port.postMessage({ paused: true });
        }
        this.workletNode = worklet;
        this.micSource.connect(worklet);
        worklet.connect(this.silentGain);
        this.silentGain.connect(this.inputCtx.destination);
        this.usingWorklet = true;
        workletAttached = true;
        updateLiveSocket(this.monitorId, { usingWorklet: true });
      } catch {
        if (blobUrl) {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch {
            // ignore
          }
        }
        workletAttached = false;
      }
    }

    // Fallback to ScriptProcessorNode only when AudioWorklet isn't supported
    if (!workletAttached && this.inputCtx && this.micSource && this.silentGain && !this.closed) {
      this.micProcessor = this.inputCtx.createScriptProcessor(bufferSize, 1, 1);
      const hardwareSampleRate = this.inputCtx.sampleRate || 16000;
      this.micProcessor.onaudioprocess = (ev) => {
        if (this.closed || this.micPaused) return;
        const rawSamples = ev.inputBuffer.getChannelData(0);
        const normalized = resampleToTargetRate(rawSamples, hardwareSampleRate, 16000);
        this.forwardCapturedPcmBuffer(float32ToPcm16Buffer(normalized));
      };
      this.micSource.connect(this.micProcessor);
      this.micProcessor.connect(this.silentGain);
      this.silentGain.connect(this.inputCtx.destination);
    }

    this.callbacks.onAnalysersChange?.({
      micAnalyser: this.inputAnalyser,
      aiAnalyser: this.outputAnalyser,
    });
  }

  public getInputAnalyser(): AnalyserNode | null {
    return !this.micPaused && !this.closed ? this.inputAnalyser : null;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return !this.isMuted && !this.closed ? this.outputAnalyser : null;
  }

  public sampleAudioTelemetry(): LiveAudioTelemetrySample {
    let inputLevel = 0;
    let outputLevel = 0;

    if (this.inputAnalyser && this.inputFreqData && !this.micPaused && !this.closed) {
      this.inputAnalyser.getByteFrequencyData(this.inputFreqData);
      inputLevel = computeNormalizedAudioEnergy(this.inputFreqData);
    }

    if (this.outputAnalyser && this.outputFreqData && !this.isMuted && !this.closed) {
      this.outputAnalyser.getByteFrequencyData(this.outputFreqData);
      outputLevel = computeNormalizedAudioEnergy(this.outputFreqData);
    }

    return {
      inputLevel,
      outputLevel,
      inputBins: !this.micPaused && this.inputFreqData ? this.inputFreqData : null,
      outputBins: !this.isMuted && this.outputFreqData ? this.outputFreqData : null,
    };
  }

  private scheduleOutputAudio(base64Pcm: string): void {
    if (!this.outputCtx || !this.outputGain || this.closed) return;
    if (this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume();
    }
    const decoded = base64Pcm16ToFloat32(base64Pcm, this.decodeScratch);
    this.decodeScratch = decoded.scratch;
    const floatSamples = decoded.samples;
    if (floatSamples.length === 0) return;

    const buffer = this.outputCtx.createBuffer(1, floatSamples.length, 24000);
    buffer.getChannelData(0).set(floatSamples);

    const src = this.outputCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.outputGain);

    const now = this.outputCtx.currentTime;
    const startAt = Math.max(now + 0.01, this.nextStartTime);
    this.nextStartTime = startAt + buffer.duration;

    this.activeSources.add(src);
    src.onended = () => {
      src.onended = null;
      this.activeSources.delete(src);
    };

    if (!this.speakingNotified) {
      this.speakingNotified = true;
      this.callbacks.onAudioStart?.();
    }

    src.start(startAt);
  }

  public sendText(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.interruptPlayback(false);
    this.ws.send(JSON.stringify({ text: trimmed }));
  }

  public updateContext(contextText: string): void {
    const trimmed = contextText.trim();
    if (!trimmed || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionReady) {
      return;
    }
    this.ws.send(JSON.stringify({ contextUpdate: trimmed.slice(0, 600) }));
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.outputGain) {
      this.outputGain.gain.value = muted ? 0 : 1;
    }
  }

  public setMicPaused(paused: boolean): void {
    this.micPaused = paused;
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ paused });
      } catch {
        // ignore worklet port message failure
      }
    }
  }

  public interruptPlayback(notifyServer = true): void {
    for (const src of this.activeSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped buffer source
      }
    }
    this.activeSources.clear();
    this.speakingNotified = false;
    if (this.outputCtx) {
      this.nextStartTime = this.outputCtx.currentTime;
    }
    if (notifyServer && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ interrupt: true }));
    }
  }

  private cleanupAudioOnly(): void {
    if (this.connectTimeoutTimer !== null) {
      window.clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.sessionReady = false;
    this.usingWorklet = false;
    this.preReadyAudioQueue = [];
    this.decodeScratch = undefined;
    this.interruptPlayback(false);
    try {
      this.inputAnalyser?.disconnect();
      this.outputAnalyser?.disconnect();
      if (this.workletNode) {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      }
      if (this.micProcessor) {
        this.micProcessor.onaudioprocess = null;
        this.micProcessor.disconnect();
      }
      this.micSource?.disconnect();
      this.silentGain?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    this.inputAnalyser = null;
    this.outputAnalyser = null;
    this.callbacks.onAnalysersChange?.({
      micAnalyser: null,
      aiAnalyser: null,
    });
    this.inputFreqData = null;
    this.outputFreqData = null;
    this.workletNode = null;
    this.micProcessor = null;
    this.micSource = null;
    this.silentGain = null;

    if (this.micStream) {
      for (const track of this.micStream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      this.micStream = null;
    }

    if (this.inputCtx) {
      void this.inputCtx.close().catch(() => {});
      this.inputCtx = null;
    }
    if (this.outputCtx) {
      void this.outputCtx.close().catch(() => {});
      this.outputCtx = null;
    }
    this.outputGain = null;
  }

  public disconnect(): void {
    this.closed = true;
    unregisterLiveSocket(this.monitorId);
    this.cleanupAudioOnly();
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
