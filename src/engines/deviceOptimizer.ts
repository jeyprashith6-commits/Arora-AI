import type { DeviceTelemetry, NetworkOperatingMode, RamProfileTier } from '../types/arora';

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    saveData?: boolean;
    addEventListener?: (type: string, cb: () => void) => void;
    removeEventListener?: (type: string, cb: () => void) => void;
  };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
  userAgentData?: {
    architecture?: string;
    platform?: string;
    mobile?: boolean;
  };
}

interface PerformanceExtended extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export function detectAndroidVersion(ua: string): string | null {
  const match = ua.match(/Android\s+([0-9]+(?:\.[0-9]+)*)/i);
  return match ? `Android ${match[1]}` : null;
}

export function deriveRamProfile(
  totalRamGb: number,
  estimatedAvailableRamGb: number,
  memoryPressure: 'low' | 'moderate' | 'high',
  manualOverride: RamProfileTier | 'auto',
): {
  activeProfile: RamProfileTier;
  localModelSpec: string;
  maxContextTurns: number;
  maxCacheEntries: number;
  animationComplexity: 'minimal' | 'balanced' | 'full';
} {
  // Never choose heavy profile by total RAM alone — degrade immediately under memory pressure
  let activeProfile: RamProfileTier;
  if (manualOverride !== 'auto') {
    activeProfile = manualOverride;
  } else if (totalRamGb <= 4 || estimatedAvailableRamGb < 1.5 || memoryPressure === 'high') {
    activeProfile = 'eco_3_4gb';
  } else if (totalRamGb <= 6 || estimatedAvailableRamGb < 2.8 || memoryPressure === 'moderate') {
    activeProfile = 'balanced_6gb';
  } else {
    activeProfile = 'ultra_8gb_plus';
  }

  if (activeProfile === 'eco_3_4gb') {
    return {
      activeProfile,
      localModelSpec: 'Quantized 0.5B INT4 Curriculum Index (On-Demand)',
      maxContextTurns: 4,
      maxCacheEntries: 16,
      animationComplexity: 'minimal',
    };
  }
  if (activeProfile === 'balanced_6gb') {
    return {
      activeProfile,
      localModelSpec: 'Quantized 1.0B Hybrid Retrieval Engine',
      maxContextTurns: 8,
      maxCacheEntries: 40,
      animationComplexity: 'balanced',
    };
  }
  return {
    activeProfile,
    localModelSpec: 'Full Multi-Index Local Engine + Preloaded Cache',
    maxContextTurns: 14,
    maxCacheEntries: 90,
    animationComplexity: 'full',
  };
}

export function determineOperatingMode(
  isOnline: boolean,
  effectiveType: string,
  downlinkMbps: number | null,
  saveData: boolean,
  serverReachable: boolean,
): NetworkOperatingMode {
  if (!isOnline || !serverReachable) {
    return 'reconnecting';
  }
  if (
    saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    (downlinkMbps !== null && downlinkMbps < 0.8)
  ) {
    return 'weak_network';
  }
  return 'online';
}

const TELEMETRY_CACHE_TTL_MS = 60000;
let cachedStorage: { usageMb: number | null; quotaMb: number | null; fetchedAt: number } | null = null;
let cachedBattery: { levelPercent: number | null; charging: boolean | null; fetchedAt: number } | null = null;

export function clearTelemetryCache(): void {
  cachedStorage = null;
  cachedBattery = null;
}

export function areTelemetrySnapshotsEqual(a: DeviceTelemetry, b: DeviceTelemetry): boolean {
  return (
    a.activeProfile === b.activeProfile &&
    a.manualTierOverride === b.manualTierOverride &&
    a.operatingMode === b.operatingMode &&
    a.isOnline === b.isOnline &&
    a.memoryPressure === b.memoryPressure &&
    a.estimatedAvailableRamGb === b.estimatedAvailableRamGb &&
    a.networkEffectiveType === b.networkEffectiveType &&
    a.batteryLevelPercent === b.batteryLevelPercent &&
    a.batteryCharging === b.batteryCharging &&
    a.modelLoadedInMemory === b.modelLoadedInMemory &&
    a.animationComplexity === b.animationComplexity &&
    a.storageUsedMb === b.storageUsedMb
  );
}

