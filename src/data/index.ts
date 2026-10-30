import raw from './beys.json';
import type { Bey } from './types';

const LINE_ORDER = ['BX', 'UX', 'CX'];

function codeOrder(code: string): number {
  const [line, number] = code.split('-');
  return LINE_ORDER.indexOf(line) * 1000 + Number(number);
}

/** Every Bey, in product-code order: BX, then UX, then CX. */
export const BEYS: Bey[] = (raw as Bey[]).slice().sort((a, b) => codeOrder(a.code) - codeOrder(b.code));

export function findBey(id: string): Bey | undefined {
  return BEYS.find((bey) => bey.id === id);
}

/** The combo as printed on the box, e.g. "3-60F". */
export function comboName(bey: Bey): string {
  return `${bey.ratchet.name}${bey.bit.code}`;
}

/** Reads a ratchet code like "3-60": 3 points, 6.0 mm tall. */
export function parseRatchet(name: string): { points: number; heightMm: number } {
  const match = /^(\d+)-(\d+)$/.exec(name);
  if (!match) return { points: 0, heightMm: 0 };
  return { points: Number(match[1]), heightMm: Number(match[2]) / 10 };
}

/** Total weight in grams, or undefined until every part's weight is known. */
export function totalWeight(bey: Bey): number | undefined {
  const weights = [bey.blade.weight, bey.ratchet.weight, bey.bit.weight];
  if (weights.some((w) => w === undefined)) return undefined;
  return weights.reduce<number>((sum, w) => sum + (w ?? 0), 0);
}
