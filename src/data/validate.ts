import { ART_SHAPES, BEY_TYPES, SET_KINDS, type Bey, type StatKey } from './types';
import { BIT_INFO, BIT_STAT_KEYS, PART_STAT_KEYS, STAT_MAX } from './meta';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CODE = /^(BX|UX|CX)-\d{2,3}$/;
const RATCHET = /^\d-\d{2}$/;
const BIT_CODE = /^[A-Z]{1,3}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Returns a list of problems in the Bey data. An empty list means the data is good. */
export function validateBeys(beys: Bey[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const codes = new Set<string>();

  for (const bey of beys) {
    const at = `${bey.code ?? '?'} ${bey.name ?? bey.id ?? '?'}`;
    const fail = (msg: string) => errors.push(`${at}: ${msg}`);

    if (!ID.test(bey.id ?? '')) fail(`id "${bey.id}" must be lowercase words joined by dashes`);
    if (ids.has(bey.id)) fail(`id "${bey.id}" is used twice`);
    ids.add(bey.id);

    if (!CODE.test(bey.code ?? '')) fail(`code "${bey.code}" should look like BX-01`);
    if (codes.has(bey.code)) fail(`code "${bey.code}" is used twice`);
    codes.add(bey.code);

    if (!bey.name?.trim()) fail('name is missing');
    if (!BEY_TYPES.includes(bey.type)) fail(`type "${bey.type}" must be one of ${BEY_TYPES.join(', ')}`);
    if (!SET_KINDS.includes(bey.set)) fail(`set "${bey.set}" must be one of ${SET_KINDS.join(', ')}`);
    if (bey.spin !== 'right' && bey.spin !== 'left') fail(`spin "${bey.spin}" must be right or left`);

    if (!bey.blade?.name?.trim()) fail('blade name is missing');
    if (!RATCHET.test(bey.ratchet?.name ?? '')) fail(`ratchet "${bey.ratchet?.name}" should look like 3-60`);
    if (!BIT_CODE.test(bey.bit?.code ?? '')) fail(`bit code "${bey.bit?.code}" should be 1-3 capital letters`);
    else if (!BIT_INFO[bey.bit.code]) fail(`bit "${bey.bit.code}" needs a description in BIT_INFO (src/data/meta.ts)`);
    if (!bey.bit?.name?.trim()) fail('bit name is missing');

    const parts = [
      ['blade', bey.blade, PART_STAT_KEYS],
      ['ratchet', bey.ratchet, PART_STAT_KEYS],
      ['bit', bey.bit, BIT_STAT_KEYS],
    ] as const;
    for (const [label, part, keys] of parts) {
      if (!part) continue;
      if (part.weight !== undefined && !(part.weight > 0 && part.weight < 100)) {
        fail(`${label} weight ${part.weight} should be in grams, between 0 and 100`);
      }
      if (part.stats === undefined) continue;
      const stats = part.stats as Partial<Record<StatKey, unknown>>;
      for (const key of keys) {
        const value = stats[key];
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > STAT_MAX) {
          fail(`${label} ${key} must be a whole number from 0 to ${STAT_MAX}`);
        }
      }
    }

    if (!ART_SHAPES.includes(bey.art?.shape)) fail(`art shape must be one of ${ART_SHAPES.join(', ')}`);
    if (!(Number.isInteger(bey.art?.blades) && bey.art.blades >= 2 && bey.art.blades <= 8)) fail('art blades must be 2 to 8');
    if (!HEX.test(bey.art?.accent ?? '')) fail(`art accent "${bey.art?.accent}" must be a color like #FFC24B`);
  }

  return errors;
}
