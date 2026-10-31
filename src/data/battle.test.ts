import { describe, expect, it } from 'vitest';
import { FINISH_POINTS, fighterFrom, seededRandom, simulateBattle, typeEdge, type Fighter } from './battle';
import { badges } from './badges';
import { BEYS, findBey } from '.';

const base: Fighter = { attack: 80, defense: 80, stamina: 80, dash: 20, burst: 50, weight: 44, type: 'balance' };

function winRate(a: Fighter, b: Fighter, rounds = 400): number {
  const random = seededRandom(7);
  let wins = 0;
  for (let i = 0; i < rounds; i++) if (simulateBattle(a, b, random).winner === 0) wins++;
  return wins / rounds;
}

describe('battle simulation', () => {
  it('knows which type has the edge', () => {
    expect(typeEdge('attack', 'stamina')).toBe(0);
    expect(typeEdge('stamina', 'defense')).toBe(0);
    expect(typeEdge('attack', 'defense')).toBe(1);
    expect(typeEdge('balance', 'attack')).toBeNull();
    expect(typeEdge('attack', 'attack')).toBeNull();
  });

  it('always ends, with a finish for the winner', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 200; i++) {
      const result = simulateBattle(base, { ...base, type: 'attack', attack: 140 }, random);
      expect(result.ticks.length).toBeGreaterThan(0);
      expect(result.ticks.length).toBeLessThanOrEqual(140);
      if (result.winner !== null) expect(Object.keys(FINISH_POINTS)).toContain(result.finish);
    }
  });

  it('replays the same battle from the same seed', () => {
    const a = simulateBattle(base, { ...base, attack: 120 }, seededRandom(42));
    const b = simulateBattle(base, { ...base, attack: 120 }, seededRandom(42));
    expect(a).toEqual(b);
  });

  it('is fair between two identical Beys', () => {
    const rate = winRate(base, base);
    expect(rate).toBeGreaterThan(0.35);
    expect(rate).toBeLessThan(0.65);
  });

  it('lets stronger stats win more often', () => {
    expect(winRate({ ...base, attack: 140, dash: 40 }, { ...base, attack: 30, defense: 30 })).toBeGreaterThan(0.6);
    expect(winRate({ ...base, stamina: 150 }, { ...base, stamina: 30 })).toBeGreaterThan(0.6);
  });

  it('gives the weaker Bey a real chance, even against the strongest', () => {
    const fighters = BEYS.map(fighterFrom);
    const power = (f: Fighter) => f.attack + f.defense + f.stamina;
    const strongest = fighters.reduce((best, f) => (power(f) > power(best) ? f : best));
    const weakest = fighters.reduce((worst, f) => (power(f) < power(worst) ? f : worst));
    const rate = winRate(strongest, weakest, 1000);
    expect(rate).toBeGreaterThan(0.6);
    expect(rate).toBeLessThan(0.9);
  });

  it('swings back and forth: the winner is often behind at some point', () => {
    const random = seededRandom(3);
    let comebacks = 0;
    let decided = 0;
    for (let i = 0; i < 600; i++) {
      const { winner, ticks } = simulateBattle(base, { ...base, attack: 100, type: 'attack' }, random);
      if (winner === null) continue;
      decided++;
      if (ticks.some((t) => t.energy[1 - winner] - t.energy[winner] >= 8)) comebacks++;
    }
    expect(comebacks / decided).toBeGreaterThan(0.35);
  });

  it('launches each Bey with a little more or less power every round', () => {
    const random = seededRandom(5);
    const launches = Array.from({ length: 200 }, () => simulateBattle(base, base, random).launch).flat();
    expect(Math.min(...launches)).toBeGreaterThanOrEqual(0.9);
    expect(Math.max(...launches)).toBeLessThanOrEqual(1.1);
    expect(new Set(launches.map((l) => l.toFixed(2))).size).toBeGreaterThan(10);
  });

  it('gives Attack an edge over Stamina', () => {
    const plain = winRate({ ...base, type: 'balance' }, { ...base, type: 'balance' });
    const typed = winRate({ ...base, type: 'attack' }, { ...base, type: 'stamina' });
    expect(typed).toBeGreaterThan(plain);
  });

  it('reads battle numbers from a real Bey', () => {
    const fighter = fighterFrom(findBey('rudder-phoenix-4-70lf')!);
    expect(fighter).toMatchObject({ attack: 15 + 11 + 45, defense: 40 + 12 + 5, stamina: 60 + 7 + 10, dash: 40, burst: 80, type: 'attack' });
  });
});

describe('badges', () => {
  it('starts with none and earns them from the collection', () => {
    expect(badges({ mine: [], builds: 0, matches: 0 }).filter((b) => b.earned)).toEqual([]);
    const mine = ['sword-dran-3-60f', 'buster-dran-1-60a', 'dagger-dran-4-70q', 'cobalt-dragoon-2-60c'].map((id) => findBey(id)!);
    const earned = badges({ mine, builds: 1, matches: 1 }).filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first', 'family-dran', 'left', 'pack', 'builder', 'battler']));
    expect(earned).not.toContain('champion');
  });

  it('has a unique id for every badge', () => {
    const all = badges({ mine: BEYS, builds: 5, matches: 20 });
    expect(new Set(all.map((b) => b.id)).size).toBe(all.length);
    expect(all.every((b) => b.earned)).toBe(true);
  });
});
