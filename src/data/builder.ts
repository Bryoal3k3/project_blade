// Build-your-own Bey: every Blade, Ratchet and Bit Hasbro sells, how they add up when fused,
// and the fewest boxes to buy to get them. All Beyblade X parts fit together: any blade takes
// any ratchet and any bit, and a Ratchet-Integrated Blade takes just a bit.

import { BEYS, PACKS, SINGLE_SETS, comboName, displayName, findBey, parseRatchet, releaseStatus } from '.';
import type { Bey, BeyType, Bit, Blade, PartKey, PartStats, Ratchet, SetKind } from './types';

export interface BladeOption {
  key: string;
  name: string;
  line: Bey['line'];
  type: BeyType;
  blade: Blade;
  /** A Bey with this blade whose photo shows it. */
  picture: Bey;
  sources: Bey[];
}

export interface RatchetOption {
  key: string;
  ratchet: Ratchet;
  sources: Bey[];
}

export interface BitOption {
  key: string;
  bit: Bit;
  sources: Bey[];
}

export const bladeKey = (bey: Bey) => `${bey.line}|${displayName(bey)}`;

/** Numbers read from a Hasbro box first, then any Bey that has stats for the part. */
function bestSource(sources: Bey[], has: (bey: Bey) => boolean): Bey {
  return sources.find((bey) => has(bey) && bey.statsFrom === 'Hasbro box') ?? sources.find(has) ?? sources[0];
}

function groupBy(key: (bey: Bey) => string | undefined): Map<string, Bey[]> {
  const groups = new Map<string, Bey[]>();
  for (const bey of BEYS) {
    const k = key(bey);
    if (k === undefined) continue;
    groups.set(k, [...(groups.get(k) ?? []), bey]);
  }
  return groups;
}

/** Every blade, newest first. */
export const BLADE_OPTIONS: BladeOption[] = [...groupBy(bladeKey)].map(([key, sources]) => {
  const best = bestSource(sources, (bey) => Boolean(bey.blade.stats));
  const picture = sources.find((bey) => bey.photoSpins) ?? sources[0];
  return { key, name: displayName(best), line: best.line, type: best.blade.type ?? best.type, blade: best.blade, picture, sources };
});

/** Every ratchet, shortest first. */
export const RATCHET_OPTIONS: RatchetOption[] = [...groupBy((bey) => bey.ratchet?.name)]
  .map(([key, sources]) => {
    const best = bestSource(sources, (bey) => Boolean(bey.ratchet?.stats));
    const photo = sources.find((bey) => bey.ratchet?.photo)?.ratchet?.photo;
    return { key, ratchet: { ...best.ratchet!, ...(photo ? { photo } : {}) }, sources };
  })
  .sort((a, b) => {
    const ra = parseRatchet(a.key);
    const rb = parseRatchet(b.key);
    return ra.height - rb.height || (ra.points ?? 99) - (rb.points ?? 99);
  });

/** Every bit, by name. */
export const BIT_OPTIONS: BitOption[] = [...groupBy((bey) => bey.bit.code)]
  .map(([key, sources]) => {
    const best = bestSource(sources, (bey) => Boolean(bey.bit.stats));
    const photo = sources.find((bey) => bey.bit.photo)?.bit.photo;
    return { key, bit: { ...best.bit, ...(photo ? { photo } : {}) }, sources };
  })
  .sort((a, b) => a.bit.name.localeCompare(b.bit.name));

export interface Choice {
  blade: BladeOption;
  ratchet?: RatchetOption;
  bit: BitOption;
}

/** The parts a choice needs: no ratchet when the blade has one built in. */
export function neededParts(choice: { blade: BladeOption }): PartKey[] {
  return choice.blade.blade.integratedRatchet ? ['blade', 'bit'] : ['blade', 'ratchet', 'bit'];
}

/** Attack, Defense and Stamina added up across the parts; complete is false while a part has no stats yet. */
export function fusedTotals(choice: Choice): PartStats & { complete: boolean } {
  const parts: (PartStats | undefined)[] = [choice.blade.blade.stats, choice.bit.bit.stats];
  if (!choice.blade.blade.integratedRatchet) parts.push(choice.ratchet?.ratchet.stats);
  const totals = { attack: 0, defense: 0, stamina: 0, complete: parts.every(Boolean) };
  for (const stats of parts) {
    if (!stats) continue;
    totals.attack += stats.attack;
    totals.defense += stats.defense;
    totals.stamina += stats.stamina;
  }
  return totals;
}

/** The biggest total decides the type; when the top two are within 10% it is Balance. */
export function fusedType(totals: PartStats): BeyType {
  const ranked = (['attack', 'defense', 'stamina'] as const).map((k) => [k, totals[k]] as const).sort((a, b) => b[1] - a[1]);
  const [[top, high], [, next]] = ranked;
  if (high === 0 || (high - next) / high < 0.1) return 'balance';
  return top;
}

/** The new Bey, shaped like a real one so its page can reuse the same panels. */
export function fusedBey(choice: Choice): Bey {
  const base = choice.blade.picture;
  const integrated = Boolean(choice.blade.blade.integratedRatchet);
  return {
    ...base,
    names: { hasbro: choice.blade.name },
    type: fusedType(fusedTotals(choice)),
    blade: choice.blade.blade,
    ratchet: integrated ? undefined : choice.ratchet?.ratchet,
    bit: choice.bit.bit,
    packs: undefined,
    price: undefined,
    released: undefined,
    weight: undefined,
    productCode: undefined,
  };
}

