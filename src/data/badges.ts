import { BEYS, displayName, packOnly } from '.';
import type { Bey } from './types';
import type { IconName } from '../components/Icon';

export interface Badge {
  id: string;
  label: string;
  /** What to do to earn it, in kid words. */
  how: string;
  icon: IconName;
  earned: boolean;
}

export interface Progress {
  /** Beys starred in My Beys. */
  mine: Bey[];
  /** Saved Build a Bey creations. */
  builds: number;
  /** Battle matches played to the end in the app. */
  matches: number;
}

const FAMILIES = ['Dran', 'Phoenix', 'Knight', 'Wizard', 'Shark'];

function countFamily(beys: Bey[], family: string): number {
  return beys.filter((bey) => displayName(bey).split(/[\s-]+/).includes(family)).length;
}

/** Every badge, earned or not, in the order they are shown. */
export function badges({ mine, builds, matches }: Progress): Badge[] {
  const count = mine.length;
  const types = new Set(mine.map((bey) => bey.type));
  const lines = new Set(mine.map((bey) => bey.line));
  const list: Badge[] = [
    { id: 'first', label: 'First Bey', how: 'Star a Bey you have', icon: 'star', earned: count >= 1 },
    { id: 'five', label: 'Five Beys', how: 'Have 5 Beys', icon: 'star', earned: count >= 5 },
    { id: 'ten', label: 'Ten Beys', how: 'Have 10 Beys', icon: 'star', earned: count >= 10 },
    { id: 'twenty-five', label: 'Super Collector', how: 'Have 25 Beys', icon: 'star', earned: count >= 25 },
    { id: 'types', label: 'Type Master', how: 'Have one of every type', icon: 'yin', earned: types.size === 4 },
    { id: 'lines', label: 'BX UX CX', how: 'Have a Bey from every line', icon: 'grid', earned: lines.size === 3 },
    { id: 'left', label: 'Left Spinner', how: 'Have a left-spin Bey', icon: 'spin', earned: mine.some((bey) => bey.spin === 'left') },
    { id: 'custom', label: 'Customizer', how: 'Have a CX Bey', icon: 'build', earned: mine.some((bey) => bey.line === 'CX') },
    { id: 'pack', label: 'Pack Opener', how: 'Have a Bey from a pack or set', icon: 'box', earned: mine.some(packOnly) },
    ...FAMILIES.map((family) => ({
      id: `family-${family.toLowerCase()}`,
      label: `${family} Squad`,
      how: `Have 3 ${family} Beys`,
      icon: 'bolt' as IconName,
      earned: countFamily(mine, family) >= 3,
    })),
    { id: 'builder', label: 'Builder', how: 'Save a Bey you built', icon: 'build', earned: builds >= 1 },
    { id: 'battler', label: 'Battler', how: 'Finish a battle match', icon: 'battle', earned: matches >= 1 },
    { id: 'champion', label: 'Champion', how: 'Finish 10 battle matches', icon: 'battle', earned: matches >= 10 },
  ];
  return list;
}

/** How many of all the Beys are starred. */
export function collectionCount(mine: Bey[]): { have: number; total: number } {
  return { have: mine.length, total: BEYS.length };
}
