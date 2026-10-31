import { ART_SHAPES, BEY_TYPES, LINES, SET_KINDS, STATS_SOURCES, type Bey, type Pack, type StatKey } from './types';
import { BIT_STAT_KEYS, PART_STAT_KEYS, STAT_MAX } from './meta';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RATCHET = /^[0-9A-Z]-\d{2}$/;
const BIT_CODE = /^[A-Z][A-Za-z]{0,2}$/;
const DATE = /^\d{4}-\d{2}(-\d{2})?$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Returns a list of problems in the Bey data. An empty list means the data is good. */
export function validateBeys(beys: Bey[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const bey of beys) {
    const at = bey.names?.hasbro ?? bey.names?.takaraTomy ?? bey.id ?? '?';
    const fail = (msg: string) => errors.push(`${at}: ${msg}`);

    if (!ID.test(bey.id ?? '')) fail(`id "${bey.id}" must be lowercase words joined by dashes`);
    if (ids.has(bey.id)) fail(`id "${bey.id}" is used twice`);
    ids.add(bey.id);

    if (!bey.names?.hasbro?.trim() && !bey.names?.takaraTomy?.trim()) fail('needs a hasbro or takaraTomy name');
    if (!LINES.includes(bey.line)) fail(`line "${bey.line}" must be one of ${LINES.join(', ')}`);
    if (!BEY_TYPES.includes(bey.type)) fail(`type "${bey.type}" must be one of ${BEY_TYPES.join(', ')}`);
    if (!SET_KINDS.includes(bey.set)) fail(`set "${bey.set}" must be one of ${SET_KINDS.join(', ')}`);
    if (bey.spin !== 'right' && bey.spin !== 'left') fail(`spin "${bey.spin}" must be right or left`);
    if (bey.released !== undefined && !DATE.test(bey.released)) fail(`released "${bey.released}" should look like 2026-02-12 or 2026-02`);
    if (bey.weight !== undefined && !(bey.weight > 0 && bey.weight < 100)) fail(`weight ${bey.weight} should be in grams`);
    if (bey.packs !== undefined && !(Array.isArray(bey.packs) && bey.packs.length && bey.packs.every((p) => typeof p === 'string' && p.trim()))) {
      fail('packs must be a list of pack names');
    }
    if (!['Starter', 'Booster', 'Random Booster'].includes(bey.set) && !bey.packs?.length) fail(`a ${bey.set} Bey needs the name of its pack in packs`);
    if (bey.price !== undefined && !(bey.price > 0)) fail(`price ${bey.price} should be in dollars`);
    if (bey.blade?.type !== undefined && !BEY_TYPES.includes(bey.blade.type)) fail(`blade type "${bey.blade.type}" is not a type`);

    if (!bey.blade) fail('blade is missing');
    if (bey.blade?.integratedRatchet && bey.ratchet) fail('has a built-in ratchet and a separate one');
    if (!bey.blade?.integratedRatchet && !bey.ratchet) fail('ratchet is missing');
    if (bey.ratchet && !RATCHET.test(bey.ratchet.name ?? '')) fail(`ratchet "${bey.ratchet.name}" should look like 4-70`);
    if (!BIT_CODE.test(bey.bit?.code ?? '')) fail(`bit code "${bey.bit?.code}" should be 1-3 letters starting with a capital`);
    if (!bey.bit?.name?.trim()) fail('bit name is missing');
    if (bey.bit?.type !== undefined && !BEY_TYPES.includes(bey.bit.type)) fail(`bit type "${bey.bit.type}" is not a type`);

    const parts = [
      ['blade', bey.blade, PART_STAT_KEYS],
      ['ratchet', bey.ratchet, PART_STAT_KEYS],
      ['bit', bey.bit, BIT_STAT_KEYS],
    ] as const;
    let hasStats = false;
    for (const [label, part, keys] of parts) {
      if (!part) continue;
      if (part.weight !== undefined && !(part.weight > 0 && part.weight < 100)) {
        fail(`${label} weight ${part.weight} should be in grams, between 0 and 100`);
      }
      if (part.stats === undefined) continue;
      hasStats = true;
      const stats = part.stats as Partial<Record<StatKey, unknown>>;
      for (const key of keys) {
        const value = stats[key];
        // Boxes print whole numbers, and sometimes halves like 8.5.
        if (typeof value !== 'number' || !Number.isInteger(value * 2) || value < 0 || value > STAT_MAX[label]) {
          fail(`${label} ${key} must be a number from 0 to ${STAT_MAX[label]}, in steps of 0.5`);
        }
      }
    }
    if (hasStats && !STATS_SOURCES.includes(bey.statsFrom as never)) fail(`statsFrom must be ${STATS_SOURCES.join(' or ')}`);

    if (!ART_SHAPES.includes(bey.art?.shape)) fail(`art shape must be one of ${ART_SHAPES.join(', ')}`);
    if (!(Number.isInteger(bey.art?.blades) && bey.art.blades >= 2 && bey.art.blades <= 8)) fail('art blades must be 2 to 8');
    if (!HEX.test(bey.art?.accent ?? '')) fail(`art accent "${bey.art?.accent}" must be a color like #FFC24B`);
  }

  return errors;
}

/** Checks that packs and Beys point at each other correctly. */
export function validatePacks(packs: Pack[], beys: Bey[]): string[] {
  const errors: string[] = [];
  const ids = new Set(beys.map((bey) => bey.id));
  const names = new Set(packs.map((pack) => pack.name));
  for (const pack of packs) {
    if (!SET_KINDS.includes(pack.set)) errors.push(`${pack.name}: set "${pack.set}" is not a set kind`);
    if (!pack.beys.length) errors.push(`${pack.name}: has no Beys`);
    for (const id of pack.beys) if (!ids.has(id)) errors.push(`${pack.name}: Bey "${id}" is not in beys.json`);
    if (pack.price !== undefined && !(pack.price > 0)) errors.push(`${pack.name}: price ${pack.price} should be in dollars`);
  }
  for (const bey of beys) {
    for (const name of bey.packs ?? []) {
      if (!names.has(name)) errors.push(`${bey.id}: pack "${name}" is not in packs.json`);
      else if (!packs.find((pack) => pack.name === name)?.beys.includes(bey.id)) errors.push(`${bey.id}: pack "${name}" does not list it`);
    }
  }
  return errors;
}
