'use client';

const SOUND_PREF_KEY = 'gk_operator_sound_enabled';
const SOUND_EVENT_NAME = 'gk-sound-pref-changed';
const DEDUPE_COOLDOWN_MS = 85;

let sharedAudioCtx: AudioContext | null = null;
let lastPlayedTimestamp = 0;

export function isOperatorSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(SOUND_PREF_KEY);
    if (saved === null) return true;
    return saved !== 'false';
  } catch {
    return true;
  }
}

export function setOperatorSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(SOUND_EVENT_NAME, { detail: { enabled } }));
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function subscribeOperatorSoundPreference(
  callback: (enabled: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ enabled: boolean }>;
    if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
      callback(customEvent.detail.enabled);
    } else {
      callback(isOperatorSoundEnabled());
    }
  };
  window.addEventListener(SOUND_EVENT_NAME, handler);
  return () => window.removeEventListener(SOUND_EVENT_NAME, handler);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function canPlayNow(): boolean {
  if (!isOperatorSoundEnabled()) return false;
  const now = performance.now();
  if (now - lastPlayedTimestamp < DEDUPE_COOLDOWN_MS) {
    return false;
  }
  lastPlayedTimestamp = now;
  return true;
}

/**
 * Soft, subtle micro-tap sound for selecting an option (host, department, gender, toggle)
 */
export function playSelectSound(): void {
  if (!canPlayNow()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(430, now + 0.042);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.048);
  } catch {
    // Fail silently if audio playback is restricted
  }
}

/**
 * Reassuring two-note soft ascending confirmation sound when a selection automatically advances to the next step
 */
export function playAutoAdvanceSound(): void {
  if (!canPlayNow()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.05);

    // Note 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.036);
    gain2.gain.setValueAtTime(0.001, now + 0.036);
    gain2.gain.exponentialRampToValueAtTime(0.065, now + 0.045);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.036);
    osc2.stop(now + 0.098);
  } catch {
    // Fail silently
  }
}

/**
 * Subtle forward navigation tone when pressing Continue / Next / Submit
 */
export function playContinueSound(): void {
  if (!canPlayNow()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.055);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.058);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Fail silently
  }
}

/**
 * Subtle downward navigation tone when pressing Back
 */
export function playBackSound(): void {
  if (!canPlayNow()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.054);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.056);
  } catch {
    // Fail silently
  }
}
