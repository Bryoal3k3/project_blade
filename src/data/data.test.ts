import { describe, expect, it } from 'vitest';
import raw from './beys.json';
import { BEYS, comboName, displayName, findBey, heightStep, otherName, parseRatchet, totalWeight } from '.';
import { validateBeys } from './validate';
import type { Bey } from './types';

describe('Bey data', () => {
  it('has no problems', () => {
    expect(validateBeys(raw as Bey[])).toEqual([]);
  });

  it('is sorted BX, then UX, numbered ones first', () => {
    const order = BEYS.map((bey) => bey.code ?? displayName(bey));
    expect(order[0]).toBe('BX-01');
    expect(order.indexOf('BX-34')).toBeLessThan(order.indexOf('UX-01'));
    expect(order.at(-1)).toBe('Rudder Phoenix');
  });

  it('has Rudder Phoenix exactly as printed on its Hasbro box', () => {
    const bey = findBey('rudder-phoenix')!;
    expect(comboName(bey)).toBe('4-70LF');
    expect(bey.statsFrom).toBe('Hasbro');
    expect(bey.blade.stats).toEqual({ attack: 15, defense: 40, stamina: 60 });
    expect(bey.ratchet.stats).toEqual({ attack: 11, defense: 12, stamina: 7 });
    expect(bey.bit.stats).toEqual({ attack: 45, defense: 5, stamina: 10, dash: 40, burstResistance: 80 });
  });
});

describe('validateBeys', () => {
  const good = (raw as Bey[])[0];

  it('catches a duplicate id, a bad type and an out-of-range stat', () => {
    const bad: Bey = {
      ...good,
      code: 'BX-99',
      type: 'speedy' as Bey['type'],
      statsFrom: 'Hasbro',
      ratchet: { name: '3-60', stats: { attack: 40, defense: 10, stamina: 10 } },
    };
    const errors = validateBeys([good, bad]);
    expect(errors.some((e) => e.includes('used twice'))).toBe(true);
    expect(errors.some((e) => e.includes('type "speedy"'))).toBe(true);
    expect(errors.some((e) => e.includes('ratchet attack must be a whole number from 0 to 32'))).toBe(true);
  });

  it('needs a description for every bit', () => {
    const errors = validateBeys([{ ...good, bit: { code: 'ZZ', name: 'Mystery' } }]);
    expect(errors).toEqual([expect.stringContaining('bit "ZZ" needs a description')]);
  });

  it('needs to know whose box the stats came from', () => {
    const filled: Bey = { ...good, blade: { stats: { attack: 60, defense: 20, stamina: 20 } } };
    expect(validateBeys([filled])).toEqual([expect.stringContaining('statsFrom')]);
    expect(validateBeys([{ ...filled, statsFrom: 'Takara Tomy' }])).toEqual([]);
  });

  it('checks the code matches the line', () => {
    expect(validateBeys([{ ...good, line: 'UX' }])).toEqual([expect.stringContaining('does not match line')]);
  });
});

describe('helpers', () => {
  it('shows the Hasbro name first', () => {
    const bey = findBey('dran-sword')!;
    expect(displayName(bey)).toBe('Sword Dran');
    expect(otherName(bey)).toBe('Dran Sword');
    expect(displayName(findBey('rhino-horn')!)).toBe('Rhino Horn');
    expect(otherName(findBey('rhino-horn')!)).toBeUndefined();
  });

  it('reads ratchet codes', () => {
    expect(parseRatchet('4-70')).toEqual({ points: 4, height: 70 });
    expect(parseRatchet('3-60')).toEqual({ points: 3, height: 60 });
  });

  it('lights the middle height block for 70, like the box', () => {
    expect(heightStep(70)).toBe(3);
    expect(heightStep(60)).toBe(2);
    expect(heightStep(80)).toBe(4);
  });

  it('only totals the weight when every part has one', () => {
    const bey = BEYS[0];
    expect(totalWeight(bey)).toBeUndefined();
    expect(totalWeight({ ...bey, blade: { weight: 33 }, ratchet: { ...bey.ratchet, weight: 6.2 }, bit: { ...bey.bit, weight: 2.1 } })).toBeCloseTo(41.3);
  });
});
