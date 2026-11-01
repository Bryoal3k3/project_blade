// Keeps an installed copy of the app up to date. A home-screen app can stay open for days, so
// besides the browser's own check on launch, this looks for a new version whenever the app comes
// back to the front and once an hour. When one has downloaded and taken over, the page reloads to
// show it, right away on a list screen, otherwise at the next quiet moment.

import { registerSW } from 'virtual:pwa-register';
import { isListRoute } from './hooks/useHashRoute';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/** A reload loses nothing when the app is hidden or on a list screen. */
function quiet(): boolean {
  return document.hidden || isListRoute(location.hash);
}

export function setupUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  // A new worker pings every open page; answering tells it this page will reload itself (below).
  // Pages from older versions can't answer, and the worker (public/sw-update.js) reloads them.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'blade:ping') (event.source ?? navigator.serviceWorker.controller)?.postMessage({ type: 'blade:pong' });
  });
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine !== false) registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
      window.setInterval(check, CHECK_EVERY_MS);
    },
    onNeedReload() {
      if (quiet()) {
        location.reload();
        return;
      }
      const later = () => {
        if (!quiet()) return;
        window.removeEventListener('hashchange', later);
        document.removeEventListener('visibilitychange', later);
        location.reload();
      };
      window.addEventListener('hashchange', later);
      document.addEventListener('visibilitychange', later);
    },
  });
}
