import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Cpu,
  Download,
  HardDrive,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Upload,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  createSafeCheckpoint,
  runFullSystemDiagnostics,
} from '../engines/diagnosticsEngine';
import {
  exportFullBackupJson,
  importFullBackupJson,
} from '../engines/localDb';
import {
  isVibrationApiSupported,
  prefersReducedMotionActive,
  shouldTriggerHaptics,
  triggerHaptic,
} from '../engines/hapticsEngine';
import { usePWAInstall } from '../engines/usePWAInstall';
import {
  inspectDeviceVoiceCapabilities,
  setAroraVoicePersona,
  speakAroraText,
} from '../engines/voiceEngine';
import type {
  DeviceTelemetry,
  DiagnosticCheckResult,
  LanguageMode,
  RamProfileTier,
  StudentProfile,
  VersionCheckpoint,
  VoicePersona,
} from '../types/arora';

interface SystemConsoleProps {
  profile: StudentProfile;
  onUpdateProfile: (p: StudentProfile) => void;
  telemetry: DeviceTelemetry;
  onChangeRamOverride: (tier: RamProfileTier | 'auto') => void;
  onToggleModelLoaded: () => void;
  onFreeUnusedMemory?: () => void;
  checkpoints: VersionCheckpoint[];
  onAddCheckpoint: (cp: VersionCheckpoint) => void;
  onRefreshData: () => Promise<void>;
}

