import { describe, expect, it } from 'vitest';
import raw from './beys.json';
import { BEYS, comboName, parseRatchet, totalWeight } from '.';
import { validateBeys } from './validate';
import type { Bey } from './types';

describe('Bey data', () => {
  it('has no problems', () => {
    expect(validateBeys(raw as Bey[])).toEqual([]);
  });

  it('is sorted by product code, BX before UX', () => {
    const codes = BEYS.map((bey) => bey.code);
    expect(codes[0]).toBe('BX-01');
    expect(codes.indexOf('BX-34')).toBeLessThan(codes.indexOf('UX-01'));
  });
});

describe('validateBeys', () => {
  const good = (raw as Bey[])[0];

  it('catches a duplicate id, a bad type and an out-of-range stat', () => {
    const bad: Bey = {
      ...good,
      code: 'BX-99',
      type: 'speedy' as Bey['type'],
      blade: { name: 'Test', stats: { attack: 150, defense: 10, stamina: 10 } },
    };
    const errors = validateBeys([good, bad]);
    expect(errors.some((e) => e.includes('used twice'))).toBe(true);
    expect(errors.some((e) => e.includes('type "speedy"'))).toBe(true);
    expect(errors.some((e) => e.includes('blade attack'))).toBe(true);
  });

  it('needs a description for every bit', () => {
    const errors = validateBeys([{ ...good, bit: { code: 'ZZ', name: 'Mystery' } }]);
    expect(errors).toEqual([expect.stringContaining('bit "ZZ" needs a description')]);
  });

  it('accepts stats and weights once they are filled in', () => {
    const filled: Bey = {
      ...good,
      blade: { name: 'Dran Sword', weight: 33, stats: { attack: 60, defense: 20, stamina: 20 } },
      bit: { code: 'F', name: 'Flat', weight: 2.1, stats: { attack: 40, defense: 15, stamina: 10, dash: 35, burstResistance: 30 } },
    };
    expect(validateBeys([filled])).toEqual([]);
  });
});

describe('helpers', () => {
  it('reads ratchet codes', () => {
    expect(parseRatchet('3-60')).toEqual({ points: 3, heightMm: 6 });
    expect(parseRatchet('5-70')).toEqual({ points: 5, heightMm: 7 });
  });

  it('builds the combo name', () => {
    expect(comboName(BEYS[0])).toBe('3-60F');
  });

  it('only totals the weight when every part has one', () => {
    const bey = BEYS[0];
    expect(totalWeight(bey)).toBeUndefined();
    expect(
      totalWeight({ ...bey, blade: { ...bey.blade, weight: 33 }, ratchet: { ...bey.ratchet, weight: 6.2 }, bit: { ...bey.bit, weight: 2.1 } }),
    ).toBeCloseTo(41.3);
  });
});
