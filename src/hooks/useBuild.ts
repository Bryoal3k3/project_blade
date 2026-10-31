import { useCallback, useEffect, useState } from 'react';
import type { PartKey } from '../data/types';

export type Picks = Partial<Record<PartKey, string>>;

interface BuildState {
  picks: Picks;
  /** True once the picked parts have been fused, so the result shows when coming back. */
  fused: boolean;
}

const STORAGE_KEY = 'project-blade:build:v1';

function load(): BuildState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object' && saved.picks && typeof saved.picks === 'object') {
      const picks: Picks = {};
      for (const part of ['blade', 'ratchet', 'bit'] as const) {
        if (typeof saved.picks[part] === 'string') picks[part] = saved.picks[part];
      }
      return { picks, fused: saved.fused === true };
    }
  } catch {
    // Storage blocked or corrupted: start a fresh build.
  }
  return { picks: {}, fused: false };
}

/** The Bey being built, saved on this device so it is still there next time. */
export function useBuild() {
  const [state, setState] = useState<BuildState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage blocked: the build lasts until the app closes.
    }
  }, [state]);

  const pick = useCallback((part: PartKey, key: string) => {
    setState((prev) => ({ picks: { ...prev.picks, [part]: key }, fused: false }));
  }, []);
  const setFused = useCallback((fused: boolean) => setState((prev) => ({ ...prev, fused })), []);
  const reset = useCallback(() => setState({ picks: {}, fused: false }), []);

  return { ...state, pick, setFused, reset };
}
