import { defineConfig, devices } from '@playwright/test';

// One smoke per phase at phone width, for what jsdom cannot see: layout,
// overflow and real tap-target sizes. Run against the production build served
// under the GitHub Pages base path, so a wrong `base` fails here before deploy.
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}/francais-catalan/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}/francais-catalan/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
