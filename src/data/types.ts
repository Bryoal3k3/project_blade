export const BEY_TYPES = ['attack', 'defense', 'stamina', 'balance'] as const;
export type BeyType = (typeof BEY_TYPES)[number];

export const SET_KINDS = ['Starter', 'Booster', 'Random Booster', 'Deck Set'] as const;
export type SetKind = (typeof SET_KINDS)[number];

export const ART_SHAPES = ['blade', 'round', 'wall', 'wing'] as const;
export type ArtShape = (typeof ART_SHAPES)[number];

/** Stats for one part, on the same scale the box uses. */
export interface PartStats {
  attack: number;
  defense: number;
  stamina: number;
}

/** Bits also carry Dash and Burst resistance. */
export interface BitStats extends PartStats {
  dash: number;
  burstResistance: number;
}

export type StatKey = keyof BitStats;

export interface Part<S extends PartStats> {
  name: string;
  /** Grams, from the box. Leave out until checked. */
  weight?: number;
  /** Leave out until the numbers are copied from the box. */
  stats?: S;
}

export interface Bit extends Part<BitStats> {
  /** Letters at the end of the combo, e.g. "F" or "HN". */
  code: string;
}

/** Settings for the drawn stand-in picture shown until a real photo is added. */
export interface BeyArt {
  shape: ArtShape;
  blades: number;
  accent: string;
}

export interface Bey {
  /** URL-safe id. Also the file name of the Bey's photo in src/photos. */
  id: string;
  /** Product code printed on the box, e.g. "BX-01". */
  code: string;
  /** Takara Tomy name. */
  name: string;
  /** Name on Hasbro boxes, when it differs. */
  hasbroName?: string;
  set: SetKind;
  type: BeyType;
  spin: 'right' | 'left';
  blade: Part<PartStats>;
  /** Name is the ratchet code, e.g. "3-60". */
  ratchet: Part<PartStats>;
  bit: Bit;
  /** True when the photo is shot from straight above, so it can spin. */
  photoSpins?: boolean;
  art: BeyArt;
}

export type PartKey = 'blade' | 'ratchet' | 'bit';
