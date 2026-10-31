import raw from './beys.json';
import rawPacks from './packs.json';
import type { Bey, Pack, PartKey, SetKind } from './types';
import { HEIGHT_STEPS } from './meta';

/** The name kids see first: the Hasbro name when there is one. */
export function displayName(bey: Bey): string {
  return bey.names.hasbro ?? bey.names.takaraTomy ?? bey.id;
}

/** The same Bey's name on the other brand's boxes, when both are known. */
export function otherName(bey: Bey): string | undefined {
  return bey.names.hasbro ? bey.names.takaraTomy : undefined;
}

/** Every Bey, newest first; ones without a release date go last. */
export const BEYS: Bey[] = (raw as Bey[])
  .slice()
  .sort((a, b) => (b.released ?? '').localeCompare(a.released ?? '') || displayName(a).localeCompare(displayName(b)));

export function findBey(id: string): Bey | undefined {
  return BEYS.find((bey) => bey.id === id);
}

/** Packs and sets that hold more than one Bey or come with extras. */
export const PACKS: Pack[] = rawPacks as Pack[];

/** Ways a Bey is sold on its own. */
export const SINGLE_SETS: SetKind[] = ['Starter', 'Booster', 'Random Booster'];

/** The parts shown on the box, in order. Beys with a built-in ratchet have no ratchet panel. */
export function partsOf(bey: Bey): PartKey[] {
  return bey.ratchet ? ['blade', 'ratchet', 'bit'] : ['blade', 'bit'];
}

/** The combo as printed on the box, e.g. "4-70LF", or just "FB" when the ratchet is built in. */
export function comboName(bey: Bey): string {
  return `${bey.ratchet?.name ?? ''}${bey.bit.code}`;
}

/**
 * Reads a ratchet code like "4-70": 4 points, 7.0 mm tall, shown as 70 on the box.
 * Special ratchets have a letter instead of a number of points, like "M-85".
 */
export function parseRatchet(name: string): { points?: number; height: number } {
  const match = /^([0-9A-Z])-(\d+)$/.exec(name);
  if (!match) return { height: 0 };
  const points = Number(match[1]);
  return { points: Number.isNaN(points) ? undefined : points, height: Number(match[2]) };
}

/** True for Beys that only come inside a pack or set. */
export function packOnly(bey: Bey): boolean {
  return !SINGLE_SETS.includes(bey.set);
}

/** Which of the 5 height blocks lights up (1-5). */
export function heightStep(height: number): number {
  let best = 0;
  HEIGHT_STEPS.forEach((step, i) => {
    if (Math.abs(step - height) < Math.abs(HEIGHT_STEPS[best] - height)) best = i;
  });
  return best + 1;
}

/** Total weight in grams: the Bey's own weight, or its parts added up when all are known. */
export function totalWeight(bey: Bey): number | undefined {
  if (bey.weight !== undefined) return bey.weight;
  const weights = [bey.blade.weight, bey.ratchet?.weight ?? (bey.ratchet ? undefined : 0), bey.bit.weight];
  if (weights.some((w) => w === undefined)) return undefined;
  return weights.reduce<number>((sum, w) => sum + (w ?? 0), 0);
}

const NEW_FOR_DAYS = 90;

/** "soon" before the release date, "new" for 90 days after it. */
export function releaseStatus(bey: Bey, today = new Date()): 'soon' | 'new' | undefined {
  if (!bey.released) return undefined;
  const [y, m, d] = bey.released.split('-').map(Number);
  const released = new Date(y, m - 1, d ?? 1);
  const days = (today.getTime() - released.getTime()) / 86_400_000;
  if (days < 0) return 'soon';
  if (days <= NEW_FOR_DAYS) return 'new';
  return undefined;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-02-12" -> "Feb 2026". */
export function releaseLabel(released: string): string {
  const [y, m] = released.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
