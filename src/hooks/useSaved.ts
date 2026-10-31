import { useCallback, useEffect, useState } from 'react';
import type { PartKey } from '../data/types';

export type BuildPicks = Partial<Record<PartKey, string>>;

export interface SavedBuild {
  id: string;
  name: string;
  picks: BuildPicks;
}

interface SavedState {
  builds: SavedBuild[];
  /** Battle matches played to the end in the app. */
  matches: number;
}

const STORAGE_KEY = 'project-blade:saved:v1';

function load(): SavedState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      const builds = Array.isArray(saved.builds)
        ? saved.builds.filter((b: SavedBuild) => b && typeof b.id === 'string' && typeof b.name === 'string' && b.picks && typeof b.picks.blade === 'string')
        : [];
      return { builds, matches: Number.isInteger(saved.matches) ? saved.matches : 0 };
    }
  } catch {
    // Storage blocked or corrupted: start empty.
  }
  return { builds: [], matches: 0 };
}

export const samePicks = (a: BuildPicks, b: BuildPicks) => a.blade === b.blade && a.ratchet === b.ratchet && a.bit === b.bit;

export interface Saved {
  builds: SavedBuild[];
  matches: number;
  saveBuild: (name: string, picks: BuildPicks) => void;
  removeBuild: (id: string) => void;
  finishMatch: () => void;
}

/** Saved Build a Bey creations and the number of battle matches played, kept on this device. */
export function useSaved(): Saved {
  const [state, setState] = useState<SavedState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage blocked: the shelf lasts until the app closes.
    }
  }, [state]);

  const saveBuild = useCallback((name: string, picks: BuildPicks) => {
    setState((prev) => {
      const rest = prev.builds.filter((b) => !samePicks(b.picks, picks));
      return { ...prev, builds: [{ id: `build-${Date.now().toString(36)}`, name: name.trim() || 'My Bey', picks }, ...rest] };
    });
  }, []);
  const removeBuild = useCallback((id: string) => setState((prev) => ({ ...prev, builds: prev.builds.filter((b) => b.id !== id) })), []);
  const finishMatch = useCallback(() => setState((prev) => ({ ...prev, matches: prev.matches + 1 })), []);

  return { ...state, saveBuild, removeBuild, finishMatch };
}
