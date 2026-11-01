import { useEffect, useState } from 'react';

export type ListName = 'all' | 'mine' | 'wish';
export type Route = { name: ListName } | { name: 'build' } | { name: 'battle' } | { name: 'bey'; id: string };
/** Screens a Bey page's Back button can return to. */
export type BackName = ListName | 'build' | 'battle';

/** Routes live in the URL hash (#/, #/mine, #/wish, #/build, #/bey/dran-sword) so the app works from any host or folder. */
export function parseHash(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, '').split('/');
  if (first === 'bey' && second) return { name: 'bey', id: decodeURIComponent(second) };
  if (first === 'mine' || first === 'wish' || first === 'build' || first === 'battle') return { name: first };
  return { name: 'all' };
}

export function hashFor(name: BackName): string {
  return name === 'all' ? '#/' : `#/${name}`;
}

interface RouteState {
  route: Route;
  /** The screen the kid was on before opening a Bey, so Back returns there. */
  backTo: BackName;
}

function stateFor(hash: string, backTo: BackName): RouteState {
  const route = parseHash(hash);
  return { route, backTo: route.name === 'bey' ? backTo : route.name };
}

export function useHashRoute(): RouteState {
  const [state, setState] = useState(() => stateFor(window.location.hash, 'all'));

  useEffect(() => {
    const onChange = () => setState((prev) => stateFor(window.location.hash, prev.backTo));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}

/** The list screens (Beys, My Beys, Wish list): leaving one loses nothing, so an app update can reload there. */
export function isListRoute(hash: string): boolean {
  return /^#?\/?(mine|wish)?\/?$/.test(hash);
}
