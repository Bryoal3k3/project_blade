export const BEY_TYPES = ['attack', 'defense', 'stamina', 'balance'] as const;
export type BeyType = (typeof BEY_TYPES)[number];

export const SET_KINDS = ['Starter', 'Booster', 'Random Booster', 'Deck Set'] as const;
export type SetKind = (typeof SET_KINDS)[number];

export const LINES = ['BX', 'UX', 'CX'] as const;
export type Line = (typeof LINES)[number];

export const BRANDS = ['Hasbro', 'Takara Tomy'] as const;
export type Brand = (typeof BRANDS)[number];

export const ART_SHAPES = ['blade', 'round', 'wall', 'wing'] as const;
export type ArtShape = (typeof ART_SHAPES)[number];

/** Stats for one part, exactly as printed on the box. */
export interface PartStats {
  attack: number;
  defense: number;
  stamina: number;
}

/** Bits also carry Dash and Burst. */
export interface BitStats extends PartStats {
  dash: number;
  burstResistance: number;
}

export type StatKey = keyof BitStats;

export interface PartData<S extends PartStats> {
  /** Grams. Leave out until known. */
  weight?: number;
  /** Leave out until the numbers are copied from a box. */
  stats?: S;
}

export interface Ratchet extends PartData<PartStats> {
  /** The ratchet code, e.g. "4-70": 4 points, 7.0 mm tall. */
  name: string;
}

export interface Bit extends PartData<BitStats> {
  /** Letters at the end of the combo, e.g. "F" or "LF". */
  code: string;
  name: string;
}

/** Settings for the drawn stand-in picture shown until a real photo is added. */
export interface BeyArt {
  shape: ArtShape;
  blades: number;
  accent: string;
}

export interface Bey {
  /** URL-safe id. Also the file name of the Bey's photos in src/photos. */
  id: string;
  /** Names as printed on each brand's boxes. The Hasbro name is shown first. */
  names: { hasbro?: string; takaraTomy?: string };
  line: Line;
  /** Takara Tomy product number, e.g. "BX-01". Hasbro boxes don't print one. */
  code?: string;
  set: SetKind;
  type: BeyType;
  spin: 'right' | 'left';
  /** Whose box the stats were copied from. Needed once any part has stats. */
  statsFrom?: Brand;
  blade: PartData<PartStats>;
  ratchet: Ratchet;
  bit: Bit;
  /** True when the main photo is taken from straight above, so it can spin. */
  photoSpins?: boolean;
  art: BeyArt;
}

export type PartKey = 'blade' | 'ratchet' | 'bit';
