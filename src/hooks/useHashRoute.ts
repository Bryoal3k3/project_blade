import { useEffect, useState } from 'react';

export type ListName = 'all' | 'mine' | 'wish';
export type Route = { name: ListName } | { name: 'bey'; id: string };

/** Routes live in the URL hash (#/, #/mine, #/wish, #/bey/dran-sword) so the app works from any host or folder. */
export function parseHash(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, '').split('/');
  if (first === 'bey' && second) return { name: 'bey', id: decodeURIComponent(second) };
  if (first === 'mine' || first === 'wish') return { name: first };
  return { name: 'all' };
}

interface RouteState {
  route: Route;
  /** The list the kid was last looking at, so Back returns there. */
  lastList: ListName;
}

function stateFor(hash: string, lastList: ListName): RouteState {
  const route = parseHash(hash);
  return { route, lastList: route.name === 'bey' ? lastList : route.name };
}

export function useHashRoute(): RouteState {
  const [state, setState] = useState(() => stateFor(window.location.hash, 'all'));

  useEffect(() => {
    const onChange = () => setState((prev) => stateFor(window.location.hash, prev.lastList));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}
