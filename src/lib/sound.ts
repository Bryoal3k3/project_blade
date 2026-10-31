/** A short whoosh while the parts fly together, then a bright clang as they lock. Must be called from a tap. */
export function playFuseSound(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);

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

    [523.25, 783.99, 1046.5].forEach((frequency, i) => {
      const tone = ctx.createOscillator();
      tone.type = 'triangle';
      tone.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now + 1.45);
      gain.gain.exponentialRampToValueAtTime(0.6 / (i + 1), now + 1.48);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
      tone.connect(gain).connect(master);
      tone.start(now + 1.45);
      tone.stop(now + 2.7);
    });
    window.setTimeout(() => void ctx.close(), 3000);
  } catch {
    // No sound on this device; the animation still runs.
  }
}
