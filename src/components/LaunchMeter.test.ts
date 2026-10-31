import { describe, expect, it } from 'vitest';
import { SWEEP_MS, launchLabel, launchPower, sweepPosition } from './LaunchMeter';
import { SUPER_LAUNCH } from '../data/battle';

describe('launch meter', () => {
  it('sweeps from the left end to the right and back', () => {
    expect(sweepPosition(0)).toBe(-1);
    expect(sweepPosition(SWEEP_MS / 2)).toBe(0);
    expect(sweepPosition(SWEEP_MS)).toBe(1);
    expect(sweepPosition(SWEEP_MS * 1.5)).toBe(0);
    expect(sweepPosition(SWEEP_MS * 2)).toBe(-1);
  });

  it('gives the most power in the middle and the least at the ends', () => {
    expect(launchPower(0)).toBe(1.1);
    expect(launchPower(1)).toBe(0.9);
    expect(launchPower(-1)).toBe(0.9);
    expect(launchPower(0.5)).toBe(1);
    expect(launchPower(0.25)).toBeGreaterThanOrEqual(SUPER_LAUNCH);
    expect(launchPower(0.3)).toBeLessThan(SUPER_LAUNCH);
  });

  it('names the launch', () => {
    expect(launchLabel(1.1)).toBe('Super Launch!');
    expect(launchLabel(1.02)).toBe('Great rip!');
    expect(launchLabel(0.97)).toBe('Good rip');
    expect(launchLabel(0.9)).toBe('Weak rip...');
  });
});
