import { describe, expect, it } from 'vitest';
import raw from './beys.json';
import boxStats from '../../scripts/box-stats.json';
import { BEYS, comboName, displayName, findBey, heightStep, otherName, parseRatchet, partsOf, releaseLabel, releaseStatus, totalWeight } from '.';
import { validateBeys } from './validate';
import type { Bey } from './types';

describe('Bey data', () => {
  it('has no problems', () => {
    expect(validateBeys(raw as Bey[])).toEqual([]);
  });

  it('has the Hasbro lineup, newest first', () => {
    expect(BEYS.length).toBeGreaterThan(60);
    const dates = BEYS.map((bey) => bey.released).filter(Boolean) as string[];
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('has Rudder Phoenix exactly as printed on its Hasbro box', () => {
    const bey = findBey('rudder-phoenix-4-70lf')!;
    expect(displayName(bey)).toBe('Rudder Phoenix');
    expect(comboName(bey)).toBe('4-70LF');
    expect(bey.statsFrom).toBe('Hasbro box');
    expect(bey.blade.stats).toEqual({ attack: 15, defense: 40, stamina: 60 });
    expect(bey.ratchet?.stats).toEqual({ attack: 11, defense: 12, stamina: 7 });
    expect(bey.bit.stats).toEqual({ attack: 45, defense: 5, stamina: 10, dash: 40, burstResistance: 80 });
  });

  it('matches the Sword Dran box', () => {
    const bey = findBey('sword-dran-3-60f')!;
    expect(bey.blade.stats).toEqual({ attack: 55, defense: 25, stamina: 20 });
    expect(bey.ratchet?.stats).toEqual({ attack: 15, defense: 9, stamina: 6 });
    expect(bey.bit.stats).toEqual({ attack: 40, defense: 15, stamina: 10, dash: 35, burstResistance: 80 });
  });

  it('adds up Custom Line blade pieces the way the box does', () => {
    const courage = findBey('courage-dran-s-6-60v')!;
    expect(courage.blade.stats).toEqual({ attack: 60, defense: 20, stamina: 20 });
    expect(courage.blade.pieces?.map((p) => p.label)).toEqual(['Lock Chip', 'Primary Blade', 'Auxiliary Blade']);
    expect(findBey('blitz-bahamut-bk-1-50i')!.blade.stats).toEqual({ attack: 65, defense: 20, stamina: 15 });
  });

  it('keeps half points the box prints', () => {
    expect(findBey('whip-brachio-ow-5-70nr')!.ratchet?.stats).toEqual({ attack: 12, defense: 8.5, stamina: 9.5 });
  });

  it('uses every box reading in scripts/box-stats.json', () => {
    for (const [id, parts] of Object.entries(boxStats)) {
      const bey = findBey(id)!;
      expect(bey, id).toBeTruthy();
      for (const [part, stats] of Object.entries(parts)) expect(bey[part as 'blade'].stats, `${id} ${part}`).toEqual(stats);
    }
  });

  it('includes the Beys from Dual Packs and Multipack Sets', () => {
    const spidey = findBey('spider-man-3-60f')!;
    expect(spidey.set).toBe('Multipack');
    expect(spidey.packs).toEqual(['Spider-Man and Venom Multipack Set']);
    expect(findBey('knife-shinobi-4-80hn')!.set).toBe('Dual Pack');
    expect(findBey('sword-dran-3-60f')!.packs).toContain('Tail Viper and Sword Dran Dual Pack');
    expect(new Set(BEYS.map((bey) => bey.id)).size).toBe(BEYS.length);
  });

  it('handles a blade with a built-in ratchet', () => {
    const bey = findBey('valor-bison-fb')!;
    expect(bey.ratchet).toBeUndefined();
    expect(partsOf(bey)).toEqual(['blade', 'bit']);
    expect(comboName(bey)).toBe('FB');
  });
});

describe('validateBeys', () => {
  const good = findBey('sword-dran-3-60f')!;

  it('catches a duplicate id, a bad type and an out-of-range stat', () => {
    const bad: Bey = {
      ...good,
      type: 'speedy' as Bey['type'],
      ratchet: { name: '3-60', stats: { attack: 40, defense: 10, stamina: 10 } },
    };
    const errors = validateBeys([good, bad]);
    expect(errors.some((e) => e.includes('used twice'))).toBe(true);
    expect(errors.some((e) => e.includes('type "speedy"'))).toBe(true);
    expect(errors.some((e) => e.includes('ratchet attack must be a number from 0 to 32'))).toBe(true);
  });

  it('needs a ratchet unless the blade has one built in', () => {
    expect(validateBeys([{ ...good, ratchet: undefined }])).toEqual([expect.stringContaining('ratchet is missing')]);
    expect(validateBeys([{ ...good, ratchet: undefined, blade: { ...good.blade, integratedRatchet: true } }])).toEqual([]);
  });

  it('needs to know where the stats came from', () => {
    expect(validateBeys([{ ...good, statsFrom: undefined }])).toEqual([expect.stringContaining('statsFrom')]);
  });
});

describe('helpers', () => {
  it('shows the Hasbro name first', () => {
    const bey = findBey('sword-dran-3-60f')!;
    expect(displayName(bey)).toBe('Sword Dran');
    expect(otherName(bey)).toBe('DranSword');
  });

  it('reads ratchet codes', () => {
    expect(parseRatchet('4-70')).toEqual({ points: 4, height: 70 });
    expect(parseRatchet('3-60')).toEqual({ points: 3, height: 60 });
    expect(parseRatchet('M-85')).toEqual({ points: undefined, height: 85 });
  });

  it('lights the middle height block for 70, like the box', () => {
    expect(heightStep(70)).toBe(3);
    expect(heightStep(60)).toBe(2);
    expect(heightStep(80)).toBe(4);
  });

  it('uses the Bey weight, or adds up the parts', () => {
    const bey = findBey('sword-dran-3-60f')!;
    expect(totalWeight(bey)).toBe(43.2);
    const parts: Bey = { ...bey, weight: undefined, blade: { weight: 33 }, ratchet: { name: '3-60', weight: 6.2 }, bit: { ...bey.bit, weight: 2.1 } };
    expect(totalWeight(parts)).toBeCloseTo(41.3);
  });

  it('marks new and upcoming Beys', () => {
    const bey = findBey('sword-dran-3-60f')!;
    const today = new Date(2026, 9, 31);
    expect(releaseStatus({ ...bey, released: '2026-12-01' }, today)).toBe('soon');
    expect(releaseStatus({ ...bey, released: '2026-09-15' }, today)).toBe('new');
    expect(releaseStatus({ ...bey, released: '2024-05-30' }, today)).toBeUndefined();
    expect(releaseLabel('2026-02-12')).toBe('Feb 2026');
  });
});