export interface Source {
  id: string;
  label: string;
  kind: 'have' | 'buy';
  set: SetKind;
  price?: number;
  released?: string;
  beys: Bey[];
}

export interface ShoppingItem {
  source: Source;
  /** The parts this item gives you. */
  gives: PartKey[];
  /** The Bey inside it that gives them, for its picture and link. */
  bey: Bey;
}

function provides(bey: Bey, part: PartKey, choice: Choice): boolean {
  if (part === 'blade') return bladeKey(bey) === choice.blade.key;
  if (part === 'ratchet') return bey.ratchet?.name === choice.ratchet?.key;
  return bey.bit.code === choice.bit.key;
}

const label = (bey: Bey) => `${displayName(bey)} ${comboName(bey)}`;

/** Everything that could give a part: Beys you already have, Beys sold on their own, and packs. */
function allSources(owned: string[]): Source[] {
  const have = owned.flatMap((id) => {
    const bey = findBey(id);
    return bey ? [{ id: `have:${id}`, label: label(bey), kind: 'have' as const, set: bey.set, beys: [bey] }] : [];
  });
  const singles = BEYS.filter((bey) => SINGLE_SETS.includes(bey.set)).map((bey) => ({
    id: bey.id,
    label: label(bey),
    kind: 'buy' as const,
    set: bey.set,
    price: bey.price,
    released: bey.released,
    beys: [bey],
  }));
  const packs = PACKS.map((pack) => ({
    id: `pack:${pack.name}`,
    label: pack.name,
    kind: 'buy' as const,
    set: pack.set,
    price: pack.price,
    released: pack.released,
    beys: pack.beys.flatMap((id) => findBey(id) ?? []),
  }));
  return [...have, ...singles, ...packs];
}

/** A price to compare with when the real one isn't known. */
const GUESSED_PRICE = 30;

/**
 * The fewest boxes to buy for a choice, skipping parts from Beys you already have.
 * Ties go to the one not still coming soon, then the cheapest, then the newest.
 */
export function shoppingList(choice: Choice, owned: string[] = [], today = new Date()): ShoppingItem[] {
  const needed = neededParts(choice);
  const candidates = allSources(owned)
    .map((source) => ({ source, gives: needed.filter((part) => source.beys.some((bey) => provides(bey, part, choice))) }))
    .filter((c) => c.gives.length);

  type Candidate = (typeof candidates)[number];
  const score = (combo: Candidate[]) => {
    const buys = combo.filter((c) => c.source.kind === 'buy');
    const soon = buys.filter((c) => c.source.beys.every((bey) => releaseStatus(bey, today) === 'soon')).length;
    const price = buys.reduce((sum, c) => sum + (c.source.price ?? GUESSED_PRICE), 0);
    const oldest = buys.map((c) => c.source.released ?? '0000').sort()[0] ?? '9999';
    return [buys.length, soon, price, oldest] as const;
  };
  const better = (a: ReturnType<typeof score>, b: ReturnType<typeof score>) =>
    a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || b[3].localeCompare(a[3]);

  let best: Candidate[] | undefined;
  let bestScore: ReturnType<typeof score> | undefined;
  const consider = (combo: Candidate[]) => {
    const covered = new Set(combo.flatMap((c) => c.gives));
    if (!needed.every((part) => covered.has(part))) return;
    const s = score(combo);
    if (!bestScore || better(s, bestScore) < 0) {
      best = combo;
      bestScore = s;
    }
  };
  const n = candidates.length;
  for (let i = 0; i < n; i++) {
    consider([candidates[i]]);
    for (let j = i + 1; j < n; j++) {
      consider([candidates[i], candidates[j]]);
      if (needed.length < 3) continue;
      for (let k = j + 1; k < n; k++) consider([candidates[i], candidates[j], candidates[k]]);
    }
  }
  if (!best) return [];

  // Each part comes from one item, preferring Beys you already have.
  const ordered = [...best].sort((a, b) => Number(a.source.kind === 'buy') - Number(b.source.kind === 'buy'));
  const items: ShoppingItem[] = [];
  for (const part of needed) {
    const from = ordered.find((c) => c.gives.includes(part))!;
    const item = items.find((it) => it.source.id === from.source.id);
    if (item) item.gives.push(part);
    else items.push({ source: from.source, gives: [part], bey: from.source.beys.find((bey) => provides(bey, part, choice))! });
  }
  return items;
}

export function findOption<T extends { key: string }>(options: T[], key: string | undefined): T | undefined {
  return key === undefined ? undefined : options.find((option) => option.key === key);
}

/** The parts behind saved picks, or undefined if one of them no longer exists. */
export function choiceFromPicks(picks: Partial<Record<PartKey, string>>): Choice | undefined {
  const blade = findOption(BLADE_OPTIONS, picks.blade);
  const bit = findOption(BIT_OPTIONS, picks.bit);
  if (!blade || !bit) return undefined;
  const ratchet = findOption(RATCHET_OPTIONS, picks.ratchet);
  if (!blade.blade.integratedRatchet && !ratchet) return undefined;
  return { blade, ratchet, bit };
}
