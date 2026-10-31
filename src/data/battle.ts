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
/** A launch this strong (1 is normal) is a Super Launch. */
export const SUPER_LAUNCH = 1.05;

export interface Fighter {
  attack: number;
  defense: number;
  stamina: number;
  dash: number;
  burst: number;
  weight: number;
  type: BeyType;
}

/** One moment of the battle, about a seventh of a second of real spinning. */
export interface Tick {
  /** How much spin each Bey has left, 0-120ish. */
  energy: [number, number];
  /** The two Beys crashed into each other. */
  hit: boolean;
  /** Who came out on top in the crash: the other one lost more spin. */
  clash?: 0 | 1;
  /** The Bey on the attack right now. It wins most crashes until the other one takes over. */
  momentum: 0 | 1;
  /** A Bey zooming along the rail this moment, if any. */
  dash?: 0 | 1;
}

export interface BattleResult {
  /** 0 or 1, or null for a draw (both stopped together). */
  winner: 0 | 1 | null;
  finish?: Finish;
  /** How hard each Bey was launched, around 1 (0.8 is a weak rip, 1.2 a great one). */
  launch: [number, number];
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

/** Which side's type beats the other's (0 or 1), or null when neither does. */
export function typeEdge(a: BeyType, b: BeyType): 0 | 1 | null {
  if (BEATS[a] === b) return 0;
  if (BEATS[b] === a) return 1;
  return null;
}

/** A repeatable random number source, so tests can replay a battle. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const MAX_TICKS = 160;
/** No knockouts or bursts in the first second or so, so every battle gets some clashing first. */
const WARM_UP_TICKS = 8;

/** How much bigger x is than y, from -1 to 1, with less and less extra for very big gaps. */
const versus = (x: number, y: number) => (x - y) / (x + y + 60);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * A round, moment by moment. Stats tip the odds of every crash, but each crash is its own coin
 * toss and a hard launch can beat better stats, so the lead can swing back and forth and the
 * weaker Bey still wins sometimes. Launch powers come from the players when given (0.9 weak,
 * 1.1 perfect); otherwise each rip lands somewhere in that range at random.
 */
export function simulateBattle(a: Fighter, b: Fighter, random: () => number = Math.random, launchPower?: [number, number]): BattleResult {
  const fighters = [a, b] as const;
  const rip = () => 0.9 + 0.1 * (random() + random());
  const launch: [number, number] = launchPower ? [launchPower[0], launchPower[1]] : [rip(), rip()];
  const energy: [number, number] = [0, 1].map((i) => (100 + (fighters[i].weight - 44) * 0.8) * launch[i]) as [number, number];
  const edge = typeEdge(a.type, b.type);
  // Stamina sets how fast a Bey slows down on its own; a type that beats the other's lasts a bit longer.
  const decay = fighters.map((f, i) => (0.25 + 0.6 * (1 - Math.min(1, f.stamina / 140))) * (edge === i ? 0.92 : 1));
  // How much of the stadium a Bey covers: attackers and dashers roam and cause more crashes.
  const aggression = fighters.map((f) => Math.min(1.1, (f.attack / 150) * 0.6 + (f.dash / 100) * 0.6));
  // Crash strength: mostly attack, some defense, a little weight.
  const clout = fighters.map((f) => f.attack * 0.6 + f.defense * 0.4 + f.weight * 0.5);
  // A harder launch spins faster (more energy above) and hits harder (better odds in every push and crash).
  const ripEdge = launch[0] - launch[1];
  const statOdds = 0.5 + 0.42 * versus(clout[0], clout[1]) + (edge === null ? 0 : edge === 0 ? 0.07 : -0.07) + 0.7 * ripEdge;
  const ticks: Tick[] = [];
  let railBoost: 0 | 1 | undefined;
  // The battle goes in pushes: one Bey takes over for a moment, then the other fights back.
  // Better stats win more pushes; a Bey that has fallen behind gets a small nudge toward the next one.
  let momentum: 0 | 1 = random() < statOdds ? 0 : 1;
  let pushLeft = 5 + Math.floor(random() * 8);

  for (let t = 0; t < MAX_TICKS; t++) {
    if (--pushLeft <= 0) {
      let odds = statOdds;
      if (energy[0] < energy[1] - 8) odds += 0.1;
      if (energy[1] < energy[0] - 8) odds -= 0.1;
      momentum = random() < clamp(odds, 0.2, 0.8) ? 0 : 1;
      pushLeft = 5 + Math.floor(random() * 8);
    }
    const tick: Tick = { energy: [energy[0], energy[1]], hit: false, momentum };
    ticks.push(tick);

    if (random() < 0.18 + 0.2 * Math.max(...aggression) + (t < WARM_UP_TICKS ? 0.15 : 0)) {
      tick.hit = true;
      // The odds that Bey 0 wins this crash: whoever is pushing usually does, stats and a rail dash help.
      let odds = (momentum === 0 ? 0.72 : 0.28) + 0.22 * versus(clout[0], clout[1]) + 0.4 * ripEdge;
      if (railBoost !== undefined) odds += railBoost === 0 ? 0.08 : -0.08;
      odds = clamp(odds, 0.15, 0.85);
      const winner: 0 | 1 = random() < odds ? 0 : 1;
      const loser = (1 - winner) as 0 | 1;
      tick.clash = winner;
      const hitter = fighters[winner];
      const target = fighters[loser];
      // The loser takes the big hit; the winner feels a little of it too.
      const power = (hitter.attack / 150) * 0.7 + (hitter.dash / 100) * 0.5;
      energy[loser] -= (5 + 6 * power) * (0.5 + random()) * (1 - 0.35 * Math.min(1, target.defense / 140));
      energy[winner] -= 0.5 + 1.5 * random();

      if (t >= WARM_UP_TICKS) {
        const tired = energy[loser] < 30 ? 1.7 : 1;
        if (random() < (0.006 + 0.05 * power * (1 - target.burst / 100) ** 1.5) * tired) {
          tick.energy = [Math.max(0, energy[0]), Math.max(0, energy[1])];
          return { winner, finish: 'burst', launch, ticks };
        }
        const knock = clamp(0.012 + 0.07 * (power - 0.45 * Math.min(1, target.defense / 140)) * (hitter.weight / target.weight), 0.006, 0.1) * tired;
        if (random() < knock) {
          const xtreme = hitter.dash >= 25 && random() < hitter.dash / 100 + 0.2;
          if (xtreme) tick.dash = winner;
          tick.energy = [Math.max(0, energy[0]), Math.max(0, energy[1])];
          return { winner, finish: xtreme ? 'xtreme' : 'over', launch, ticks };
        }
      }
      railBoost = undefined;
    } else if (random() < aggression[0] * 0.15) {
      tick.dash = 0;
      railBoost = 0;
    } else if (random() < aggression[1] * 0.15) {
      tick.dash = 1;
      railBoost = 1;
    }

    // Roaming Beys tire as the round goes on, so a Stamina type can come back late.
    // A little wobble too, so evenly matched Beys rarely stop together.
    const late = Math.min(1, t / 60);
    energy[0] -= decay[0] * (0.9 + 0.4 * aggression[0] * late) * (0.7 + 0.6 * random());
    energy[1] -= decay[1] * (0.9 + 0.4 * aggression[1] * late) * (0.7 + 0.6 * random());
    if (energy[0] <= 0 || energy[1] <= 0) {
      tick.energy = [Math.max(0, energy[0]), Math.max(0, energy[1])];
      // Both stopped together: the one that kept a little more spin wins, unless it's truly even.
      if (Math.abs(energy[0] - energy[1]) < 0.5) return { winner: null, launch, ticks };
      return { winner: energy[0] > energy[1] ? 0 : 1, finish: 'spin', launch, ticks };
    }
  }
  // Still spinning after a long time: the one with more spin left wins.
  return { winner: energy[0] >= energy[1] ? 0 : 1, finish: 'spin', launch, ticks };
}
