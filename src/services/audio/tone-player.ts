import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { toneAsset } from '@/constants/tones';

let activePlayer: AudioPlayer | null = null;
let activeToneId: string | null = null;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    // Preview audio is non-critical; fall through to the default mode.
  }
  audioModeReady = true;
}

/** Releases the current preview, if any. Safe to call repeatedly. */
export function stopTonePreview(): void {
  if (!activePlayer) return;
  try {
    activePlayer.pause();
    activePlayer.remove();
  } catch {
    // Player may already be released.
  }
  activePlayer = null;
  activeToneId = null;
}

export function playingToneId(): string | null {
  return activeToneId;
}

/**
 * Plays one tone preview. Any previous preview is stopped first, so two tones
 * never overlap, and the caller is told how long to keep its play icon active.
 */
export async function playTonePreview(toneId: string): Promise<void> {
  await ensureAudioMode();
  stopTonePreview();
  const player = createAudioPlayer(toneAsset(toneId));
  activePlayer = player;
  activeToneId = toneId;
  try {
    player.play();
  } catch {
    stopTonePreview();
  }
}
