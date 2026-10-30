import raw from './beys.json';
import { LINES, type Bey } from './types';
import { HEIGHT_STEPS } from './meta';

/** The name kids see first: the Hasbro name when there is one. */
export function displayName(bey: Bey): string {
  return bey.names.hasbro ?? bey.names.takaraTomy ?? bey.id;
}

/** The same Bey's name on the other brand's boxes, when both are known. */
export function otherName(bey: Bey): string | undefined {
  return bey.names.hasbro ? bey.names.takaraTomy : undefined;
}

function sortKey(bey: Bey): number {
  const number = bey.code ? Number(bey.code.split('-')[1]) : 999;
  return LINES.indexOf(bey.line) * 1000 + number;
}

/** Every Bey: BX, then UX, then CX; numbered ones first, then by name. */
export const BEYS: Bey[] = (raw as Bey[])
  .slice()
  .sort((a, b) => sortKey(a) - sortKey(b) || displayName(a).localeCompare(displayName(b)));

export function findBey(id: string): Bey | undefined {
  return BEYS.find((bey) => bey.id === id);
}

/** The combo as printed on the box, e.g. "4-70LF". */
export function comboName(bey: Bey): string {
  return `${bey.ratchet.name}${bey.bit.code}`;
}

/** Reads a ratchet code like "4-70": 4 points, 7.0 mm tall, shown as 70 on the box. */
export function parseRatchet(name: string): { points: number; height: number } {
  const match = /^(\d+)-(\d+)$/.exec(name);
  if (!match) return { points: 0, height: 0 };
  return { points: Number(match[1]), height: Number(match[2]) };
}

/** Which of the 5 height blocks lights up (1-5). */
export function heightStep(height: number): number {
  let best = 0;
  HEIGHT_STEPS.forEach((step, i) => {
    if (Math.abs(step - height) < Math.abs(HEIGHT_STEPS[best] - height)) best = i;
  });
  return best + 1;
}

/** Total weight in grams, or undefined until every part's weight is known. */
export function totalWeight(bey: Bey): number | undefined {
  const weights = [bey.blade.weight, bey.ratchet.weight, bey.bit.weight];
  if (weights.some((w) => w === undefined)) return undefined;
  return weights.reduce<number>((sum, w) => sum + (w ?? 0), 0);
}
