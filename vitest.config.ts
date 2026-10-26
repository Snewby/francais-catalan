import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts so the GitHub Pages base path never
// leaks into the test environment.
export default defineConfig({
  // svelteTesting resolves Svelte's browser build under jsdom and unmounts
  // components after each test.
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: [
      // The browser condition svelteTesting adds would otherwise hand
      // gen-schema Prettier's standalone build, which has no resolveConfig, and
      // the byte-for-byte regeneration tests would fail.
      {
        find: /^prettier$/,
        replacement: fileURLToPath(
          new URL('./node_modules/prettier/index.mjs', import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    // vitest does not pick setup files up implicitly the way Jest does. Without
    // this line fake-indexeddb never loads and every Dexie test fails.
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
