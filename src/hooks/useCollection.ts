import { useCallback, useEffect, useState } from 'react';

export type CollectionKind = 'mine' | 'wish';
type Lists = Record<CollectionKind, string[]>;

const STORAGE_KEY = 'project-blade:collection:v1';

function load(): Lists {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object') {
      return {
        mine: Array.isArray(parsed.mine) ? parsed.mine.filter((id: unknown) => typeof id === 'string') : [],
        wish: Array.isArray(parsed.wish) ? parsed.wish.filter((id: unknown) => typeof id === 'string') : [],
      };
    }
  } catch {
    // Storage blocked or corrupted: start empty.
  }
  return { mine: [], wish: [] };
}

export interface Collection {
  lists: Lists;
  has: (kind: CollectionKind, id: string) => boolean;
  toggle: (kind: CollectionKind, id: string) => void;
}

/** My Beys and the wish list, saved on this device. Getting a Bey takes it off the wish list. */
export function useCollection(): Collection {
  const [lists, setLists] = useState<Lists>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      // Storage blocked: the lists still work until the app closes.
    }
  }, [lists]);

  const has = useCallback((kind: CollectionKind, id: string) => lists[kind].includes(id), [lists]);

  const toggle = useCallback((kind: CollectionKind, id: string) => {
    setLists((prev) => {
      if (prev[kind].includes(id)) return { ...prev, [kind]: prev[kind].filter((x) => x !== id) };
      const next = { ...prev, [kind]: [...prev[kind], id] };
      if (kind === 'mine') next.wish = prev.wish.filter((x) => x !== id);
      return next;
    });
  }, []);

  return { lists, has, toggle };
}
