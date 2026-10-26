import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Shared by Vite, Vitest, svelte-check and eslint-plugin-svelte, so TypeScript
// in <script lang="ts"> is handled the same way everywhere.
export default {
  preprocess: vitePreprocess(),
};
