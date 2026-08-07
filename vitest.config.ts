import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts so the GitHub Pages base path never
// leaks into the test environment.
export default defineConfig({
  test: {
    environment: 'jsdom',
    // vitest does not pick setup files up implicitly the way Jest does. Without
    // this line fake-indexeddb never loads and every Dexie test fails.
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
