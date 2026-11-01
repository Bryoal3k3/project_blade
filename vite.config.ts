/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The config runs in Node, but the project has no Node type definitions; this is all it needs.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  // Relative paths, so the built app works from any host or sub-folder.
  base: './',
  define: {
    // Shown at the bottom of the Beys page, so a phone's copy can be told apart from the latest.
    __BUILD_DATE__: JSON.stringify(process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // src/pwa.ts registers the worker itself, so it can check for updates and reload at a quiet moment.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Project Blade',
        short_name: 'Blade',
        description: 'Browse Beyblade X tops, their parts and their stats.',
        theme_color: '#0A0F1F',
        background_color: '#0A0F1F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // A new version takes over right away, even with the old one open, instead of waiting for every page to close.
        skipWaiting: true,
        clientsClaim: true,
        // Reloads pages from older versions when a new worker takes over; see public/sw-update.js.
        importScripts: ['sw-update.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}'],
        globIgnores: ['**/node_modules/**/*', 'sw-update.js'],
        // Bey photos can be large; keep them available offline too.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
