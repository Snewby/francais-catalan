import { defineConfig } from 'vite';

// The base path must match the GitHub repository name, otherwise every asset
// URL 404s once deployed to GitHub Pages. Only a user.github.io root repo may
// use '/'.
export default defineConfig({
  base: '/francais-catalan/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
