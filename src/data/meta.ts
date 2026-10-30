import type { BeyType, PartKey, SetKind, StatKey } from './types';
import type { IconName } from '../components/Icon';

/** Highest value a stat can have. Bars are drawn as tenths of this. */
export const STAT_MAX = 100;

export const TYPE_INFO: Record<BeyType, { label: string; color: string; ink: string; icon: IconName }> = {
  attack: { label: 'Attack', color: '#F0412F', ink: '#FFFFFF', icon: 'bolt' },
  defense: { label: 'Defense', color: '#2D7BF5', ink: '#FFFFFF', icon: 'shield' },
  stamina: { label: 'Stamina', color: '#14B26B', ink: '#04281A', icon: 'battery' },
  balance: { label: 'Balance', color: '#F2A812', ink: '#2B1C00', icon: 'yin' },
};

export const STAT_INFO: Record<StatKey, { label: string; color: string; icon: IconName }> = {
  attack: { label: 'Attack', color: '#F0412F', icon: 'bolt' },
  defense: { label: 'Defense', color: '#2D7BF5', icon: 'shield' },
  stamina: { label: 'Stamina', color: '#14B26B', icon: 'battery' },
  dash: { label: 'Dash', color: '#F23D9C', icon: 'dash' },
  burstResistance: { label: 'Burst resistance', color: '#8F55F5', icon: 'lock' },
};

export const PART_STAT_KEYS: StatKey[] = ['attack', 'defense', 'stamina'];
export const BIT_STAT_KEYS: StatKey[] = ['attack', 'defense', 'stamina', 'dash', 'burstResistance'];

export const PART_INFO: Record<PartKey, { label: string; what: string }> = {
  blade: { label: 'Blade', what: 'The top part. It does the hitting.' },
  ratchet: { label: 'Ratchet', what: 'The middle part. It locks the Bey together and sets how tall it is.' },
  bit: { label: 'Bit', what: 'The tip it spins on. It decides how the Bey moves.' },
};

export const SET_INFO: Record<SetKind, string> = {
  Starter: 'Bey + launcher',
  Booster: 'Bey only',
  'Random Booster': 'Surprise Bey',
  'Deck Set': 'Beys + parts',
};

/** Kid-sized description of each bit, keyed by its code. */
export const BIT_INFO: Record<string, string> = {
  F: 'A flat tip that grips the floor. Fast and wild.',
  T: 'A pointy tip with a flat edge. Some zoom, some staying put.',
  B: 'A round tip. Spins for a long time.',
  N: 'A sharp point. Holds its spot in the middle.',
  HN: 'A sharp point that sits taller. Holds its spot.',
  S: 'A spiky tip. Hard to push around.',
  GF: 'A flat tip with extra grip. Fast.',
  C: 'A grippy tip that races around the stadium.',
  A: 'Built for speed. Very fast and very wild.',
  H: 'A six-sided tip. Moves around, then settles down.',
  DB: 'A ball tip with a wide disk. Spins long and stays steady.',
};
