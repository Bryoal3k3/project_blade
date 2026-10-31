import { describe, expect, it } from 'vitest';
import {
  BIT_OPTIONS,
  BLADE_OPTIONS,
  RATCHET_OPTIONS,
  type Choice,
  findOption,
  fusedBey,
  fusedTotals,
  fusedType,
  neededParts,
  shoppingList,
} from './builder';
import { comboName, PACKS } from '.';

const today = new Date(2026, 9, 31);

function choose(blade: string, ratchet: string | undefined, bit: string): Choice {
  return {
    blade: findOption(BLADE_OPTIONS, blade)!,
    ratchet: findOption(RATCHET_OPTIONS, ratchet),
    bit: findOption(BIT_OPTIONS, bit)!,
  };
}

describe('part options', () => {
  it('lists each blade, ratchet and bit once', () => {
    for (const options of [BLADE_OPTIONS, RATCHET_OPTIONS, BIT_OPTIONS]) {
      expect(new Set(options.map((o) => o.key)).size).toBe(options.length);
    }
    expect(BLADE_OPTIONS.length).toBeGreaterThan(80);
    expect(RATCHET_OPTIONS.map((o) => o.key)).toContain('4-70');
    expect(BIT_OPTIONS.map((o) => o.key)).toContain('LF');
  });

  it('uses the stats from a real box when there are some', () => {
    expect(findOption(BLADE_OPTIONS, 'UX|Rudder Phoenix')!.blade.stats).toEqual({ attack: 15, defense: 40, stamina: 60 });
  });

  it('orders ratchets from shortest to tallest', () => {
    const heights = RATCHET_OPTIONS.map((o) => Number(o.key.split('-')[1]));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });
});

describe('fusing', () => {
  it('adds up the three parts', () => {
    const choice = choose('UX|Rudder Phoenix', '4-70', 'LF');
    expect(fusedTotals(choice)).toEqual({ attack: 15 + 11 + 45, defense: 40 + 12 + 5, stamina: 60 + 7 + 10, complete: true });
    const bey = fusedBey(choice);
    expect(comboName(bey)).toBe('4-70LF');
    expect(bey.names.hasbro).toBe('Rudder Phoenix');
  });

  it('skips the ratchet for a blade with one built in', () => {
    const choice = choose('UX|Valor Bison', '4-70', 'LF');
    expect(neededParts(choice)).toEqual(['blade', 'bit']);
    expect(fusedBey(choice).ratchet).toBeUndefined();
    expect(fusedTotals(choice).attack).toBe(36 + 45);
  });

  it('picks a type from the biggest total', () => {
    expect(fusedType({ attack: 100, defense: 40, stamina: 30 })).toBe('attack');
    expect(fusedType({ attack: 30, defense: 40, stamina: 100 })).toBe('stamina');
    expect(fusedType({ attack: 70, defense: 66, stamina: 20 })).toBe('balance');
  });
});

describe('shopping list', () => {
  it('buys one box when one Bey has every part', () => {
    const list = shoppingList(choose('UX|Rudder Phoenix', '4-70', 'LF'), [], today);
    expect(list).toHaveLength(1);
    expect(list[0].source.label).toBe('Rudder Phoenix 4-70LF');
    expect(list[0].gives).toEqual(['blade', 'ratchet', 'bit']);
  });

  it('mixes parts from different boxes and gives every part exactly once', () => {
    const list = shoppingList(choose('BX|Sword Dran', '9-60', 'DB'), [], today);
    const given = list.flatMap((item) => item.gives).sort();
    expect(given).toEqual(['bit', 'blade', 'ratchet']);
    expect(list.length).toBeLessThanOrEqual(3);
    for (const item of list) {
      expect(item.source.beys).toContain(item.bey);
    }
  });

  it('skips parts from Beys you already have', () => {
    const list = shoppingList(choose('BX|Sword Dran', '4-70', 'LF'), ['rudder-phoenix-4-70lf'], today);
    const have = list.find((item) => item.source.kind === 'have');
    expect(have?.source.label).toBe('Rudder Phoenix 4-70LF');
    expect(list.filter((item) => item.source.kind === 'buy')).toHaveLength(1);
  });

  it('can send you to a pack for a part only sold in one', () => {
    const packOnlyBlade = BLADE_OPTIONS.find((o) => o.sources.every((bey) => bey.set === 'Multipack'))!;
    const list = shoppingList({ ...choose('UX|Rudder Phoenix', '4-70', 'LF'), blade: packOnlyBlade }, [], today);
    const forBlade = list.find((item) => item.gives.includes('blade'))!;
    expect(PACKS.map((p) => p.name)).toContain(forBlade.source.label);
  });
});
