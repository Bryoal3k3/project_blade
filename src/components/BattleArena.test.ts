import { describe, expect, it } from 'vitest';
import { battlePath } from './BattleArena';
import { findBey } from '../data';
import type { BattleResult, Tick } from '../data/battle';
import type { Bey } from '../data/types';

const beys = [findBey('rudder-phoenix-4-70lf')!, findBey('cobalt-dragoon-2-60c')!] as [Bey, Bey];
const tick = (energy: [number, number], extra: Partial<Tick> = {}): Tick => ({ energy, hit: false, momentum: 0, ...extra });

describe('battle path', () => {
  it('calls a comeback when the Bey that was behind takes the lead', () => {
    const result: BattleResult = {
      winner: 1,
      finish: 'spin',
      launch: [1, 1],
      ticks: [tick([100, 100]), tick([90, 80]), tick([80, 85], { hit: true, clash: 1 }), tick([60, 80])],
    };
    expect(battlePath(beys, result).map((s) => s.comeback)).toEqual([undefined, undefined, 1, undefined]);
  });

  it('knocks the loser of a crash back toward the rim', () => {
    const calm: BattleResult = { winner: 0, finish: 'spin', launch: [1, 1], ticks: [tick([100, 100]), tick([95, 95])] };
    const crash: BattleResult = { ...calm, ticks: [tick([100, 100], { hit: true, clash: 0 }), tick([95, 85])] };
    const reach = (r: BattleResult) => Math.hypot(...battlePath(beys, r)[1].at[1]);
    expect(reach(crash)).toBeGreaterThan(reach(calm));
  });
});
