import toneSpecs from '@/assets/sounds/tone-specs.json';

/**
 * Bundled notification tones.
 *
 * The audio files are generated from `assets/sounds/tone-specs.json` by
 * `scripts/generate-tones.js`, so every tone is original and royalty-free.
 * Android turns the file name into a resource id, so names stay lowercase
 * snake_case.
 */

export type Waveform = 'sine' | 'triangle' | 'square';

export interface ToneSynth {
  notes: number[];
  waveform: string;
  noteSeconds: number;
  gain: number;
  repeats: number;
}

export interface ToneDefinition {
  id: string;
  name: string;
  description: string;
  /** Base file name, used for both the bundled asset and the Android channel sound. */
  fileName: string;
  synth: ToneSynth;
}

export const TONES: readonly ToneDefinition[] = toneSpecs as ToneDefinition[];

export const DEFAULT_TONE_ID = 'soft_chime';

/**
 * Static require map. Metro needs literal require calls, so this cannot be
 * derived from the spec file at runtime.
 */
export const TONE_ASSETS: Record<string, number> = {
  soft_chime: require('@/assets/sounds/soft_chime.wav'),
  gentle_bell: require('@/assets/sounds/gentle_bell.wav'),
  school_bell: require('@/assets/sounds/school_bell.wav'),
  professional_alert: require('@/assets/sounds/professional_alert.wav'),
  digital_alert: require('@/assets/sounds/digital_alert.wav'),
  cash_register: require('@/assets/sounds/cash_register.wav'),
  classic_alarm: require('@/assets/sounds/classic_alarm.wav'),
  warm_notification: require('@/assets/sounds/warm_notification.wav'),
};

export function getTone(id: string | null | undefined): ToneDefinition {
  return TONES.find((tone) => tone.id === id) ?? TONES[0];
}

export function toneName(id: string | null | undefined): string {
  return getTone(id).name;
}

export function toneAsset(id: string | null | undefined): number {
  return TONE_ASSETS[getTone(id).id];
}

/** The file name Android expects on a notification channel, e.g. "soft_chime.wav". */
export function toneFileName(id: string | null | undefined): string {
  return getTone(id).fileName;
}
