/**
 * Placeholder app icons, « Ca » on the accent colour (decided 26 Oct, phase 1
 * question E: script-generated, replaced later by a designed icon).
 *
 *   npm run gen-icons
 *
 * Drawn by the Playwright Chromium the smoke tests already install, so this
 * adds no dependency. The maskable icon fills its square and keeps the letters
 * inside the central safe zone, because a launcher may crop it to a circle.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ACCENT = '#1d4ed8';
const OUT = path.resolve(import.meta.dirname, '../public/icons');

const ICONS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
] as const;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const { file, size, maskable } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const radius = maskable ? 0 : Math.round(size * 0.2);
    const letters = Math.round(size * (maskable ? 0.32 : 0.44));
    await page.setContent(
      `<body style="margin:0;background:transparent">` +
        `<div style="width:${String(size)}px;height:${String(size)}px;display:grid;` +
        `place-items:center;background:${ACCENT};border-radius:${String(radius)}px;` +
        `color:#fff;font:700 ${String(letters)}px/1 system-ui,sans-serif">Ca</div></body>`,
    );
    await page.screenshot({ path: path.join(OUT, file), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
