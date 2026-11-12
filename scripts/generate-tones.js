#!/usr/bin/env node
/**
 * Generates the bundled notification tones.
 *
 * Every tone is synthesised here from `assets/sounds/tone-specs.json`, so the
 * app ships original audio with no third-party licensing attached. Output is
 * 16-bit mono PCM WAV at 44.1 kHz, which is what both the expo-notifications
 * config plugin and Android's res/raw directory expect.
 *
 * Run with: node scripts/generate-tones.js
 */
const fs = require('node:fs');
const path = require('node:path');

const SAMPLE_RATE = 44100;
const SOUNDS_DIR = path.join(__dirname, '..', 'assets', 'sounds');
const SPEC_FILE = path.join(SOUNDS_DIR, 'tone-specs.json');

/** Naive band-limited-ish oscillators. Square is kept quiet to avoid clipping. */
function sample(waveform, phase) {
  switch (waveform) {
    case 'square':
      return phase % 1 < 0.5 ? 1 : -1;
    case 'triangle': {
      const t = phase % 1;
      return 4 * Math.abs(t - 0.5) - 1;
    }
    default:
      return Math.sin(2 * Math.PI * phase);
  }
}

function renderTone(synth) {
  const { notes, waveform, noteSeconds, gain, repeats } = synth;
  const gapSeconds = 0.18;
  const phraseSamples = Math.round(notes.length * noteSeconds * SAMPLE_RATE);
  const gapSamples = Math.round(gapSeconds * SAMPLE_RATE);
  const total = repeats * phraseSamples + (repeats - 1) * gapSamples;
  const buffer = new Float32Array(total);

  let cursor = 0;
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    for (const frequency of notes) {
      const noteSamples = Math.round(noteSeconds * SAMPLE_RATE);
      if (frequency > 0) {
        // Exponential decay per note, with a 10 ms attack to avoid clicks.
        const attack = Math.round(0.01 * SAMPLE_RATE);
        for (let i = 0; i < noteSamples; i += 1) {
          const t = i / SAMPLE_RATE;
          const decay = Math.exp(-t / (noteSeconds * 0.6));
          const envelope = (i < attack ? i / attack : 1) * decay;
          buffer[cursor + i] += sample(waveform, frequency * t) * gain * envelope;
        }
      }
      cursor += noteSamples;
    }
    cursor += gapSamples;
  }

  return buffer;
}

function toWav(samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // format: PCM
  buffer.writeUInt16LE(1, 22); // channels: mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

function main() {
  const specs = JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8'));
  for (const spec of specs) {
    const wav = toWav(renderTone(spec.synth));
    const target = path.join(SOUNDS_DIR, spec.fileName);
    fs.writeFileSync(target, wav);
    const seconds = (wav.length - 44) / 2 / SAMPLE_RATE;
    console.log(`${spec.fileName.padEnd(26)} ${seconds.toFixed(2)}s  ${wav.length} bytes`);
  }
  console.log(`\nGenerated ${specs.length} tones into assets/sounds/`);
}

main();
