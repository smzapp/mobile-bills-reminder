import { useCallback, useEffect, useRef, useState } from 'react';

import { getTone } from '@/constants/tones';
import { playTonePreview, stopTonePreview } from '@/services/audio/tone-player';

function toneDurationMs(toneId: string): number {
  const { synth } = getTone(toneId);
  const phrase = synth.notes.length * synth.noteSeconds;
  const gaps = Math.max(0, synth.repeats - 1) * 0.18;
  return Math.round((phrase * synth.repeats + gaps) * 1000);
}

export interface TonePreviewApi {
  /** Id of the tone currently playing, for swapping play/stop icons. */
  playingId: string | null;
  play: (toneId: string) => void;
  stop: () => void;
}

/**
 * Drives ringtone preview buttons. Playback stops when the screen unmounts and
 * when another tone starts, so previews never overlap.
 */
export function useTonePreview(): TonePreviewApi {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    stopTonePreview();
    setPlayingId(null);
  }, [clearTimer]);

  const play = useCallback(
    (toneId: string) => {
      clearTimer();
      if (playingId === toneId) {
        stop();
        return;
      }
      setPlayingId(toneId);
      void playTonePreview(toneId).catch(() => setPlayingId(null));
      timer.current = setTimeout(() => {
        stopTonePreview();
        setPlayingId(null);
      }, toneDurationMs(toneId) + 150);
    },
    [clearTimer, playingId, stop],
  );

  useEffect(() => stop, [stop]);

  return { playingId, play, stop };
}