export const SystemConsole: React.FC<SystemConsoleProps> = ({
  profile,
  onUpdateProfile,
  telemetry,
  onChangeRamOverride,
  onToggleModelLoaded,
  onFreeUnusedMemory,
  checkpoints,
  onAddCheckpoint,
  onRefreshData,
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheckResult[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [cycleActive, setCycleActive] = useState(false);
  const [cycleSecondsLeft, setCycleSecondsLeft] = useState(600); // 10 minutes = 600s
  const [cycleRounds, setCycleRounds] = useState(0);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const voiceReport = inspectDeviceVoiceCapabilities();

  const executeDiagnosticPass = async () => {
    setDiagLoading(true);
    const results = await runFullSystemDiagnostics(telemetry);
    setDiagnostics(results);
    setDiagLoading(false);
  };

  useEffect(() => {
    void executeDiagnosticPass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry.activeProfile, telemetry.operatingMode]);

  // On-Demand 10-Minute Continuous Diagnostic Cycle
  useEffect(() => {
    if (!cycleActive) return;
    const timer = setInterval(() => {
      setCycleSecondsLeft((prev) => {
        if (prev <= 1) {
          setCycleActive(false);
          return 0;
        }
        if (prev % 60 === 0) {
          setCycleRounds((r) => r + 1);
          void executeDiagnosticPass();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleActive]);

  const startTenMinuteCycle = async () => {
    setCycleSecondsLeft(600);
    setCycleRounds(1);
    setCycleActive(true);
    const cp = await createSafeCheckpoint(
      `Diagnostic Checkpoint #${checkpoints.length + 1}`,
      `Pre-diagnostic snapshot (${telemetry.activeProfile}, ${telemetry.operatingMode}).`,
    );
    onAddCheckpoint(cp);
    await executeDiagnosticPass();
  };

  const handleExportBackup = async () => {
    const json = await exportFullBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arora-ai-backup-${profile.anonymousId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice('Exported complete local student backup JSON.');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await importFullBackupJson(text);
    setBackupNotice(res.message);
    if (res.imported) {
      await onRefreshData();
    }
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const downloadMaintenanceReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      studentAnonymousId: profile.anonymousId,
      deviceTelemetry: telemetry,
      voiceAvailability: voiceReport,
      diagnosticResults: diagnostics,
      checkpoints,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arora-maintenance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
            Anonymous Local Profile · Adaptive RAM Optimization · Safe Maintenance
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            System, Voice & Device Optimization
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onUpdateProfile({
                ...profile,
                theme: profile.theme === 'dark' ? 'light' : 'dark',
              });
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px]"
          >
            {profile.theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-violet-600" />
                Switch to Dark Mode
              </>
            )}
          </button>

          {/* In-App PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white glass-press shadow-sm shadow-cyan-500/25 text-xs font-semibold min-h-[40px]"
            >
              <Smartphone className="w-4 h-4" />
              Install ARORA App
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 glass-subcard glass-press border-cyan-500/40 text-xs font-medium text-cyan-700 dark:text-cyan-300 min-h-[40px]"
            >
              Install on iOS
            </button>
          )}
        </div>
      </div>

      {showIOSGuide && (
        <div className="p-4 rounded-2xl bg-sky-500/12 dark:bg-sky-950/35 border border-sky-400/35 holo-blur text-xs space-y-1.5">
          <div className="font-semibold text-slate-900 dark:text-white">
            Install ARORA AI on iPhone / iPad
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            1. Tap the Share button in Safari toolbar. 2. Tap &ldquo;Add to Home Screen&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="text-cyan-600 dark:text-cyan-400 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Row 1: Anonymous Student Profile & Adaptive Device RAM Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Anonymous Profile (Zero Mandatory Google Login) */}
        <div className="lg:col-span-5 holo-panel p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Anonymous Local Student Profile
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            No Gmail, Google Sign-In, phone number, or photo required. All progress is stored locally in IndexedDB under your generated anonymous ID.
          </p>

          <div className="p-3.5 glass-subcard space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Anonymous ID</span>
              <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                {profile.anonymousId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Topics Mastered</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                {profile.completedTopics.length}
              </span>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Optional Local Display Alias
            <input
              type="text"
              value={profile.displayAlias}
              onChange={(e) =>
                onUpdateProfile({ ...profile, displayAlias: e.target.value })
              }
              className="px-3 py-2 glass-input text-xs"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleExportBackup()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              Export Backup JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={(e) => void handleImportBackup(e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px]"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore Backup
            </button>
          </div>
          <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.hapticsEnabled ?? true}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    onUpdateProfile({ ...profile, hapticsEnabled: nextVal });
                    if (nextVal) triggerHaptic('checkbox');
                  }}
                  className="accent-cyan-500"
                />
                Subtle Haptic Feedback
              </label>
              <button
                type="button"
                onClick={() => triggerHaptic('submit')}
                className="px-3 py-1 glass-subcard glass-press text-[11px] font-medium text-slate-600 dark:text-slate-200 hover:border-cyan-400/50"
              >
                Test Pulse
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {!isVibrationApiSupported()
                ? 'Device browser does not expose Vibration API; visual focus feedback remains active.'
                : prefersReducedMotionActive()
                  ? 'Paused automatically because OS "Reduce Motion" preference is enabled.'
                  : !shouldTriggerHaptics({
                        hapticsEnabled: profile.hapticsEnabled ?? true,
                        prefersReducedMotion: false,
                        activeProfile: telemetry.activeProfile,
                        memoryPressure: telemetry.memoryPressure,
                        batteryLevelPercent: telemetry.batteryLevelPercent,
                        batteryCharging: telemetry.batteryCharging,
                      })
                    ? 'Paused automatically to preserve battery / RAM stability.'
                    : 'Active — respects Reduce Motion, 3–4 GB Eco memory pressure, and low-battery guards.'}
            </p>
          </div>
          {backupNotice && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{backupNotice}</p>
          )}
        </div>

        {/* Adaptive Device Optimization Engine */}
        <div className="lg:col-span-7 holo-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-violet-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Adaptive Device RAM & Network Engine
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
              {telemetry.operatingMode === 'reconnecting' ? (
                <WifiOff className="w-3.5 h-3.5" />
              ) : (
                <Wifi className="w-3.5 h-3.5" />
              )}
              {telemetry.operatingMode.replace('_', ' ').toUpperCase()} MODE
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
            <div className="p-3.5 glass-subcard">
              <div className="text-slate-500 dark:text-slate-400">Total / Free RAM</div>
              <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">
                {telemetry.totalRamGb} GB / ~{telemetry.estimatedAvailableRamGb} GB
              </div>
            </div>
            <div className="p-3.5 glass-subcard">
              <div className="text-slate-500 dark:text-slate-400">Memory Pressure</div>
              <div className="mt-1 font-mono font-semibold capitalize text-cyan-600 dark:text-cyan-400">
                {telemetry.memoryPressure}
              </div>
            </div>
            <div className="p-3.5 glass-subcard">
              <div className="text-slate-500 dark:text-slate-400">CPU / Arch</div>
              <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white truncate">
                {telemetry.cpuCores} Cores · {telemetry.architecture}
              </div>
            </div>
            <div className="p-3.5 glass-subcard">
              <div className="text-slate-500 dark:text-slate-400">Battery / Net</div>
              <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">
                {telemetry.batteryLevelPercent !== null ? `${telemetry.batteryLevelPercent}%` : 'N/A'} · {telemetry.networkEffectiveType}
              </div>
            </div>
          </div>

          <div className="p-3.5 glass-subcard text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-slate-900 dark:text-white">
                Active Local Model Spec: {telemetry.localModelSpec}
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.alwaysOnline ?? true}
                  onChange={(e) => {
                    triggerHaptic('checkbox');
                    onUpdateProfile({ ...profile, alwaysOnline: e.target.checked });
                  }}
                  className="accent-emerald-500"
                />
                Always Online Cloud Mode
              </label>
            </div>
            <div className="text-slate-600 dark:text-slate-400 tabular-nums">
              Context Cap: {telemetry.maxContextTurns} turns · Cache Cap: {telemetry.maxCacheEntries} items · Animations: {telemetry.animationComplexity} · Storage Used: {telemetry.storageUsedMb ?? 0} MB
            </div>
            <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={telemetry.manualTierOverride === 'eco_3_4gb'}
                  onChange={(e) => {
                    triggerHaptic('checkbox');
                    onChangeRamOverride(e.target.checked ? 'eco_3_4gb' : 'auto');
                  }}
                  className="accent-cyan-500"
                />
                Low-Memory Performance Mode (4 GB Android)
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Disables heavy blur, reduces animation FPS, and trims transient buffers without touching data.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Test RAM Profile:
            </span>
            <div className="apple-segmented">
              {(
                [
                  { id: 'auto', label: 'Auto Detect' },
                  { id: 'eco_3_4gb', label: '3–4 GB Eco' },
                  { id: 'balanced_6gb', label: '6 GB Balanced' },
                  { id: 'ultra_8gb_plus', label: '8+ GB Ultra' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onChangeRamOverride(opt.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold glass-press min-h-[34px] ${
                    telemetry.manualTierOverride === opt.id
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {onFreeUnusedMemory && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onFreeUnusedMemory();
                    setBackupNotice('Released unused voice audio buffers and transient caches. Student history intact.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-cyan-700 dark:text-cyan-300 hover:border-cyan-400/50 min-h-[38px]"
                >
                  Free Unused Memory
                </button>
              )}
              <button
                type="button"
                onClick={onToggleModelLoaded}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[38px]"
              >
                <HardDrive className="w-3.5 h-3.5" />
                {telemetry.modelLoadedInMemory ? 'Unload Local Index' : 'Load Local Index'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Indian English, Tamil & Tanglish Voice Lab */}
      <div className="holo-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-cyan-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Indian English & Tamil Voice Engine Verification
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={profile.voicePersona || 'Zephyr'}
              onChange={(e) => {
                const nextVoice = e.target.value as VoicePersona;
                setAroraVoicePersona(nextVoice);
                onUpdateProfile({
                  ...profile,
                  voicePersona: nextVoice,
                });
              }}
              aria-label="ARORA neural voice persona"
              className="px-3.5 py-2 glass-input text-xs font-medium"
            >
              <option value="Zephyr">Voice: Siri-Like (Zephyr)</option>
              <option value="Kore">Voice: Warm Human (Kore)</option>
              <option value="Puck">Voice: Clear Studio (Puck)</option>
              <option value="device_natural">Voice: Device Natural</option>
            </select>

            <select
              value={profile.preferredLanguage}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  preferredLanguage: e.target.value as LanguageMode,
                })
              }
              aria-label="Default language mode"
              className="px-3.5 py-2 glass-input text-xs font-medium"
            >
              <option value="indian_english">Default: Indian English</option>
              <option value="tamil">Default: Tamil</option>
              <option value="tanglish">Default: Tanglish</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          {voiceReport.honestStatusNote} (en-IN voices detected: {voiceReport.installedIndianEnglishVoices.length}, ta-IN voices detected: {voiceReport.installedTamilVoices.length})
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() =>
              speakAroraText(
                'Hello! According to Faraday law of electromagnetic induction, the magnitude of induced EMF equals the rate of change of magnetic flux.',
                'indian_english',
                undefined,
                { preferNeural: true, voicePersona: profile.voicePersona || 'Zephyr' },
              )
            }
            className="p-4 glass-subcard glass-press text-left hover:border-cyan-400/50"
          >
            <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              Test Indian English (en-IN)
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              &ldquo;Faraday law of electromagnetic induction...&rdquo;
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              speakAroraText(
                'வணக்கம்! மின்காந்த தூண்டல் விதியின்படி, காந்தப் பாய மாற்ற வீதத்திற்கு நேர்விகிதத்தில் மின்னியக்கு விசை உருவாகிறது.',
                'tamil',
                undefined,
                { preferNeural: true, voicePersona: profile.voicePersona || 'Zephyr' },
              )
            }
            className="p-4 glass-subcard glass-press text-left hover:border-violet-400/50"
          >
            <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">
              Test Tamil Voice (ta-IN)
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              &ldquo;மின்காந்த தூண்டல் விதி விளக்கம்...&rdquo;
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              speakAroraText(
                'Arora, electromagnetic induction explain pannunga. Intha formula enga use aagum?',
                'tanglish',
                undefined,
                { preferNeural: true, voicePersona: profile.voicePersona || 'Zephyr' },
              )
            }
            className="p-4 glass-subcard glass-press text-left hover:border-cyan-400/50"
          >
            <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              Test Tamil-English (Tanglish)
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              &ldquo;Arora, electromagnetic induction explain pannunga...&rdquo;
            </div>
          </button>
        </div>
      </div>

      {/* Row 3: Automatic Bug Detection & 10-Minute Safe Maintenance Cycle */}
      <div className="holo-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Automatic Bug Detection & Safe Maintenance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Non-destructive verification across Curriculum, IndexedDB, Memory Pressure, API Proxy & Voice Packs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void executeDiagnosticPass()}
              disabled={diagLoading}
              className="px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px]"
            >
              {diagLoading ? 'Scanning...' : 'Run Quick Scan'}
            </button>

            {!cycleActive ? (
              <button
                type="button"
                onClick={() => void startTenMinuteCycle()}
                className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white glass-press shadow-sm shadow-cyan-500/25 text-xs font-semibold min-h-[40px]"
              >
                Start 10-Minute Diagnostic Cycle
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCycleActive(false)}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white glass-press shadow-sm shadow-rose-500/25 text-xs font-semibold tabular-nums min-h-[40px]"
              >
                Stop Cycle ({Math.floor(cycleSecondsLeft / 60)}:{String(cycleSecondsLeft % 60).padStart(2, '0')} · Pass #{cycleRounds})
              </button>
            )}

            <button
              type="button"
              onClick={downloadMaintenanceReport}
              className="px-3.5 py-2 glass-subcard glass-press text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 min-h-[40px]"
            >
              Export Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {diagnostics.map((d) => (
            <div
              key={d.id}
              className="p-3.5 glass-subcard space-y-1 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{d.name}</span>
                <span
                  className={`font-semibold uppercase ${
                    d.status === 'passed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : d.status === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {d.status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{d.detail}</p>
            </div>
          ))}
        </div>

        {checkpoints.length > 0 && (
          <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
            Latest Version Checkpoint: <span className="font-mono text-slate-800 dark:text-slate-200">{checkpoints[0].integrityHash}</span> — {checkpoints[0].label} ({new Date(checkpoints[0].createdAt).toLocaleString()})
          </div>
        )}
      </div>
    </section>
  );
};
