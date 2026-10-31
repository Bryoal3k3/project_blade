export const BEY_TYPES = ['attack', 'defense', 'stamina', 'balance'] as const;
export type BeyType = (typeof BEY_TYPES)[number];

export const SET_KINDS = ['Starter', 'Booster', 'Random Booster', 'Deck Set', 'Dual Pack', 'Multipack'] as const;
export type SetKind = (typeof SET_KINDS)[number];

export const LINES = ['BX', 'UX', 'CX'] as const;
export type Line = (typeof LINES)[number];

export const STATS_SOURCES = ['Hasbro box', 'Beyblade wiki'] as const;
export type StatsSource = (typeof STATS_SOURCES)[number];

export const ART_SHAPES = ['blade', 'round', 'wall', 'wing'] as const;
export type ArtShape = (typeof ART_SHAPES)[number];

/** Stats for one part, exactly as printed on the box. Some ratchets use halves, like 8.5. */
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
  /** Leave out until the numbers are known. */
  stats?: S;
  /** Name of a shared part picture in src/photos/parts, e.g. "ratchet-4-70". */
  photo?: string;
}

/** A named piece of a Custom Line blade, e.g. Lock Chip "Dran". */
export interface BladePiece {
  label: string;
  name: string;
}

export interface Blade extends PartData<PartStats> {
  /** Custom Line blades are built from pieces; their stats add up to the blade's. */
  pieces?: BladePiece[];
  /** The blade has its ratchet built in, so there is no separate ratchet. */
  integratedRatchet?: boolean;
}

export interface Ratchet extends PartData<PartStats> {
  /** The ratchet code, e.g. "4-70": 4 points, 7.0 mm tall. Special ratchets use a letter, like "M-85". */
  name: string;
}

export interface Bit extends PartData<BitStats> {
  /** Letters at the end of the combo, e.g. "F", "LF" or "Nr". */
  code: string;
  name: string;
  /** The bit's own type, used to describe bits without a hand-written description. */
  type?: BeyType;
}

/** Settings for the drawn stand-in picture shown until a real photo is added. */
export interface BeyArt {
  shape: ArtShape;
  blades: number;
  accent: string;
}

export interface Bey {
  /** URL-safe id, e.g. "rudder-phoenix-4-70lf". Also the file name of its photo in src/photos. */
  id: string;
  /** Names as printed on each brand's boxes. The Hasbro name is shown first. */
  names: { hasbro?: string; takaraTomy?: string };
  line: Line;
  /** Hasbro product code, e.g. "G2739". */
  productCode?: string;
  set: SetKind;
  type: BeyType;
  spin: 'right' | 'left';
  /** Dual Packs and Multipack Sets this Bey comes in. */
  packs?: string[];
  /** First release in Canada (or the US), as "2026-02-12" or "2026-02". */
  released?: string;
  /** Total weight in grams. */
  weight?: number;
  /** Where the stats came from. Needed once any part has stats. */
  statsFrom?: StatsSource;
  blade: Blade;
  /** Missing when the ratchet is built into the blade. */
  ratchet?: Ratchet;
  bit: Bit;
  /** True when the main photo is taken from straight above, so it can spin. */
  photoSpins?: boolean;
  art: BeyArt;
}

export type PartKey = 'blade' | 'ratchet' | 'bit';
