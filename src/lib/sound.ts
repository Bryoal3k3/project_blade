// Small sound effects made on the fly, so there are no audio files to download.
// The first sound has to come from a tap; after that the same audio context is reused.

let shared: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!shared) {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      shared = new AudioCtx();
    }
    if (shared.state === 'suspended') void shared.resume();
    return shared;
  } catch {
    return null;
  }
}

function output(ctx: AudioContext, volume: number): GainNode {
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  return master;
}

function tone(ctx: AudioContext, into: AudioNode, frequency: number, start: number, length: number, peak: number, type: OscillatorType = 'triangle') {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(into);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** Call from a tap so later sounds are allowed to play. */
export function unlockSound(): void {
  audio();
}

/** A whoosh while the parts fly together, then a bright clang as they lock. */
export function playFuseSound(): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const master = output(ctx, 0.12);
    const sweep = ctx.createOscillator();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(110, now);
    sweep.frequency.exponentialRampToValueAtTime(880, now + 1.3);
    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0.0001, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.5, now + 1.0);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    sweep.connect(filter).connect(sweepGain).connect(master);
    sweep.start(now);
    sweep.stop(now + 1.5);
    [523.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, master, f, now + 1.45, 1.15, 0.6 / (i + 1)));
  } catch {
    // No sound on this device.
  }
}

/** A short metal clack when two Beys hit. */
export function playClack(): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const master = output(ctx, 0.1);
    const length = 0.08;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 3200;
    noise.connect(band).connect(master);
    noise.start(now);
    tone(ctx, master, 1900, now, 0.12, 0.4, 'square');
  } catch {
    // No sound on this device.
  }
}

/** A rising fanfare for the end of a round. */
export function playFinish(): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const master = output(ctx, 0.12);
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(ctx, master, f, now + i * 0.09, 0.5, 0.5));
  } catch {
    // No sound on this device.
  }
}
