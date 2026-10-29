/**
 * Installable on Android (spec, phase 1 acceptance, added 26 Oct), against the
 * production build: a valid manifest Chrome can install from, and a service
 * worker that loads the shell with the network off while never caching an API
 * call.
 */
import { expect, test, type Page } from '@playwright/test';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function controlled(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test('the manifest names the app, its scope and its icons', async ({
  page,
  request,
}) => {
  await page.goto('#/');
  const href = await page
    .locator('link[rel="manifest"]')
    .evaluate((link) => (link as HTMLLinkElement).href);
  const response = await request.get(href);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    lang: string;
    display: string;
    start_url: string;
    scope: string;
    icons: ManifestIcon[];
  };

  expect(manifest.name).toBe('Català');
  expect(manifest.lang).toBe('fr');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/francais-catalan/');
  expect(manifest.scope).toBe('/francais-catalan/');

  const sizes = manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose ?? 'any'}`);
  expect(sizes).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
  for (const icon of manifest.icons) {
    const file = await request.get(new URL(icon.src, href).href);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()['content-type']).toContain('image/png');
    const [width] = icon.sizes.split('x').map(Number);
    expect(pngSize(await file.body())).toEqual({ width, height: width });
  }
});

test('the shell loads with the network off, and only the shell is cached', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => localStorage.setItem('anthropic-api-key', 'e2e-key'));
  await page.goto('#/');
  await controlled(page);

  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls: string[] = [];
    for (const name of names) {
      for (const key of await (await caches.open(name)).keys()) urls.push(key.url);
    }
    return { names, urls };
  });
  expect(cached.names).toHaveLength(1);
  expect(cached.names[0]).toMatch(/^catala-shell-/);
  expect(cached.urls.length).toBeGreaterThan(3);
  for (const url of cached.urls)
    expect(new URL(url).origin).toBe(new URL(page.url()).origin);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Entraîneur de grammaire catalane',
  );
  await page.goto('#/carnet');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Carnet');

  // Translating offline shows the existing state rather than a cached reply.
  await page.goto('#/');
  await page.getByLabel('Une phrase en français').fill('Je ne le fais plus.');
  await page.getByRole('button', { name: 'Traduire en catalan' }).click();
  await expect(page.getByText('Pas de connexion.')).toBeVisible();
  await context.setOffline(false);
});
