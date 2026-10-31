// A pretend battle between two Beys, worked out from their real stats so the result feels fair:
// Attack and Dash make hits land, Defense softens them, Stamina keeps a Bey spinning, Burst
// resistance keeps it in one piece, and weight adds momentum. Types follow the classic triangle:
// Attack beats Stamina, Stamina beats Defense, Defense beats Attack.

import { totalWeight } from '.';
import type { Bey, BeyType } from './types';

export type Finish = 'spin' | 'over' | 'burst' | 'xtreme';

/** Points for each finish, as in official Beyblade X matches. */
export const FINISH_POINTS: Record<Finish, number> = { spin: 1, over: 2, burst: 2, xtreme: 3 };
export const FINISH_LABELS: Record<Finish, string> = { spin: 'Spin Finish', over: 'Over Finish', burst: 'Burst Finish', xtreme: 'Xtreme Finish' };
/** A match is first to this many points. */
export const POINTS_TO_WIN = 4;

export interface Fighter {
  attack: number;
  defense: number;
  stamina: number;
  dash: number;
  burst: number;
  weight: number;
  type: BeyType;
}

/** One moment of the battle, about a quarter of a second of real spinning. */
export interface Tick {
  /** How much spin each Bey has left, 0-100+. */
  energy: [number, number];
  /** The two Beys crashed into each other. */
  hit: boolean;
  /** A Bey zooming along the rail this moment, if any. */
  dash?: 0 | 1;
}

export interface BattleResult {
  /** 0 or 1, or null for a draw (both stopped together). */
  winner: 0 | 1 | null;
  finish?: Finish;
  ticks: Tick[];
}

const BEATS: Record<BeyType, BeyType | undefined> = { attack: 'stamina', stamina: 'defense', defense: 'attack', balance: undefined };

/** Battle numbers from a Bey's three parts. Missing stats count as middling. */
export function fighterFrom(bey: Bey): Fighter {
  const parts = [bey.blade.stats, bey.ratchet?.stats, bey.bit.stats];
  const sum = (key: 'attack' | 'defense' | 'stamina') => parts.reduce((total, stats) => total + (stats ? stats[key] : 15), 0);
  return {
    attack: sum('attack'),
    defense: sum('defense'),
    stamina: sum('stamina'),
    dash: bey.bit.stats?.dash ?? 20,
    burst: bey.bit.stats?.burstResistance ?? 40,
    weight: totalWeight(bey) ?? 44,
    type: bey.type,
  };
}

function advantage(me: Fighter, them: Fighter): number {
  return BEATS[me.type] === them.type ? 1.2 : 1;
}

/** A repeatable random number source, so tests can replay a battle. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const MAX_TICKS = 140;
/** No knockouts or bursts in the first couple of seconds, so every battle gets some clashing first. */
const WARM_UP_TICKS = 10;

export function simulateBattle(a: Fighter, b: Fighter, random: () => number = Math.random): BattleResult {
  const fighters = [a, b] as const;
  const norm = (value: number) => Math.min(1.3, value / 150);
  const energy: [number, number] = [100 + (a.weight - 44) * 1.5, 100 + (b.weight - 44) * 1.5];
  const decay = fighters.map((f, i) => (0.9 + 1.4 * (1 - norm(f.stamina))) / advantage(f, fighters[1 - i]));
  const aggression = fighters.map((f) => norm(f.attack) * 0.6 + (f.dash / 100) * 0.6);
  const ticks: Tick[] = [];

  for (let t = 0; t < MAX_TICKS; t++) {
    const tick: Tick = { energy: [energy[0], energy[1]], hit: false };
    ticks.push(tick);

    if (random() < 0.06 + 0.14 * Math.max(...aggression) + (t < WARM_UP_TICKS ? 0.15 : 0)) {
      tick.hit = true;
      const power = fighters.map((f, i) => (norm(f.attack) + f.dash / 200) * advantage(f, fighters[1 - i]) * (0.7 + 0.6 * random()));
      for (const i of [0, 1] as const) {
        const them = (1 - i) as 0 | 1;
        energy[them] -= 3 + 8 * power[i] * (1 - 0.6 * Math.min(1, norm(fighters[them].defense)));
      }
      // Check who gets knocked out or burst, in a random order so neither side always goes first.
      const order: (0 | 1)[] = t < WARM_UP_TICKS ? [] : random() < 0.5 ? [0, 1] : [1, 0];
      for (const i of order) {
        const them = (1 - i) as 0 | 1;
        const hitter = fighters[i];
        const target = fighters[them];
        const tired = energy[them] < 40 ? 1.6 : 1;
        if (random() < (0.005 + 0.08 * power[i] * (1 - target.burst / 100) ** 1.5) * tired) {
          tick.energy = [energy[0], energy[1]];
          return { winner: i, finish: 'burst', ticks };
        }
        const knock = 0.005 + 0.12 * Math.max(0, power[i] - norm(target.defense) * 0.8) * (hitter.weight / target.weight);
        if (random() < knock) {
          const xtreme = hitter.dash >= 30 && random() < hitter.dash / 100 + 0.15;
          if (xtreme) tick.dash = i;
          tick.energy = [energy[0], energy[1]];
          return { winner: i, finish: xtreme ? 'xtreme' : 'over', ticks };
        }
      }
    } else if (random() < aggression[0] * 0.15) {
      tick.dash = 0;
    } else if (random() < aggression[1] * 0.15) {
      tick.dash = 1;
    }

    // A little wobble in how fast each Bey slows down, so evenly matched Beys rarely stop together.
    energy[0] -= decay[0] * (0.7 + 0.6 * random());
    energy[1] -= decay[1] * (0.7 + 0.6 * random());
    if (energy[0] <= 0 || energy[1] <= 0) {
      tick.energy = [Math.max(0, energy[0]), Math.max(0, energy[1])];
      // Both stopped together: the one that kept a little more spin wins, unless it's truly even.
      if (Math.abs(energy[0] - energy[1]) < 0.5) return { winner: null, ticks };
      return { winner: energy[0] > energy[1] ? 0 : 1, finish: 'spin', ticks };
    }
  }
  // Still spinning after a long time: the one with more spin left wins.
  return { winner: energy[0] >= energy[1] ? 0 : 1, finish: 'spin', ticks };
}
