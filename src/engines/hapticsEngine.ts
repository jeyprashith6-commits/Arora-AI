import type { DeviceTelemetry } from '../types/arora';

export type HapticPatternName = 'tap' | 'checkbox' | 'submit' | 'success' | 'error';

const HAPTIC_PATTERNS: Record<HapticPatternName, number[]> = {
  tap: [8],
  checkbox: [10],
  submit: [14, 24, 12],
  success: [10, 26, 18],
  error: [22, 36, 22],
};

export interface HapticPolicyInput {
  hapticsEnabled?: boolean;
  prefersReducedMotion: boolean;
  activeProfile?: DeviceTelemetry['activeProfile'];
  memoryPressure?: DeviceTelemetry['memoryPressure'];
  batteryLevelPercent?: number | null;
  batteryCharging?: boolean | null;
}

let currentPolicy: Omit<HapticPolicyInput, 'prefersReducedMotion'> = {
  hapticsEnabled: true,
  activeProfile: 'balanced_6gb',
  memoryPressure: 'low',
  batteryLevelPercent: null,
  batteryCharging: null,
};

export function updateHapticPolicy(policy: Omit<HapticPolicyInput, 'prefersReducedMotion'>): void {
  currentPolicy = { ...currentPolicy, ...policy };
}

export function prefersReducedMotionActive(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldTriggerHaptics(input: HapticPolicyInput): boolean {
  if (input.hapticsEnabled === false) return false;
  if (input.prefersReducedMotion) return false;

  // Preserve stability and battery under high memory pressure on Eco devices or critical battery
  if (input.activeProfile === 'eco_3_4gb' && input.memoryPressure === 'high') {
    return false;
  }
  if (
    typeof input.batteryLevelPercent === 'number' &&
    input.batteryLevelPercent <= 15 &&
    input.batteryCharging !== true
  ) {
    return false;
  }
  return true;
}

export function triggerHaptic(pattern: HapticPatternName): boolean {
  const allowed = shouldTriggerHaptics({
    ...currentPolicy,
    prefersReducedMotion: prefersReducedMotionActive(),
  });
  if (!allowed) return false;

  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }

  try {
    // On 3-4 GB Eco profile, condense multi-pulse patterns into a single ultra-light pulse
    const seq =
      currentPolicy.activeProfile === 'eco_3_4gb'
        ? [HAPTIC_PATTERNS[pattern][0]]
        : HAPTIC_PATTERNS[pattern];
    return navigator.vibrate(seq);
  } catch {
    return false;
  }
}

export function isVibrationApiSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
