import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { SW_ENTRY, SW_FILE, serviceWorkerPlugin } from './scripts/vite-service-worker';

// The base path must match the GitHub repository name, otherwise every asset
// URL 404s once deployed to GitHub Pages. Only a user.github.io root repo may
// use '/'.
export default defineConfig({
  base: '/francais-catalan/',
  plugins: [svelte(), serviceWorkerPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // The service worker is its own entry, written unhashed at the root of
      // the base path: its URL must stay the same from one deploy to the next.
      input: { main: 'index.html', sw: SW_ENTRY },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? SW_FILE : 'assets/[name]-[hash].js',
      },
    },
  },
});