export async function collectDeviceTelemetry(
  manualOverride: RamProfileTier | 'auto' = 'auto',
  serverReachable = true,
  modelLoadedInMemory = true,
): Promise<DeviceTelemetry> {
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as NavigatorExtended;
  const perf = (typeof performance !== 'undefined' ? performance : {}) as PerformanceExtended;

  const ua = nav.userAgent || '';
  const totalRamGb =
    manualOverride === 'eco_3_4gb'
      ? 4
      : manualOverride === 'balanced_6gb'
        ? 6
        : manualOverride === 'ultra_8gb_plus'
          ? 8
          : typeof nav.deviceMemory === 'number'
            ? nav.deviceMemory
            : 4;

  let jsHeapUsedMb: number | null = null;
  let jsHeapLimitMb: number | null = null;
  let memoryPressure: 'low' | 'moderate' | 'high' = totalRamGb <= 4 ? 'moderate' : 'low';

  if (perf.memory) {
    jsHeapUsedMb = Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
    jsHeapLimitMb = Math.round((perf.memory.jsHeapSizeLimit / (1024 * 1024)) * 10) / 10;
    const ratio = perf.memory.usedJSHeapSize / Math.max(1, perf.memory.jsHeapSizeLimit);
    if (ratio > 0.72) memoryPressure = 'high';
    else if (ratio > 0.48 || totalRamGb <= 4) memoryPressure = 'moderate';
    else memoryPressure = 'low';
  }

  const estimatedAvailableRamGb =
    memoryPressure === 'high'
      ? Math.max(0.6, Math.round(totalRamGb * 0.25 * 10) / 10)
      : memoryPressure === 'moderate'
        ? Math.max(1.1, Math.round(totalRamGb * 0.42 * 10) / 10)
        : Math.round(totalRamGb * 0.62 * 10) / 10;

  const nowMs = Date.now();
  let storageUsedMb: number | null = cachedStorage?.usageMb ?? null;
  let storageQuotaMb: number | null = cachedStorage?.quotaMb ?? null;
  if (
    nav.storage?.estimate &&
    (!cachedStorage || nowMs - cachedStorage.fetchedAt > TELEMETRY_CACHE_TTL_MS)
  ) {
    try {
      const est = await nav.storage.estimate();
      storageUsedMb =
        typeof est.usage === 'number' ? Math.round((est.usage / (1024 * 1024)) * 10) / 10 : null;
      storageQuotaMb =
        typeof est.quota === 'number' ? Math.round(est.quota / (1024 * 1024)) : null;
      cachedStorage = { usageMb: storageUsedMb, quotaMb: storageQuotaMb, fetchedAt: nowMs };
    } catch {
      // Ignore storage estimate denial
    }
  }

  let batteryLevelPercent: number | null = cachedBattery?.levelPercent ?? null;
  let batteryCharging: boolean | null = cachedBattery?.charging ?? null;
  if (
    nav.getBattery &&
    (!cachedBattery || nowMs - cachedBattery.fetchedAt > TELEMETRY_CACHE_TTL_MS)
  ) {
    try {
      const bat = await nav.getBattery();
      batteryLevelPercent = Math.round(bat.level * 100);
      batteryCharging = bat.charging;
      cachedBattery = { levelPercent: batteryLevelPercent, charging: batteryCharging, fetchedAt: nowMs };
    } catch {
      // Battery API optional
    }
  }

  const conn = nav.connection;
  const networkEffectiveType = conn?.effectiveType || (nav.onLine === false ? 'disconnected' : '4g');
  const networkDownlinkMbps = typeof conn?.downlink === 'number' ? conn.downlink : null;
  const saveData = Boolean(conn?.saveData);
  const isOnline = typeof nav.onLine === 'boolean' ? nav.onLine : true;

  const operatingMode = determineOperatingMode(
    isOnline,
    networkEffectiveType,
    networkDownlinkMbps,
    saveData,
    serverReachable,
  );

  const profileConfig = deriveRamProfile(
    totalRamGb,
    estimatedAvailableRamGb,
    memoryPressure,
    manualOverride,
  );

  const architecture =
    nav.userAgentData?.architecture ||
    (/arm64|aarch64/i.test(ua) ? 'ARM64' : /x86_64|win64|wow64/i.test(ua) ? 'x86_64' : 'Universal WebAssembly');

  return {
    totalRamGb,
    estimatedAvailableRamGb,
    jsHeapUsedMb,
    jsHeapLimitMb,
    memoryPressure,
    cpuCores: nav.hardwareConcurrency || 4,
    architecture,
    platform: nav.userAgentData?.platform || nav.platform || 'Unknown Platform',
    androidVersion: detectAndroidVersion(ua),
    storageUsedMb,
    storageQuotaMb,
    batteryLevelPercent,
    batteryCharging,
    networkEffectiveType,
    networkDownlinkMbps,
    isOnline,
    operatingMode,
    activeProfile: profileConfig.activeProfile,
    manualTierOverride: manualOverride,
    localModelSpec: profileConfig.localModelSpec,
    maxContextTurns: profileConfig.maxContextTurns,
    maxCacheEntries: profileConfig.maxCacheEntries,
    animationComplexity: profileConfig.animationComplexity,
    modelLoadedInMemory:
      profileConfig.activeProfile === 'eco_3_4gb' && memoryPressure === 'high'
        ? false
        : modelLoadedInMemory,
  };
}
