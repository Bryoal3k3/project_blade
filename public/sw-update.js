// Runs inside the service worker (the generated sw.js imports it). When a new version of the app
// takes over, pages of the current version reload themselves at a quiet moment (see src/pwa.ts).
// Pages from older versions don't know how, so this reloads them onto the Beys list instead:
// every page gets a ping, and the ones that don't answer are the old ones.
const PING_MS = 800;
const answered = new Set();

// Take over as soon as this version is installed, even while a page from the old version is open.
// Otherwise a new version waits until every page is closed, which on a phone can be never.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'blade:pong' && event.source) answered.add(event.source.id);
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (!pages.length) return;
      for (const page of pages) page.postMessage({ type: 'blade:ping' });
      await new Promise((resolve) => setTimeout(resolve, PING_MS));
      for (const page of pages) {
        if (answered.has(page.id) || typeof page.navigate !== 'function') continue;
        // Without the #route it is a full navigation, not a jump within the page, so the new version loads.
        // Not awaited: the reloading page's requests wait for this activation to finish first.
        page.navigate(page.url.split('#')[0]).catch(() => undefined);
      }
    })(),
  );
});
